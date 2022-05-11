import m, {Children, Component, Vnode} from "mithril"
import Stream from "mithril/stream"
import {theme} from "../theme"
import {isSameDay} from "@tutao/tutanota-utils"
import {lang} from "../../misc/LanguageViewModel"
import {logins} from "../../api/main/LoginController"
import {WsConnectionState} from "../../api/main/WorkerClient"

export const enum OfflineIndicatorState {
	Offline = 0,
	Connecting = 1,
	Synchronizing = 2,
	Online = 3,
}

/**
 * the offline indicator is a state machine with transitions
 * that get triggered from multiple different places
 */
export class OfflineIndicatorViewModel {

	private currentAttrs: OfflineIndicatorAttrs = {state: OfflineIndicatorState.Online}

	constructor(
		private readonly cb: () => void
	) {
	}

	setProgressUpdateStream(progressStream: Stream<number>): void {
		progressStream.map(progress => this.onProgressUpdate(progress))
		this.onProgressUpdate(progressStream())
	}

	setWsStateStream(wsStream: Stream<WsConnectionState>): void {
		wsStream.map(state => this.onWsStateChange(state))
		this.onWsStateChange(wsStream())
	}


	private onProgressUpdate(progress: number): void {
		console.log("progress:", progress, this.currentAttrs)
		switch (this.currentAttrs.state) {
			case OfflineIndicatorState.Connecting:
			case OfflineIndicatorState.Online:
			case OfflineIndicatorState.Offline:
				this.currentAttrs = {state: OfflineIndicatorState.Synchronizing, progress}
				this.cb()
				break
			case OfflineIndicatorState.Synchronizing:
				if (progress !== this.currentAttrs.progress) {
					if (progress < 1) {
						this.currentAttrs.progress = progress
					} else {
						this.currentAttrs = {state: OfflineIndicatorState.Online}
					}
					this.cb()
				}
		}
	}

	private onWsStateChange(newState: WsConnectionState): void {
		if (newState === WsConnectionState.connected) {
			console.log("ws connected", this.currentAttrs)
			const oldAttrs = this.currentAttrs
			this.currentAttrs = {state: OfflineIndicatorState.Synchronizing, progress: 0}
			switch (oldAttrs.state) {
				case OfflineIndicatorState.Online:
				case OfflineIndicatorState.Connecting:
				case OfflineIndicatorState.Offline:
					this.cb()
					break
				case OfflineIndicatorState.Synchronizing:
					if (oldAttrs.progress > 0) {
						// we got reset to 0?
						this.cb()
					}
			}
		} else {
			console.log("ws disconnected", this.currentAttrs)
			switch (this.currentAttrs.state) {
				case OfflineIndicatorState.Online:
				case OfflineIndicatorState.Connecting:
				case OfflineIndicatorState.Synchronizing:
					// todo: get actual last update
					this.currentAttrs = {state: OfflineIndicatorState.Offline, lastUpdate: new Date()}
					break
				case OfflineIndicatorState.Offline:
					break
			}
		}

	}

	onLoginStateChange(newState: boolean): void {

	}

	getCurrentAttrs(): OfflineIndicatorAttrs {
		return this.currentAttrs
	}

	getProgress(): number {
		return this.currentAttrs.state === OfflineIndicatorState.Synchronizing
			? this.currentAttrs.progress
			: 1
	}
}

export type OfflineIndicatorAttrs = //{title: string} & (
	| {state: OfflineIndicatorState.Online}
	| {state: OfflineIndicatorState.Connecting}
	| {state: OfflineIndicatorState.Synchronizing, progress: number}
	| {state: OfflineIndicatorState.Offline, lastUpdate: Date}

/**
 * the first line of the offline indicator shows what the current state is
 */
function attrToFirstLine(attr: OfflineIndicatorAttrs): Children {
	const {state} = attr
	switch (state) {
		case OfflineIndicatorState.Online:
			return m("span", "Online")
		case OfflineIndicatorState.Offline:
			const date = isSameDay(new Date(), attr.lastUpdate)
				? lang.formats.time.format(attr.lastUpdate)
				: lang.formats.simpleDate.format(attr.lastUpdate)
			return m("span", `Offline since ${date}`)
		case OfflineIndicatorState.Synchronizing:
			return m("span", "Updating")
		case OfflineIndicatorState.Connecting:
			return m("span", "Reconnecting")
	}
}

/**
 * the second line provides additional information or actions
 */
function attrToSecondLine(a: OfflineIndicatorAttrs): Children {
	switch (a.state) {
		case OfflineIndicatorState.Online:
			return m("span", "All up to date")
		case OfflineIndicatorState.Offline:
			return m("span.underline", lang.get("reconnect_action"))
		case OfflineIndicatorState.Synchronizing:
			return m("span", `Progress: ${formatPercentage(a.progress)}`)
		case OfflineIndicatorState.Connecting:
			return m("span", "Waiting for Response...")
	}
}

function formatPercentage(percentage: number): string {
	return `${Math.round(percentage * 100)}%`
}

export class OfflineIndicatorDesktop implements Component<OfflineIndicatorAttrs> {
	view(vnode: Vnode<OfflineIndicatorAttrs>): Children {
		console.log("redraw desktop")
		const a = vnode.attrs
		return m("button.pt-s.mlr-l.flex.col.small", {
			type: "button",
			href: "#",
			tabindex: "0",
			role: "button",
			onclick: async () => {
				console.log("click")
				if (a.state !== OfflineIndicatorState.Offline) return
				return logins.retryAsyncLogin()
			}
		}, [
			m("", {color: theme.content_accent}, attrToFirstLine(a)),
			m("", {color: theme.content_accent}, attrToSecondLine(a))
		])
	}
}

export class OfflineIndicatorMobile implements Component<OfflineIndicatorAttrs> {
	view(vnode: Vnode<OfflineIndicatorAttrs>): Children {
		console.log("redraw mobile")
		const a = vnode.attrs
		return m(".full-width.small.center", {
			type: "button",
			href: "#",
			tabindex: "0",
			role: "button",
			onclick: async () => {
				console.log("click")
				if (a.state !== OfflineIndicatorState.Offline) return
				return logins.retryAsyncLogin()
			}
		}, [
			attrToFirstLine(a),
			m("span", "—"),
			attrToSecondLine(a)
		])
	}
}