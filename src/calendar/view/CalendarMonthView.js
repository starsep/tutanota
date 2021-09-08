//@flow


import m from "mithril"
import {px, size} from "../../gui/size"
import type {WeekStartEnum} from "../../api/common/TutanotaConstants"
import {EventTextTimeOption, WeekStart} from "../../api/common/TutanotaConstants"
import type {CalendarDay} from "../date/CalendarUtils"
import {
	CALENDAR_EVENT_HEIGHT,
	getAllDayDateForTimezone,
	getCalendarMonth,
	getDateIndicator,
	getDiffInDays,
	getEventColor,
	getEventEnd,
	getStartOfDayWithZone,
	getStartOfNextDayWithZone,
	getStartOfTheWeekOffset,
	getTimeZone,
	getWeekNumber,
	isEventInWeek,
	layOutEvents
} from "../date/CalendarUtils"
import {incrementDate, isSameDay} from "../../api/common/utils/DateUtils"
import {lastThrow} from "../../api/common/utils/ArrayUtils"
import {theme} from "../../gui/theme"
import {ContinuingCalendarEventBubble} from "./ContinuingCalendarEventBubble"
import {styles} from "../../gui/styles"
import {formatMonthWithFullYear} from "../../misc/Formatter"
import {isAllDayEvent, isAllDayEventByTimes} from "../../api/common/utils/CommonCalendarUtils"
import {windowFacade} from "../../misc/WindowFacade"
import {neverNull} from "../../api/common/utils/Utils"
import {Icon} from "../../gui/base/Icon"
import {Icons} from "../../gui/base/icons/Icons"
import {PageView} from "../../gui/base/PageView"
import type {CalendarEvent} from "../../api/entities/tutanota/CalendarEvent"
import {createCalendarEvent} from "../../api/entities/tutanota/CalendarEvent"
import {logins} from "../../api/main/LoginController"
import type {CalendarViewTypeEnum} from "./CalendarView"
import {CalendarViewType, SELECTED_DATE_INDICATOR_THICKNESS} from "./CalendarView"

type CalendarMonthAttrs = {
	selectedDate: Date,
	onDateSelected: (date: Date, calendarViewTypeToShow: CalendarViewTypeEnum) => mixed,
	eventsForDays: Map<number, Array<CalendarEvent>>,
	onNewEvent: (date: ?Date) => mixed,
	onEventClicked: (calendarEvent: CalendarEvent, clickEvent: Event) => mixed,
	onChangeMonth: (next: boolean) => mixed,
	amPmFormat: boolean,
	startOfTheWeek: WeekStartEnum,
	groupColors: {[Id]: string},
	hiddenCalendars: Set<Id>,
	onEventMoved: (eventId: IdTuple, newStartDate: Date) => *
}

type SimplePosRect = {top: number, left: number, right: number}

const dayHeight = () => styles.isDesktopLayout() ? 32 : 24
const spaceBetweenEvents = () => styles.isDesktopLayout() ? 2 : 1

type EventDragData = {
	originalEvent: CalendarEvent,
	mouseOriginDay: Date,
	eventOriginalStart: Date,
	eventOriginalEnd: Date,

	eventClone: CalendarEvent
}

export class CalendarMonthView implements MComponent<CalendarMonthAttrs>, Lifecycle<CalendarMonthAttrs> {
	_monthDom: ?HTMLElement;
	_resizeListener: () => mixed;
	_zone: string
	_lastWidth: number
	_lastHeight: number
	_bubbleDoms: Set<HTMLElement>
	_currentlyDraggedEvent: ?EventDragData = null
	_dayUnderMouse: ?Date = null

	constructor() {
		this._resizeListener = m.redraw
		this._zone = getTimeZone()
		this._lastHeight = 0
		this._lastHeight = 0
		this._bubbleDoms = new Set()
	}

	oncreate() {
		windowFacade.addResizeListener(this._resizeListener)
	}

	onremove() {
		windowFacade.removeResizeListener(this._resizeListener)
	}

	view({attrs}: Vnode<CalendarMonthAttrs>): Children {
		const previousMonthDate = new Date(attrs.selectedDate)
		previousMonthDate.setMonth(previousMonthDate.getMonth() - 1)
		previousMonthDate.setDate(1)

		const nextMonthDate = new Date(attrs.selectedDate)
		nextMonthDate.setMonth(nextMonthDate.getMonth() + 1)
		nextMonthDate.setDate(1)
		return m(PageView, {
			previousPage: {
				key: previousMonthDate.getTime(),
				nodes: this._monthDom ? this._renderCalendar(attrs, previousMonthDate, this._zone) : null
			},
			currentPage: {
				key: attrs.selectedDate.getTime(),
				nodes: this._renderCalendar(attrs, attrs.selectedDate, this._zone)
			},
			nextPage: {
				key: nextMonthDate.getTime(),
				nodes: this._monthDom ? this._renderCalendar(attrs, nextMonthDate, this._zone) : null
			},
			onChangePage: (next) => attrs.onChangeMonth(next)
		})
	}

