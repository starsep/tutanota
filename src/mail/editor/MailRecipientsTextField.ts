import m, {Children, ClassComponent, Vnode} from "mithril"
import {BubbleTextField} from "../../gui/base/BubbleTextField"
import {Recipient} from "../../api/common/recipients/Recipient"
import {getDisplayText} from "../model/MailUtils"
import {px} from "../../gui/size"
import {progressIcon} from "../../gui/base/Icon"
import {TranslationKey} from "../../misc/LanguageViewModel"
import {stringToNameAndMailAddress} from "../../misc/parsing/MailAddressParser"
import {DropdownChildAttrs} from "../../gui/base/DropdownN"
import {Contact} from "../../api/entities/tutanota/TypeRefs"
import {RecipientsSearchDropDown} from "./RecipientsSearchDropDown"
import {locator} from "../../api/main/MainLocator"
import {isApp} from "../../api/common/Env"
import {RecipientsSearchModel} from "./RecipientsSearchModel"

export interface MailRecipientsTextFieldAttrs {
	label: TranslationKey,
	text: string,
	onTextChanged: (text: string) => void
	recipients: ReadonlyArray<Recipient>
	onRecipientAdded: (address: string, name: string | null, contact: Contact | null) => void
	onRecipientRemoved: (address: string) => void
	getRecipientClickedDropdownAttrs?: (address: string) => Promise<DropdownChildAttrs[]>
	injectionsRight?: Children | null
	disabled: boolean
}

/**
 * A component for inputting a list of recipients
 * recipients are represented as bubbles, and a contact search dropdown is shown as the user types
 */
export class MailRecipientsTextField implements ClassComponent<MailRecipientsTextFieldAttrs> {
	private attrs: MailRecipientsTextFieldAttrs

	private selectedSuggestionIdx = 0
	private search: RecipientsSearchModel

	constructor(vnode: Vnode<MailRecipientsTextFieldAttrs>) {
		this.attrs = vnode.attrs
		this.search = new RecipientsSearchModel(locator.recipientsModel, locator.contactModel, isApp() ? locator.native : null)
	}

	view(vnode: Vnode<MailRecipientsTextFieldAttrs>): Children {
		this.attrs = vnode.attrs

		return [
			this.renderTextField(),
			this.renderSuggestions()
		]
	}

	private renderTextField(): Children {
		return m(BubbleTextField, {
			label: this.attrs.label,
			text: this.attrs.text,
			onInput: text => {
				this.search.search(text).then(() => {
					this.selectedSuggestionIdx = Math.max(0, Math.min(this.selectedSuggestionIdx, this.search.results().length - 1))
					m.redraw()
				})

				// if the new text length is more than one character longer,
				// it means the user pasted the text in, so we want to try and resolve a list of contacts
				const {remainingText, newRecipients} = text.length - this.attrs.text.length > 1
					? parsePastedInput(text)
					: parseTypedInput(text)

				for (const {address, name} of newRecipients) {
					this.attrs.onRecipientAdded(address, name, null)
				}

				this.attrs.onTextChanged(remainingText)
			},
			items: this.attrs.recipients.map(recipient => recipient.address),
			renderBubbleText: (address: string) => {
				const name = this.attrs.recipients.find(recipient => recipient.address === address)?.name ?? null
				return getDisplayText(name, address, false)
			},
			getBubbleDropdownAttrs: async (address) => (await this.attrs.getRecipientClickedDropdownAttrs?.(address)) ?? [],
			onBackspace: () => {
				if (this.attrs.text === "" && this.attrs.recipients.length > 0) {
					const {address} = this.attrs.recipients.slice().pop()!
					this.attrs.onTextChanged(address)
					this.attrs.onRecipientRemoved(address)
					return false
				}
				return true

			},
			onEnterKey: () => {
				this.resolveInput()
				return true
			},
			onUpKey: () => {
				this.selectedSuggestionIdx = Math.min(this.search.results().length - 1, this.selectedSuggestionIdx + 1)
				return false
			},
			onDownKey: () => {
				this.selectedSuggestionIdx = Math.max(0, this.selectedSuggestionIdx - 1)
				return false
			},
			onBlur: () => {
				this.resolveInput()
				return true
			},
			disabled: this.attrs.disabled,
			injectionsRight: [
				// Placeholder element for the suggestion progress icon with a fixed width and height to avoid flickering.
				// when reaching the end of the input line and when entering a text into the second line.
				m(
					".align-right.mr-s.button-height.flex.items-end.pb-s",
					{
						style: {
							width: px(20), // in case the progress icon is not shown we reserve the width of the progress icon
						},
					},
					this.search.isLoading() ? progressIcon() : null,
				),
				this.attrs.injectionsRight
			]
		})
	}

