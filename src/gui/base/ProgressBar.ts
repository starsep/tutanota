import m, {Component, Vnode} from "mithril"

export type ProgressBarAttrs = {
	progress: number
}

const PROGRESS_DONE = 1

/**
 * the progress bar that's shown right below the header while entity events are synchronized
 */
export class ProgressBar implements Component<ProgressBarAttrs> {
	private lastProgress: number

	constructor(vnode: Vnode<ProgressBarAttrs>) {
		console.log("ctor")
		this.lastProgress = 0
	}

	view(vnode: Vnode<ProgressBarAttrs>) {
		const a = vnode.attrs
		if (this.lastProgress >= PROGRESS_DONE) {
			return m(".abs.full-width", {key: "loading-indicator"}, null)
		}
		this.lastProgress = a.progress
		return m(".abs.full-width", {key: "loading-indicator"}, m(".accent-bg", {
			onbeforeremove: vn => new Promise(resolve => {
				vn.dom.addEventListener("animationend", resolve)
				setTimeout(resolve, 500)
			}),
			style: {
				transition: "width 500ms",
				width: a.progress * 100 + "%",
				height: "3px",
			},
		}))
	}
}

/*


const progressTracker: ProgressTracker = locator.progressTracker

if (progressTracker.totalWork() !== 0) {
	this.loadingProgress = progressTracker.completedAmount()
}

progressTracker.onProgressUpdate.map(amount => {
	if (this.loadingProgress !== amount) {
		this.loadingProgress = amount
		m.redraw()

		if (this.loadingProgress >= PROGRESS_DONE) {
			// progress is done but we still want to finish the complete animation and then dismiss the progress bar.
			setTimeout(() => {
				this.loadingProgress = PROGRESS_HIDDEN
				m.redraw()
			}, 500)
		}
	}
})*/