	onbeforeupdate(newVnode: Vnode<CalendarMonthAttrs>, oldVnode: VnodeDOM<CalendarMonthAttrs>): boolean {
		const dom = this._monthDom
		const different = !dom
			|| oldVnode.attrs.eventsForDays !== newVnode.attrs.eventsForDays
			|| oldVnode.attrs.selectedDate !== newVnode.attrs.selectedDate
			|| oldVnode.attrs.amPmFormat !== newVnode.attrs.amPmFormat
			|| oldVnode.attrs.groupColors !== newVnode.attrs.groupColors
			|| oldVnode.attrs.hiddenCalendars !== newVnode.attrs.hiddenCalendars
			|| dom.offsetWidth !== this._lastWidth
			|| dom.offsetHeight !== this._lastHeight
		if (dom) {
			this._lastWidth = dom.offsetWidth
			this._lastHeight = dom.offsetHeight
		}
		return different || this._currentlyDraggedEvent != null
	}

	_renderCalendar(attrs: CalendarMonthAttrs, date: Date, zone: string): Children {
		const startOfTheWeekOffset = getStartOfTheWeekOffset(attrs.startOfTheWeek)
		const {weekdays, weeks} = getCalendarMonth(date, startOfTheWeekOffset, false)
		const today = getStartOfDayWithZone(new Date(), getTimeZone())
		return m(".fill-absolute.flex.col.margin-are-inset-lr", [
			styles.isDesktopLayout() ?
				m(".mt-s.pr-l.flex.row.items-center",
					[
						m("button.calendar-switch-button", {
							onclick: () => attrs.onChangeMonth(false),
						}, m(Icon, {icon: Icons.ArrowDropLeft, class: "icon-large switch-month-button"})),
						m("button.calendar-switch-button", {
							onclick: () => attrs.onChangeMonth(true),
						}, m(Icon, {icon: Icons.ArrowDropRight, class: "icon-large switch-month-button"})),
						m("h1", formatMonthWithFullYear(date)),
					])
				: m(".pt-s"),
			m(".flex.mb-s", weekdays.map((wd) => m(".flex-grow", m(".calendar-day-indicator.b", wd)))),
			m(".flex.col.flex-grow", {
				oncreate: (vnode) => {
					if (date === attrs.selectedDate) {
						this._monthDom = vnode.dom
						m.redraw()
					}
				},
				onupdate: (vnode) => {
					if (date === attrs.selectedDate) {
						this._monthDom = vnode.dom
					}
				},
				onmousemove: () => this.eventDragMove(),
				onmouseup: () => this.eventDragEnd(attrs.onEventMoved),
				onmouseleave: (event: MouseEvent) => this.eventDragEnd(attrs.onEventMoved),
			}, weeks.map((week) => {
				return m(".flex.flex-grow.rel", [
					week.map((d, i) => this._renderDay(attrs, d, today, i)),
					this._monthDom ? this._renderWeekEvents(attrs, week, zone) : null,
				])
			}))
		])
	}

	_renderDay(attrs: CalendarMonthAttrs, d: CalendarDay, today: Date, weekDayNumber: number): Children {
		const {selectedDate} = attrs
		const isSelectedDate = isSameDay(selectedDate, d.date)
		return m(".calendar-day.calendar-column-border.flex-grow.rel.overflow-hidden.fill-absolute"
			+ (d.paddingDay ? ".calendar-alternate-background" : ""), {
				key: d.date.getTime(),
				onclick: (e) => {
					if (styles.isDesktopLayout()) {
						const newDate = new Date(d.date)
						let hour = new Date().getHours()
						if (hour < 23) {
							hour++
						}
						newDate.setHours(hour, 0)
						attrs.onNewEvent(newDate)
						attrs.onDateSelected(new Date(d.date), CalendarViewType.MONTH)
					} else {
						attrs.onDateSelected(new Date(d.date), CalendarViewType.DAY)
					}
					e.preventDefault()
				},
				onmouseover: () => {
					this._dayUnderMouse = d.date
				},
				ondragover: ev => {
					this._dayUnderMouse = d.date
					ev.preventDefault()
				},
				ondrop: ev => {
					ev.preventDefault()
					this.eventDragEnd(attrs.onEventMoved)
				}
			},
			[
				m(".calendar-day-top", {
						onclick: e => {
							attrs.onDateSelected(new Date(d.date), CalendarViewType.DAY)
							e.stopPropagation()
						}
					},
					[
						m("", {
							style: {
								height: px(SELECTED_DATE_INDICATOR_THICKNESS),
								backgroundColor: isSelectedDate ? theme.content_accent : "none"
							},
						}),
						m(".calendar-day-indicator.calendar-day-number" + getDateIndicator(d.date, null, today), String(d.day))
					]
				),
				// According to ISO 8601, weeks always start on Monday. Week numbering systems for
				// weeks that do not start on Monday are not strictly defined, so we only display
				// a week number if the user's client is configured to start weeks on Monday
				(weekDayNumber === 0) && (attrs.startOfTheWeek === WeekStart.MONDAY)
					? m(".calendar-month-week-number.abs", getWeekNumber(d.date))
					: null
			]
		)
	}

