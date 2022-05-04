import m, {Children, Component, Vnode} from "mithril"
import {theme} from "../theme"
import {isSameDay} from "@tutao/tutanota-utils"
import {lang} from "../../misc/LanguageViewModel"

export const enum OfflineIndicatorState {
	Offline = 0,
	Connecting = 1,
	Synchronizing = 2,
	Online = 3,
}

export type OfflineIndicatorAttrs =
	| {state: OfflineIndicatorState.Online}
	| {state: OfflineIndicatorState.Connecting}
	| {state: OfflineIndicatorState.Synchronizing, progress: number}
	| {state: OfflineIndicatorState.Offline, lastUpdate: Date}

function stateToTranslationKey(state: OfflineIndicatorState): string {
	switch (state) {
		case OfflineIndicatorState.Online:
			return "Online"
		case OfflineIndicatorState.Offline:
			return "Offline"
		case OfflineIndicatorState.Synchronizing:
			return "Updating"
		case OfflineIndicatorState.Connecting:
			return "Reconnecting"
	}
}

function formatPercentage(percentage: number): string {
	return Math.round(percentage * 100) + "%"
}

function attrToStatus(a: OfflineIndicatorAttrs) {
	switch (a.state) {
		case OfflineIndicatorState.Online:
			return "All up to date"
		case OfflineIndicatorState.Offline:
			const date = a.lastUpdate
			if (isSameDay(new Date(), date)) {
				return "Updated " + lang.formats.time.format(date)
			}
			return "Updated " + lang.formats.simpleDate.format(date)
		case OfflineIndicatorState.Synchronizing:
			return "Progress: " + formatPercentage(a.progress)
		case OfflineIndicatorState.Connecting:
			return "Waiting for Response..."
	}
}

export class OfflineIndicatorDesktop implements Component<OfflineIndicatorAttrs> {
	view(vnode: Vnode<OfflineIndicatorAttrs>): Children {
		const a = vnode.attrs
		return m(".pt-s.mlr-l.flex.col.small", [
			m("", {color: theme.content_accent,}, stateToTranslationKey(a.state)),
			m("", {color: theme.content_accent,}, attrToStatus(a))
		])
	}
}

export class OfflineIndicatorMobile implements Component<OfflineIndicatorAttrs> {
	view(vnode: Vnode<OfflineIndicatorAttrs>): Children {
		const a = vnode.attrs
		return m(".full-width.small.center", stateToTranslationKey(a.state) + " — " + attrToStatus(a))
	}
}