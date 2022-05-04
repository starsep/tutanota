import m, {Children, Component, CVnode, Vnode} from "mithril"
import type {TranslationText} from "../../../misc/LanguageViewModel"
import {lang} from "../../../misc/LanguageViewModel"
import {addFlash, removeFlash} from "../Flash"
import {AllIcons, Icon} from "../Icon"
import {theme} from "../../theme"
import {assertNotNull} from "@tutao/tutanota-utils"
import type {clickHandler} from "../GuiUtils"

export interface FolderColumnHeaderButtonAttrs {
	label: TranslationText
	icon?: AllIcons
	click?: clickHandler
	color?: string,
}

export class FolderColumnHeaderButton implements Component<FolderColumnHeaderButtonAttrs> {
	private domButton: HTMLElement | null = null
	private attrs: FolderColumnHeaderButtonAttrs

	get color(): string {
		return this.attrs.color ?? theme.content_accent
	}

	constructor(vnode: CVnode<FolderColumnHeaderButtonAttrs>) {
		this.attrs = vnode.attrs
	}

	view(vnode: Vnode<FolderColumnHeaderButtonAttrs>): Children {
		this.attrs = vnode.attrs

		return m("button",
			{
				class: "bg-transparent button-height full-width noselect limit-width",
				style: {
					border: `2px solid ${this.color}`,
					"border-radius": "3px",
				},
				onclick: (event: MouseEvent) => this.attrs.click?.(event, assertNotNull(this.domButton)),
				title: lang.getMaybeLazy(this.attrs.label),
				oncreate: vnode => this.domButton = vnode.dom as HTMLButtonElement,
			},
			m(
				"",
				{
					// additional wrapper for flex box styling as safari does not support flex box on buttons.
					class: "button-content flex items-center justify-center",
					style: {
						borderColor: this.color,
					},
					oncreate: vnode => addFlash(vnode.dom),
					onremove: vnode => removeFlash(vnode.dom),
				},
				[
					this.renderIcon(),
					this.renderLabel(),
				],
			),
		)
	}

	private renderIcon(): Children {
		return this.attrs.icon != null
			? m(Icon, {
				icon: this.attrs.icon,
				class: "flex-center items-center button-icon icon-large",
				style: {
					fill: this.color,
					"background-color": "initial",
				},
			})
			: null
	}

	private renderLabel(): Children {
		return m(
			"",
			{
				class: "text-ellipsis",
				style: {
					color: this.color,
					"font-weight": "bold",
				},
			},
			lang.getMaybeLazy(this.attrs.label),
		)
	}
}