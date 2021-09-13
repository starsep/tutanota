//@flow
import type {CalendarEvent} from "../../api/entities/tutanota/CalendarEvent"
import {CalendarEventTypeRef, createCalendarEvent} from "../../api/entities/tutanota/CalendarEvent"
import m from "mithril"
import {EntityClient} from "../../api/common/EntityClient"

const DRAG_THRESHOLD = 10

export type MousePos = {
	x: number,
	y: number
}

// Convenience wrapper for nullability
type DragData = {
	originalEvent: CalendarEvent,
	originalDateUnderMouse: Date,
	eventClone: CalendarEvent,
	originalMousePos: MousePos
}


export class EventDragHandler {

	_data: ?DragData = null
	_entityClient: EntityClient
	_isDragging: boolean = false

	constructor(entityClient: EntityClient) {
		this._entityClient = entityClient
	}

	get originalEvent(): ?CalendarEvent {
		if (!this._isDragging) {
			return null
		}
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

	prepareDrag(calendarEvent: CalendarEvent, dateUnderMouse: Date, mousePos: MousePos) {
		this._data = {
			originalEvent: calendarEvent,
			originalDateUnderMouse: dateUnderMouse,
			originalMousePos: mousePos,
			eventClone: createCalendarEvent({
				_id: calendarEvent._id,
				startTime: new Date(calendarEvent.startTime),
				endTime: new Date(calendarEvent.endTime),
				summary: calendarEvent.summary
			})
		}
	}

	handleDrag(dateUnderMouse: Date, mousePos: MousePos) {

		if (this._data) {

			const {originalEvent, originalDateUnderMouse, eventClone} = this._data
			// I dont want to start dragging until the mouse has moved by some amount
			const diffX = this._data.originalMousePos.x - mousePos.x
			const diffY = this._data.originalMousePos.y - mousePos.y
			const diff = Math.sqrt(diffX ** 2 + diffY ** 2)
			if (diff > DRAG_THRESHOLD) {

				this._isDragging = true

				const mouseDiff = dateUnderMouse - originalDateUnderMouse
				eventClone.startTime = new Date(originalEvent.startTime.getTime() + mouseDiff)
				eventClone.endTime = new Date(originalEvent.endTime.getTime() + mouseDiff)

				// TODO check if the mouse has moved to a new day
				m.redraw()
			}
		}
	}

	async endDrag(dateUnderMouse: Date, callback: (eventId: IdTuple, newDate: Date) => *) {
		if (this._isDragging && this._data) {
			const {originalEvent, eventClone} = this._data
			if (originalEvent.repeatRule) {
				const firstOccurrence = await this._entityClient.load(CalendarEventTypeRef, originalEvent._id)
				const startTime = new Date(
					firstOccurrence.startTime.getTime() - (originalEvent.startTime.getTime() - eventClone.startTime.getTime())
				)
				callback(originalEvent._id, startTime)
			} else {
				callback(originalEvent._id, eventClone.startTime)
			}
		}
		this._data = null
		this._isDragging = false
	}
}