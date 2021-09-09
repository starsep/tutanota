// @flow

import m from "mithril"
import {theme} from "../../gui/theme"
import {px, size} from "../../gui/size"
import {DAY_IN_MILLIS, getEndOfDay, getStartOfDay} from "../../api/common/utils/DateUtils"
import {numberRange} from "../../api/common/utils/ArrayUtils"
import {
	EVENT_BEING_DRAGGED_OPACITY,
	eventEndsAfterDay,
	eventStartsBefore,
	expandEvent,
	formatEventTime,
	getEventColor,
	getTimeTextFormatForLongEventOnDay,
	getTimeZone,
	hasAlarmsForTheUser,
	layOutEvents
} from "../date/CalendarUtils"
import {CalendarEventBubble} from "./CalendarEventBubble"
import {mapNullable, neverNull} from "../../api/common/utils/Utils"
import type {CalendarEvent} from "../../api/entities/tutanota/CalendarEvent"
import {logins} from "../../api/main/LoginController"
import {isAllDayEvent} from "../../api/common/utils/CommonCalendarUtils"
import {Time} from "../../api/common/utils/Time"
import {getCoordinatesFromMouseEvent} from "../../gui/base/GuiUtils"
import {haveSameId} from "../../api/common/utils/EntityUtils"

export type Attrs = {
	onEventClicked: (event: CalendarEvent, domEvent: Event) => mixed,
	groupColors: {[Id]: string},
	events: Array<CalendarEvent>,
	displayTimeIndicator: boolean,
	onTimePressed: (hours: number, minutes: number) => mixed,
	onTimeContextPressed: (hours: number, minutes: number) => mixed,
	onEventMoved: (IdTuple, Date) => *,
	day: Date,
	setCurrentDraggedEvent: (ev: CalendarEvent) => *,
	setTimeUnderMouse: (time: Time) => *,
	eventBeingDragged: ?CalendarEvent
}

export const calendarDayTimes: Array<Time> = numberRange(0, 23).map(number => new Time(number, 0))
const allHoursHeight = size.calendar_hour_height * calendarDayTimes.length

export class CalendarDayEventsView implements MComponent<Attrs> {
	_dayDom: ?HTMLElement;

	view({attrs}: Vnode<Attrs>): Children {
		return m(".col.rel",
			{
				oncreate: (vnode) => {
					this._dayDom = vnode.dom
					m.redraw()
				},
				onmousemove: (mouseEvent: MouseEvent) => {
					const time = this._getTimeUnderMouseEvent(mouseEvent)
					attrs.setTimeUnderMouse(time)
				}
			},
			[
				calendarDayTimes.map(time => m(".calendar-hour.flex", {
						onclick: (e) => {
							e.stopPropagation()
							attrs.onTimePressed(time.hours, time.minutes)
						},
						oncontextmenu: (e) => {
							attrs.onTimeContextPressed(time.hours, time.minutes)
							e.preventDefault()
						},
					},
				)),
				this._dayDom ? this._renderEvents(attrs, attrs.events) : null,
				this._renderTimeIndicator(attrs),
			])
	}

	_getTimeUnderMouseEvent(mouseEvent: MouseEvent): Time {
		const {y, targetHeight} = getCoordinatesFromMouseEvent(mouseEvent)
		const sectionHeight = targetHeight / 24
		const hour = y / sectionHeight
		const hourRounded = Math.floor(hour)
		// increment in 15 minute intervals
		const minute = Math.floor((hour - hourRounded) * 4) * 15
		return new Time(hour, minute)
	}

	_renderTimeIndicator(attrs: Attrs): Children {
		const now = new Date()
		if (!attrs.displayTimeIndicator) {
			return null
		}
		const top = getTimeIndicatorPosition(now)

		return [
			m(".abs", {
				"aria-hidden": "true",
				style: {
					top: px(top),
					left: 0,
					right: 0,
					height: "2px",
					background: theme.content_accent
				}
			}),
			m(".abs", {
				"aria-hidden": "true",
				style: {
					top: px(top),
					left: 0,
					height: "12px",
					width: "12px",
					"border-radius": "50%",
					background: theme.content_accent,
					"margin-top": "-5px",
					"margin-left": "-7px",
				}
			})
		]
	}


	_renderEvents(attrs: Attrs, events: Array<CalendarEvent>): Children {
		return layOutEvents(events, getTimeZone(), (columns) => this._renderColumns(attrs, columns), false)
	}

	_renderEvent(attrs: Attrs, ev: CalendarEvent, columnIndex: number, columns: Array<Array<CalendarEvent>>, columnWidth: number): Children {

		const zone = getTimeZone()
		const startOfEvent = eventStartsBefore(attrs.day, zone, ev) ? getStartOfDay(attrs.day) : ev.startTime
		const endOfEvent = eventEndsAfterDay(attrs.day, zone, ev) ? getEndOfDay(attrs.day) : ev.endTime

		const startTime = (startOfEvent.getHours() * 60 + startOfEvent.getMinutes()) * 60 * 1000
		const height = (endOfEvent.getTime() - startOfEvent.getTime()) / (1000 * 60 * 60) * size.calendar_hour_height

		const colSpan = expandEvent(ev, columnIndex, columns)
		const padding = 2
		return m(".abs.darker-hover", {
			style: {
				left: px(columnWidth * columnIndex),
				width: px(columnWidth * colSpan),
				top: px(startTime / DAY_IN_MILLIS * allHoursHeight),
				height: px(height)
			},
			onmousedown: () => attrs.setCurrentDraggedEvent(ev),
		}, m(CalendarEventBubble, {
			text: ev.summary,
			secondLineText: !isAllDayEvent(ev) ? formatEventTime(ev, getTimeTextFormatForLongEventOnDay(ev, attrs.day, zone)) : null,
			color: getEventColor(ev, attrs.groupColors),
			click: (domEvent) => attrs.onEventClicked(ev, domEvent),
			height: height - padding,
			hasAlarm: hasAlarmsForTheUser(logins.getUserController().user, ev),
			verticalPadding: padding,
			fadeIn: !attrs.eventBeingDragged,
			opacity: mapNullable(attrs.eventBeingDragged, event => haveSameId(event, ev))
				? EVENT_BEING_DRAGGED_OPACITY
				: 1,
			enablePointerEvents: !attrs.eventBeingDragged
		}))
	}

	_renderColumns(attrs: Attrs, columns: Array<Array<CalendarEvent>>): ChildArray {
		const columnWidth = neverNull(this._dayDom).clientWidth / columns.length
		return columns.map((column, index) => {
			return column.map(event => {
				return this._renderEvent(attrs, event, index, columns, Math.floor(columnWidth))
			})
		})
	}
}

function getTimeIndicatorPosition(now: Date): number {
	const passedMillisInDay = (now.getHours() * 60 + now.getMinutes()) * 60 * 1000
	return passedMillisInDay / DAY_IN_MILLIS * allHoursHeight
}
