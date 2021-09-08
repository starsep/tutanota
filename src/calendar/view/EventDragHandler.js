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

		const mouseDiff = dayUnderMouse - this.mouseOriginDate // getDiffInDays(this.mouseOriginDate, dayUnderMouse)
		this.eventClone.startTime = new Date(this.originalEvent.startTime.getTime() + mouseDiff)
		this.eventClone.endTime = new Date(this.originalEvent.endTime.getTime() + mouseDiff)

		// TODO check if the mouse has moved to a new day
		m.redraw()
	}
}