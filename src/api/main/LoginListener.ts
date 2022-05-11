import {SecondFactorHandler} from "../../misc/2fa/SecondFactorHandler.js"
import {defer, DeferredObject} from "@tutao/tutanota-utils"
import {Challenge} from "../entities/sys/TypeRefs.js"

/** Listener for the login events from the worker side. */
export interface ILoginListener {
	/**
	 * Partial login reached: cached entities and user are available.
	 */
	onPartialLoginSuccess(): Promise<void>

	/**
	 * Full login reached: any network requests can be made
	 */
	onFullLoginSuccess(): Promise<void>

	/**
	 * callback for when the session is invalid
	 */
	onLoginFailure(): Promise<void>

	/**
	 *  (network errors might be recoverable, this is not)
	 */
	onLoginNetworkError(): Promise<void>

	/**
	 * Shows a dialog with possibility to use second factor and with a message that the login can be approved from another client.
	 */
	onSecondFactorChallenge(sessionId: IdTuple, challenges: ReadonlyArray<Challenge>, mailAddress: string | null): Promise<void>
}

export class LoginListener implements ILoginListener {

	private loginPromise: DeferredObject<void> = defer()

	constructor(
		private readonly secondFactorHandler: SecondFactorHandler,
	) {
	}

	waitForFullLogin(): Promise<void> {
		return this.loginPromise.promise
	}

	onPartialLoginSuccess(): Promise<void> {
		return Promise.resolve()
	}

	async onFullLoginSuccess(): Promise<void> {
		this.loginPromise.resolve()
	}

	async onLoginFailure(): Promise<void> {
		const {reloginForExpiredSession} = await import("../../misc/ErrorHandlerImpl.js")
		await reloginForExpiredSession()
	}

	onSecondFactorChallenge(sessionId: IdTuple, challenges: ReadonlyArray<Challenge>, mailAddress: string | null): Promise<void> {
		return this.secondFactorHandler.showSecondFactorAuthenticationDialog(sessionId, challenges, mailAddress)
	}

	onLoginNetworkError(): Promise<void> {
		return Promise.resolve(undefined);
	}
}