	private renderSuggestions(): Children {
		return m(RecipientsSearchDropDown, {
			suggestions: this.search.results(),
			selectedSuggestionIndex: this.selectedSuggestionIdx,
			onSuggestionSelected: idx => this.selectSuggestion(idx),
		})
	}

	private resolveInput() {
		const suggestions = this.search.results()
		if (suggestions.length > 0) {
			this.selectSuggestion(this.selectedSuggestionIdx)
		} else {
			const parsed = parseMailAddress(this.attrs.text)
			if (parsed != null) {
				this.attrs.onRecipientAdded(parsed.address, parsed.name, null)
				this.attrs.onTextChanged("")
			}
		}
	}

	private selectSuggestion(index?: number) {
		if (index == null) {
			index = this.selectedSuggestionIdx
		}
		const {address, name, contact} = this.search.results()[index]
		this.attrs.onRecipientAdded(address, name, contact)
		this.selectedSuggestionIdx = 0
		this.search.clear()
		this.attrs.onTextChanged("")
	}
}

interface ParsedInput {
	remainingText: string,
	newRecipients: Array<{address: string, name: string | null}>
}

/**
 * Parse a list of valid mail addresses separated by either a semicolon or a comma.
 * If any of the mail addresses are invalid, then no new recipients will be returned,
 * and the text will remain untouched
 */
function parsePastedInput(text: string): ParsedInput {
	const separator = text.indexOf(";") !== -1 ? ";" : ","
	const textParts = text.split(separator).map(part => part.trim())

	const result: ParsedInput["newRecipients"] = []

	for (let part of textParts) {
		part = part.trim()

		if (part.length !== 0) {
			const parsed = parseMailAddress(part)

			if (!parsed) {
				// give up early
				return {
					remainingText: text,
					newRecipients: []
				}
			} else {
				result.push(parsed)
			}
		}
	}

	return {
		remainingText: "",
		newRecipients: result
	}
}

/**
 * Parse text when it is typed by the user
 * When the final character is an expected delimiter (';', ',', ' '),
 * then we attempt to parse the preceding text. If it is a valid mail address,
 * it is successfully parsed
 * @param text
 */
function parseTypedInput(text: string): ParsedInput {

	const lastCharacter = text.slice(-1)

	// on semicolon, comman or space we want to try to resolve the input text
	if (lastCharacter === ";" || lastCharacter === "," || lastCharacter === " ") {
		const textMinusLast = text.slice(0, -1)

		const result = parseMailAddress(textMinusLast)
		const remainingText = result != null
			? ""
			: textMinusLast

		return {
			remainingText,
			newRecipients: result ? [result] : []
		}
	}

	return {
		remainingText: text,
		newRecipients: []
	}
}

function parseMailAddress(text: string): {address: string, name: string | null} | null {
	text = text.trim()

	if (text === "") return null

	const nameAndMailAddress = stringToNameAndMailAddress(text)

	if (nameAndMailAddress) {
		const name = nameAndMailAddress.name
			? nameAndMailAddress.name
			: null

		return {name, address: nameAndMailAddress.mailAddress}
	} else {
		return null
	}
}


