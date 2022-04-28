import m, {Children, ClassComponent, Vnode} from "mithril"
import {TextFieldN} from "./TextFieldN"
import {TranslationText} from "../../misc/LanguageViewModel"
import stream from "mithril/stream"
import {ButtonN, ButtonType} from "./ButtonN"
import {KeyPress} from "../../misc/KeyManager"
import {Keys} from "../../api/common/TutanotaConstants"
import {attachDropdown, DropdownChildAttrs} from "./DropdownN"

export interface BubbleTextFieldAttrs {
	label: TranslationText
	items: Array<string>
	renderBubbleText: (item: string) => string
	getBubbleDropdownAttrs: (item: string) => Promise<DropdownChildAttrs[]>
	text: string
	onInput: (text: string) => void
	onBackspace: () => boolean
	onEnterKey: () => boolean
	onUpKey: () => boolean
	onDownKey: () => boolean
	disabled: boolean
	injectionsRight?: Children | null
	onBlur: () => void
}

export class BubbleTextField implements ClassComponent<BubbleTextFieldAttrs> {
	private attrs: BubbleTextFieldAttrs
	private active: boolean = false
	private domInput: HTMLInputElement | null = null

	constructor(vnode: Vnode<BubbleTextFieldAttrs>) {
		this.attrs = vnode.attrs
	}

	view(vnode: Vnode<BubbleTextFieldAttrs>) {
		this.attrs = vnode.attrs
		return m(".bubble-text-field", [
			m(TextFieldN, {
				label: this.attrs.label,
				disabled: this.attrs.disabled,
				value: stream(this.attrs.text),
				oninput: this.attrs.onInput,
				injectionsLeft: () => {
					return this.attrs.items.map((item, idx, items) => {
						// We need overflow: hidden on both so that ellipsis on button works.
						// flex is for reserving space for the comma. align-items: end so that comma is pushed to the bottom.
						return m(".flex.overflow-hidden.items-end", [
							m(".flex-no-grow-shrink-auto.overflow-hidden", m(ButtonN, attachDropdown({
								mainButtonAttrs: {
									label: () => this.attrs.renderBubbleText(item),
									type: ButtonType.TextBubble,
									isSelected: () => false,
								},
								childAttrs: () => this.attrs.getBubbleDropdownAttrs(item)
							}))),
							// Comma is shown when there's text/another bubble afterwards or if the field is active
							this.active || idx < items.length - 1 || this.attrs.text !== "" ? m("span.pr", ",") : null,
						])
					})
				},
				injectionsRight: () => this.attrs.injectionsRight ?? null,
				oncreate: vnode => {
					// If the field is initialized with bubbles but the user did not edit it yet then field will not have correct size
					// and last bubble will not be on the same line with right injections (like "show" button). It is fixed after user
					// edits the field and autocompletion changes the field but before that it's broken. To avoid it we set the size
					// manually.
					//
					// This oncreate is run before the dom input's oncreate is run and sets the field so we have to access input on the
					// next frame. There's no other callback to use without requesting redraw.
					requestAnimationFrame(() => {
						if (this.domInput) this.domInput.size = 1
					})
				},
				onDomInputCreated: dom => this.domInput = dom,
				onfocus: () => {
					this.active = true
				},
				onblur: () => {
					this.active = false
					this.attrs.onBlur()
				},
				keyHandler: key => this.handleKey(key)
			}),
		])
	}

	private handleKey(key: KeyPress): boolean {
		switch (key.keyCode) {
			case Keys.BACKSPACE.code:
				return this.attrs.onBackspace()

			case Keys.RETURN.code:
				return this.attrs.onEnterKey()

			case Keys.DOWN.code:
				return this.attrs.onUpKey()

			case Keys.UP.code:
				return this.attrs.onDownKey()
		}

		return true
	}
}