	_renderWeekEvents(attrs: CalendarMonthAttrs, week: Array<CalendarDay>, zone: string): Children {
		const events = new Set()
		for (let day of week) {
			const dayEvents = attrs.eventsForDays.get(day.date.getTime())
			if (dayEvents != null) {
				for (let event of dayEvents) {
					if (!attrs.hiddenCalendars.has(neverNull(event._ownerGroup)) && this._currentlyDraggedEvent?.originalEvent !== event) {
						events.add(event)
					}
				}
			}
		}

		const firstDayOfWeek = week[0].date
		const lastDayOfWeek = lastThrow(week)

		if (this._currentlyDraggedEvent
			&& isEventInWeek(this._currentlyDraggedEvent.eventClone, firstDayOfWeek, lastDayOfWeek.date, zone)) {
			events.add(this._currentlyDraggedEvent.eventClone)
		}

		const dayWidth = this._getWidthForDay()
		const weekHeight = this._getHeightForWeek()
		const eventHeight = (size.calendar_line_height + spaceBetweenEvents()) // height + border
		const maxEventsPerDay = (weekHeight - dayHeight()) / eventHeight
		const eventsPerDay = Math.floor(maxEventsPerDay) - 1 // preserve some space for the more events indicator
		const moreEventsForDay = [0, 0, 0, 0, 0, 0, 0]
		const eventMargin = (styles.isDesktopLayout() ? size.calendar_event_margin : size.calendar_event_margin_mobile)
		const firstDayOfNextWeek = getStartOfNextDayWithZone(lastDayOfWeek.date, zone)
		return layOutEvents(Array.from(events), zone, (columns) => {
			return columns.map((events, columnIndex) => {
				return events.map(event => {
					if (columnIndex < eventsPerDay) {
						const eventIsAllDay = isAllDayEventByTimes(event.startTime, event.endTime)
						const eventStart = eventIsAllDay ? getAllDayDateForTimezone(event.startTime, zone) : event.startTime
						const eventEnd = eventIsAllDay ? incrementDate(getEventEnd(event, zone), -1) : event.endTime
						const position = this._getEventPosition(eventStart, eventEnd, firstDayOfWeek, firstDayOfNextWeek, dayWidth,
							dayHeight(), columnIndex)

						return this.renderEvent(event, position, eventStart, firstDayOfWeek, firstDayOfNextWeek, eventEnd, attrs)

					} else {
						week.forEach((dayInWeek, index) => {
							const eventsForDay = attrs.eventsForDays.get(dayInWeek.date.getTime())
							if (eventsForDay && eventsForDay.indexOf(event) !== -1) {
								moreEventsForDay[index]++
							}
						})
						return null
					}
				})
			}).concat(moreEventsForDay.map((moreEventsCount, weekday) => {
				const day = week[weekday]
				const isPadding = day.paddingDay
				if (moreEventsCount > 0) {
					return m(".abs.darker-hover" + (isPadding ? ".calendar-bubble-more-padding-day" : ""), {
						style: {
							bottom: px(1),
							height: px(CALENDAR_EVENT_HEIGHT),
							left: px(weekday * dayWidth + eventMargin),
							width: px(dayWidth - 2 - eventMargin * 2),
							pointerEvents: "none"
						}
					}, m("", {
						style: {
							'font-weight': '600'
						}
					}, "+" + moreEventsCount))
				} else {
					return null
				}

			}))
		}, true)
	}

