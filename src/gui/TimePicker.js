// @flow

import m from "mithril"
import stream from "mithril/stream/stream.js"
import {TextFieldN, Type as TextFieldType} from "./base/TextFieldN"
import {theme} from "./theme"
import {client} from "../misc/ClientDetector"
import {Keys} from "../api/common/TutanotaConstants"
import {timeStringFromParts} from "../misc/Formatter"
import { Time} from "../api/common/utils/Time"
import {neverNull} from "../api/common/utils/Utils"
import {parseTime} from "../misc/parsing/TimeParser"

export type Attrs = {
	value: Time,
	onselected: (Time) => mixed,
	amPmFormat: boolean,
	disabled?: boolean
}

export class TimePicker implements MComponent<Attrs> {
	_values: $ReadOnlyArray<Time>
	_focused: boolean;
	_previousSelectedIndex: number;
	_selectedIndex: number;
	_oldValue: Time;
	_value: Stream<?Time>;

	constructor({attrs}: Vnode<Attrs>) {
		this._focused = false
		this._value = stream(null)
		const times = []
		for (let hour = 0; hour < 24; hour++) {
			for (let minute = 0; minute < 60; minute += 30) {
				times.push(new Time(hour, minute))
			}
		}
		this._values = times
	}


	view({attrs}: Vnode<Attrs>): Children {
		this._previousSelectedIndex = this._selectedIndex
		this._selectedIndex = this._values.findIndex(time => time.equals(attrs.value))
		if (!this._focused) {
			this._value(attrs.value)
		}

		if (client.isMobileDevice()) {
			if (!this._oldValue.equals(attrs.value)) {
				this._onSelected(attrs)
			}
			this._oldValue = attrs.value
			this._value(attrs.value)
			return m(TextFieldN, {
				label: "emptyString_msg",
				// input[type=time] wants value in 24h format, no matter what is actually displayed. Otherwise it will be empty.
				value: () => this._value()?.to24HourString() ?? "",
				type: TextFieldType.Time,
				oninput: (value) => {
					const parsedTime = parseTime(value)
					this._value(parsedTime)
					if (parsedTime) {
						attrs.onselected(parsedTime)
					}
				},
				disabled: attrs.disabled
			})
		}

		return [
			m(TextFieldN, {
				label: "emptyString_msg",
				value: () => this._value()?.toString(attrs.amPmFormat) ?? "",
				disabled: attrs.disabled,
				onfocus: (dom, input) => {
					this._focused = true
					input.select()
				},
				onblur: (e) => {
					if (this._focused) {
						this._onSelected(attrs)
					}
					e.redraw = false
				},
				keyHandler: (key) => {
					if (key.keyCode === Keys.RETURN.code) {
						this._onSelected(attrs)
						document.activeElement && document.activeElement.blur()
					}
					return true
				},
			}),
			this._focused
				? m(".fixed.flex.col.mt-s.menu-shadow", {
					oncreate: (vnode) => this._setScrollTop(attrs, vnode),
					onupdate: (vnode) => this._setScrollTop(attrs, vnode),
					style: {
						width: "100px",
						height: "400px",
						"z-index": "3",
						background: theme.content_bg,
						overflow: "auto",

					},
				}, this._values.map((time, idx) => m("pr-s.pl-s.darker-hover", {
					key: idx,
					style: {
						"background-color": this._selectedIndex === idx ? theme.list_bg : theme.list_alternate_bg,
						flex: "1 0 auto",
						"line-height": "44px"
					},
					onmousedown: () => {
						this._focused = false
						attrs.onselected(time)
					},
				}, time.toString(attrs.amPmFormat))))
				: null,
		]

	}

	_onSelected(attrs: Attrs) {
		this._focused = false
		attrs.onselected(neverNull(this._value()))
	}

	_setScrollTop(attrs: Attrs, vnode: VnodeDOM<Attrs>) {
		if (this._selectedIndex !== -1) {
			requestAnimationFrame(() => {
				vnode.dom.scrollTop = 44 * this._selectedIndex
			})
		}
	}
}
