// @flow


import {pad} from "./StringUtils"

export class Time {

	+hours: number
	+minutes: number

	constructor(hours: number, minutes: number) {
		this.hours = hours
		this.minutes = minutes
	}

	static fromDate(date: Date): Time {
		return new Time(date.getHours(), date.getMinutes())
	}

	equals(otherTime: Time): boolean {
		return this.hours === otherTime.hours && this.minutes === otherTime.minutes
	}

	toString(amPmFormat: boolean): string {
		return amPmFormat ? this.to12HourString() : this.to24HourString()
	}

	to12HourString(): string {
		const minutesString = pad(this.minutes, 2)
		if (this.hours === 0) {
			return `12:${minutesString} am`
		} else if (this.hours === 12) {
			return `12:${minutesString} pm`
		} else if (this.hours > 12) {
			return `${this.hours - 12}:${minutesString} pm`
		} else {
			return `${this.hours}:${minutesString} am`
		}
	}

	to24HourString(): string {
		const hours = pad(this.hours, 2)
		const minutes = pad(this.minutes, 2)
		return `${hours}:${minutes}`
	}
}