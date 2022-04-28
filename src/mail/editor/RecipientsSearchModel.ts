import {Recipient} from "../../api/common/recipients/Recipient.js";
import {RecipientsModel} from "../../api/main/RecipientsModel.js";
import {ContactModel} from "../../contacts/model/ContactModel.js";
import {NativeInterfaceMain} from "../../native/main/NativeInterfaceMain.js";
import {isMailAddress} from "../../misc/FormatValidator.js";
import {ofClass, promiseMap} from "@tutao/tutanota-utils";
import {DbError} from "../../api/common/error/DbError.js";
import {locator} from "../../api/main/MainLocator.js";
import {ContactTypeRef} from "../../api/entities/tutanota/TypeRefs.js";
import {Mode} from "../../api/common/Env.js";
import {Request} from "../../api/common/MessageDispatcher.js";
import {PermissionError} from "../../api/common/error/PermissionError.js";

const MaxNativeSuggestions = 10

type NativeContact = {
    name: string,
    mailAddress: string
}

export class RecipientsSearchModel {

    private _searchResults: Array<Recipient> = []
    private loading: Promise<void> | null = null

    private currentQuery = ""
    private previousQuery = ""

    constructor(
        private readonly recipientsModel: RecipientsModel,
        private readonly contactModel: ContactModel,
        private readonly native: NativeInterfaceMain | null,
    ) {
    }

    results(): ReadonlyArray<Recipient> {
        return this._searchResults
    }

    isLoading(): boolean {
        return this.loading != null
    }

    clear() {
        this._searchResults = []
        this.loading = null
    }

    async search(value: string): Promise<void> {
        const query = value.trim()

        this.currentQuery = query

        if (this.loading != null) {
        } else if (query.length > 0 && !(this.previousQuery.length > 0 && query.indexOf(this.previousQuery) === 0 && this._searchResults.length === 0)) {
            this.loading = this.findContacts(query.toLowerCase()).then(async newSuggestions => {
                this.loading = null

                // Only update search result if search query has not been changed during search and update in all other cases
                if (query === this.currentQuery) {
                    this._searchResults = newSuggestions
                    this.previousQuery = query
                }
            })
        } else if (query.length === 0 && query !== this.previousQuery) {
            this._searchResults = []
            this.previousQuery = query
        }

        await this.loading
    }

    private async findContacts(query: string): Promise<Array<Recipient>> {

        if (isMailAddress(query, false)) {
            return []
        }

        // ensure match word order for email addresses mainly
        const contacts = await this.contactModel.searchForContacts('"' + query + '"', "recipient", 10).catch(
            ofClass(DbError, async () => {
                const listId = await this.contactModel.contactListId()
                if (listId) {
                    return locator.entityClient.loadAll(ContactTypeRef, listId)
                } else {
                    return []
                }
            }),
        )

        let suggestions = [] as Array<Recipient>
        for (const contact of contacts) {
            const name = `${contact.firstName} ${contact.lastName}`.trim()
            const mailAddresses = name.toLowerCase().indexOf(query) !== -1
                ? contact.mailAddresses.filter(ma => isMailAddress(ma.address.trim(), false))
                : contact.mailAddresses.filter(ma => {
                    return isMailAddress(ma.address.trim(), false) && ma.address.toLowerCase().indexOf(query) !== -1
                })

            suggestions = suggestions.concat(await promiseMap(mailAddresses, ({address}) => this.recipientsModel.resolve({
                name,
                address,
                contact
            })))
        }

        if (env.mode === Mode.App) {
            const nativeContacts = await this.findNativeContacts(query)

            const contactSuggestions = await promiseMap(
                nativeContacts.slice(0, MaxNativeSuggestions),
                ({name, mailAddress}) => this.recipientsModel.resolve({
                    name,
                    address: mailAddress,
                    resolveLazily: true
                })
            )

            for (const contact of contactSuggestions) {
                if (isMailAddress(contact.address, false) && !suggestions.some(s => s.address === contact.address)) {
                    suggestions.push(contact)
                }
            }
        }

        return suggestions.sort((suggestion1, suggestion2) => suggestion1.name.localeCompare(suggestion2.name))
    }

    private async findNativeContacts(text: string): Promise<Array<NativeContact>> {
        if (!this.native) {
            return []
        }
        return this.native.invokeNative(new Request("findSuggestions", [text])).catch(ofClass(PermissionError, () => []))
    }
}