import type {HttpMethod} from "../../common/EntityFunctions"
import {MediaType, resolveTypeReference} from "../../common/EntityFunctions"
import {downcast, neverNull, TypeRef} from "@tutao/tutanota-utils"
import {assertWorkerOrNode} from "../../common/Env"
import type {TutanotaService} from "../../entities/tutanota/Services";
import type {SysService} from "../../entities/sys/Services";
import type {AccountingService} from "../../entities/accounting/Services";
import type {MonitorService} from "../../entities/monitor/Services";
import type {StorageService} from "../../entities/storage/Services";
import {locator} from "../WorkerLocator";
import type {Entity} from "../../common/EntityTypes"

assertWorkerOrNode()

export async function _service<T extends Entity>(
	service: SysService | TutanotaService | MonitorService | AccountingService | StorageService,
	method: HttpMethod,
	requestEntity?: any,
	responseTypeRef?: TypeRef<T>,
	queryParameter?: Dict,
	sk?: Aes128Key,
	extraHeaders?: Dict,
): Promise<any> {
	const modelForAppAndVersion = await resolveTypeReference((requestEntity) ? requestEntity._type : downcast(responseTypeRef))
	let path = `/rest/${modelForAppAndVersion.app.toLowerCase()}/${service}`
	let queryParams = queryParameter != null ? queryParameter : {}
	const headers = Object.assign(locator.login.createAuthHeaders(), extraHeaders)
	headers["v"] = modelForAppAndVersion.version

	let encryptedEntity: Record<string, unknown> | null = null
	if (requestEntity != null) {
		let requestTypeModel = await resolveTypeReference(requestEntity._type)
		if (requestTypeModel.encrypted && sk == null) {
			return Promise.reject(new Error("must provide a session key for an encrypted data transfer type!: " + service))
		}
		encryptedEntity = await locator.instanceMapper.encryptAndMapToLiteral(requestTypeModel, requestEntity, sk ?? null)
	}

	const data = await locator.restClient.request(path, method, queryParams, neverNull(headers), encryptedEntity ? JSON.stringify(encryptedEntity) : undefined, MediaType.Json)
	if (responseTypeRef) {
		let responseTypeModel = await resolveTypeReference(responseTypeRef)
		let instance = JSON.parse(data)
		let resolvedSessionKey = await locator.crypto.resolveServiceSessionKey(responseTypeModel, instance)
		return locator.instanceMapper.decryptAndMapToInstance(responseTypeModel, instance, resolvedSessionKey ? resolvedSessionKey : sk ?? null)
	}
}