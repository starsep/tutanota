//@flow
import type {CalendarEvent} from "../../api/entities/tutanota/CalendarEvent"
import {createCalendarEvent} from "../../api/entities/tutanota/CalendarEvent"
import {getDiffInDays} from "../date/CalendarUtils"
import m from "mithril"


export class EventDragHandler {
	originalEvent: CalendarEvent
	mouseOriginDate: Date
	eventClone: CalendarEvent

	constructor(calendarEvent: CalendarEvent, mouseDate: Date) {
		this.originalEvent = calendarEvent
		this.mouseOriginDate = mouseDate
		this.eventClone = createCalendarEvent({
			_id: calendarEvent._id,
			startTime: new Date(calendarEvent.startTime),
			endTime: new Date(calendarEvent.endTime),
			summary: calendarEvent.summary
		})
	}


	handleDrag(dayUnderMouse: Date) {

		const mouseDiff = getDiffInDays(this.mouseOriginDate, dayUnderMouse)
		const newStartTime = new Date(this.originalEvent.startTime)
		newStartTime.setDate(newStartTime.getDate() + mouseDiff)

		const newEndTime = new Date(this.originalEvent.endTime)
		newEndTime.setDate(newEndTime.getDate() + mouseDiff)

		this.eventClone.startTime = newStartTime
		this.eventClone.endTime = newEndTime

		// TODO check if the mouse has moved to a new day
		m.redraw()

	}
}