	renderEvent(event: CalendarEvent, position: SimplePosRect, eventStart: Date, firstDayOfWeek: Date, firstDayOfNextWeek: Date, eventEnd: Date, attrs: CalendarMonthAttrs): Children {

		return m(".abs.overflow-hidden", {
			key: event._id[0] + event._id[1] + event.startTime.getTime(),
			style: {
				top: px(position.top),
				height: px(CALENDAR_EVENT_HEIGHT),
				left: px(position.left),
				right: px(position.right)
			},
			oncreate: vnode => {
				this._bubbleDoms.add(vnode.dom)
			},
			onmousedown: () => this.eventDragStart(event),
		}, m(ContinuingCalendarEventBubble, {
			event: event,
			startsBefore: eventStart < firstDayOfWeek,
			endsAfter: firstDayOfNextWeek < eventEnd,
			color: getEventColor(event, attrs.groupColors),
			showTime: styles.isDesktopLayout() && !isAllDayEvent(event) ? EventTextTimeOption.START_TIME : null,
			user: logins.getUserController().user,
			onEventClicked: (e, domEvent) => {
				attrs.onEventClicked(event, domEvent)
			},
			fadeIn: this._currentlyDraggedEvent == null || event !== this._currentlyDraggedEvent.eventClone
		}))
	}

	_getEventPosition(
		eventStart: Date,
		eventEnd: Date,
		firstDayOfWeek: Date,
		firstDayOfNextWeek: Date,
		calendarDayWidth: number,
		calendarDayHeight: number,
		columnIndex: number,
	): SimplePosRect {
		const top = (size.calendar_line_height + spaceBetweenEvents()) * columnIndex + calendarDayHeight

		const dayOfStartDateInWeek = getDiffInDaysFast(eventStart, firstDayOfWeek)
		const dayOfEndDateInWeek = getDiffInDaysFast(eventEnd, firstDayOfWeek)

		const calendarEventMargin = styles.isDesktopLayout() ? size.calendar_event_margin : size.calendar_event_margin_mobile

		const left = (eventStart < firstDayOfWeek ? 0 : dayOfStartDateInWeek * calendarDayWidth) + calendarEventMargin
		const right = (eventEnd > firstDayOfNextWeek ? 0 : ((6 - dayOfEndDateInWeek) * calendarDayWidth)) + calendarEventMargin
		return {top, left, right}
	}

	_getHeightForWeek(): number {
		if (!this._monthDom) {
			return 1
		}
		const monthDomHeight = this._monthDom.offsetHeight
		return monthDomHeight / 6
	}

	_getWidthForDay(): number {
		if (!this._monthDom) {
			return 1
		}
		const monthDomWidth = this._monthDom.offsetWidth
		return monthDomWidth / 7
	}

	eventDragStart(calendarEvent: CalendarEvent,) {
		this._currentlyDraggedEvent = {
			originalEvent: calendarEvent,
			mouseOriginDay: neverNull(this.getDayUnderMouse()),
			eventOriginalStart: new Date(calendarEvent.startTime),
			eventOriginalEnd: new Date(calendarEvent.endTime),

			eventClone: createCalendarEvent({
				_id: calendarEvent._id,
				startTime: new Date(calendarEvent.startTime),
				endTime: new Date(calendarEvent.endTime),
				summary: calendarEvent.summary
			})
		}
	}

	eventDragMove() {

		const current = this._currentlyDraggedEvent
		if (current != null) {

			for (let dom of this._bubbleDoms) {
				dom.style.pointerEvents = "none"
				dom.style.opacity = "0.7"
			}
			const dayUnderMouse = neverNull(this.getDayUnderMouse())
			const mouseDiff = getDiffInDays(current.mouseOriginDay, dayUnderMouse)
			const newStartTime = new Date(current.eventOriginalStart)
			newStartTime.setDate(newStartTime.getDate() + mouseDiff)

			const newEndTime = new Date(current.eventOriginalEnd)
			newEndTime.setDate(newEndTime.getDate() + mouseDiff)

			current.eventClone.startTime = newStartTime
			current.eventClone.endTime = newEndTime

			// TODO check if the mouse has moved to a new day
			m.redraw()
		}
	}

	eventDragEnd(updateEventCallback: (eventId: IdTuple, newStartDate: Date) => *) {
		for (let dom of this._bubbleDoms) {
			dom.style.pointerEvents = "auto"
			dom.style.opacity = "1"
		}

		const current = this._currentlyDraggedEvent
		this._currentlyDraggedEvent = null
		if (current != null) {
			updateEventCallback(current.originalEvent._id, current.eventClone.startTime)
		}
	}

	getDayUnderMouse(): ?Date {
		/**
		 * Return the day for the current calendar square under the mouse
		 */
		return this._dayUnderMouse
	}
}

/**
 * Optimization to not create luxon's DateTime in simple case.
 * May not work if we allow override time zones.
 */
function getDiffInDaysFast(left: Date, right: Date): number {
	if (left.getMonth() === right.getMonth()) {
		return left.getDate() - right.getDate()
	} else {
		return getDiffInDays(right, left)
	}
}
