//@flow
import type {CalendarEvent} from "../../api/entities/tutanota/CalendarEvent"
import {createCalendarEvent} from "../../api/entities/tutanota/CalendarEvent"
import m from "mithril"

// Convenience wrapper for nullability
type DragData = {
	originalEvent: CalendarEvent,
	originalDateUnderMouse: Date,
	eventClone: CalendarEvent
}

export class EventDragHandler {

	_data: ?DragData = null
	_isDragging: boolean = false

	get originalEvent(): ?CalendarEvent {
		return this._data?.originalEvent
	}

	get temporaryEvent(): ?CalendarEvent {
		if (!this._isDragging) {
			return null
		}

		return this._data?.eventClone
	}

	get isDragging(): boolean {
		return this._isDragging
	}

	prepareDrag(calendarEvent: CalendarEvent, dateUnderMouse: Date) {
		this._data = {
			originalEvent: calendarEvent,
			originalDateUnderMouse: dateUnderMouse,
			eventClone: createCalendarEvent({
				_id: calendarEvent._id,
				startTime: new Date(calendarEvent.startTime),
				endTime: new Date(calendarEvent.endTime),
				summary: calendarEvent.summary
			})
		}
	}

	handleDrag(dateUnderMouse: Date) {

		if (this._data) {
			this._isDragging = true

			const {originalEvent, originalDateUnderMouse, eventClone} = this._data

			const mouseDiff = dateUnderMouse - originalDateUnderMouse
			eventClone.startTime = new Date(originalEvent.startTime.getTime() + mouseDiff)
			eventClone.endTime = new Date(originalEvent.endTime.getTime() + mouseDiff)

			// TODO check if the mouse has moved to a new day
			m.redraw()
		}
	}

	endDrag(dateUnderMouse: Date, callback: (eventId: IdTuple, newDate: Date) => *) {
		if (this._data) {
			const {originalEvent, eventClone} = this._data
			callback(originalEvent._id, eventClone.startTime)
		}
		this._data = null
		this._isDragging = false
	}

}