//@flow

import m from "mithril"
import {colorForBg} from "../date/CalendarUtils"
import {px, size} from "../../gui/size"
import {Icon} from "../../gui/base/Icon"
import {Icons} from "../../gui/base/icons/Icons"

export type CalendarEventBubbleAttrs = {
	text: string,
	secondLineText?: string,
	color: string,
	hasAlarm: boolean,
	click: clickHandler,
	height?: number,
	noBorderRight?: boolean,
	noBorderLeft?: boolean,
	verticalPadding?: number
}


const defaultBubbleHeight = size.calendar_line_height

export class CalendarEventBubble implements MComponent<CalendarEventBubbleAttrs> {

	view({attrs}: Vnode<CalendarEventBubbleAttrs>): Children {
		const lineHeightPx = px(defaultBubbleHeight)

		let content
		const doesFit2Lines = attrs.height && attrs.height >= defaultBubbleHeight * 2
		if (doesFit2Lines) {
			content = [
				m("", [
					m("", {
						style: {
							lineHeight: lineHeightPx,
						}
					}, [attrs.text]),
					attrs.secondLineText
						? m("", {
							style: {
								lineHeight: lineHeightPx,
							}
						}, [attrs.secondLineText])
						: null
				])
			]
		} else {
			content = [
				m("", {
					style: {
						lineHeight: lineHeightPx,
					}
				}, [attrs.text, attrs.secondLineText || ""])
			]
		}

		return m(".calendar-event.small.overflow-hidden.flex.fade-in"
			+ (attrs.noBorderLeft ? ".event-continues-left" : "")
			+ (attrs.noBorderRight ? ".event-continues-right" : "")
			, {
				style: {
					background: "#" + attrs.color,
					color: colorForBg("#" + attrs.color),
					minHeight: lineHeightPx,
					height: px(attrs.height ? Math.max(attrs.height, 0) : defaultBubbleHeight),
					"padding-top": px(attrs.verticalPadding || 0),
				},
				onclick: (e) => {
					e.stopPropagation()
					attrs.click(e, e.target)
				}
			}, [
				attrs.hasAlarm
					? m(Icon, {
						icon: Icons.Notifications,
						style: {fill: colorForBg("#" + attrs.color), "padding-top": "2px", "padding-right": "2px"},
						class: "icon-small",
					})
					: null,
				m(".flex.col", content)
			])
	}

}
