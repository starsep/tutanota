import * as env from "../buildSrc/env.js"
import fs from "fs-extra"
import path from "path"
import {renderHtml} from "../buildSrc/LaunchHtml.js"
import {$} from "zx"
import {build as esbuild} from "esbuild"
import {getTutanotaAppVersion, runStep, writeFile} from "../buildSrc/buildUtils.js"
import {esbuildPluginAliasPath} from "esbuild-plugin-alias-path"
import {keytarNativePlugin, libDeps, preludeEnvPlugin, sqliteNativePlugin} from "../buildSrc/esbuildUtils.js"

export async function runTestBuild({clean}) {
	if (clean) {
		await runStep("Clean", async () => {
			await fs.emptyDir("build")
		})
	}

	await runStep("Packages", async () => {
		await $`npm run build-packages`
	})

	await runStep("Types", async () => {
		await $`npx tsc --incremental true --noEmit true`
	})

	const version = getTutanotaAppVersion()
	const localEnv = env.create({staticUrl: "http://localhost:9000", version, mode: "Test", dist: false})

	await runStep("Assets", async () => {
		const pjPath = path.join("..", "package.json")
		await fs.mkdir(inBuildDir(), {recursive: true})
		await fs.copyFile(pjPath, inBuildDir("package.json"))
		await createUnitTestHtml("api", localEnv)
		await createUnitTestHtml("client", localEnv)
	})

	await runStep("Esbuild", async () => {
		await esbuild({
			entryPoints: ["api/bootstrapTests-api.ts", "client/bootstrapTests-client.ts"],
			outdir: "./build",
			// Bundle to include the whole graph
			bundle: true,
			// Split so that dynamically included node-only tests are not embedded/run in the browser
			splitting: true,
			format: "esm",
			sourcemap: "linked",
			define: {
				// See Env.ts for explanation
				"NO_THREAD_ASSERTIONS": 'true',
			},
			external: [
				"electron",
				// esbuild can't deal with node imports in ESM output at the moment
				// see https://github.com/evanw/esbuild/pull/2067
				"xhr2",
				"better-sqlite3",
				"express",
				"server-destroy",
				"body-parser",
			],
			// even though tests might be running in browser we set it to node so that it ignores all builtins
			platform: "node",
			plugins: [
				preludeEnvPlugin(localEnv),
				libDeps(".."),
				esbuildPluginAliasPath({
					alias: {
						// Take browser testdouble without funny require() magic
						"testdouble": path.resolve("../node_modules/testdouble/dist/testdouble.js"),
					}
				}),
				sqliteNativePlugin({
					environment: "node",
					// We put it back into node_modules because we don't bundle it. If we remove node_modules but keep the cached one we will not run build.
					dstPath: "../node_modules/better-sqlite3/build/Release/better_sqlite3.node",
					platform: process.platform,
					// Since we don't bundle it we need to give a path relative to database.js in node_modules/better_sqlite3
					nativeBindingPath: "../build/Release/better_sqlite3.node",
				}),
				keytarNativePlugin({
					environment: "node",
					dstPath: "./build/keytar.node",
					platform: process.platform,
				}),
			]
		})
	})
}

async function createUnitTestHtml(project, localEnv) {
	const imports = [{src: `test-${project}.js`, type: "module"}]

	const template = `import('./${project}/bootstrapTests-${project}.js')`
	const targetFile = inBuildDir(`test-${project}.html`)
	console.log(`Generating browser tests for ${project} at "${targetFile}"`)
	const bootstrap = `window.whitelabelCustomizations = null
	${template}`
	await writeFile(inBuildDir(`test-${project}.js`), bootstrap)

	const html = await renderHtml(imports, localEnv)
	await writeFile(targetFile, html)
}

function inBuildDir(...files) {
	return path.join("build", ...files)
}