import {create} from "../../common/utils/EntityUtils.js"
import {TypeRef, downcast} from "@tutao/tutanota-utils"
import type {TypeModel} from "../../common/EntityTypes.js"

import type {BlobAccessInfo} from "../sys/BlobAccessInfo.js"
import type {BlobId} from "../sys/BlobId.js"

export const FileBlobServiceGetOutTypeRef: TypeRef<FileBlobServiceGetOut> = new TypeRef("tutanota", "FileBlobServiceGetOut")
export const _TypeModel: TypeModel = {
	"name": "FileBlobServiceGetOut",
	"since": 50,
	"type": "DATA_TRANSFER_TYPE",
	"id": 1225,
	"rootId": "CHR1dGFub3RhAATJ",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_format": {
			"id": 1226,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		}
	},
	"associations": {
		"accessInfos": {
			"id": 1228,
			"type": "AGGREGATION",
			"cardinality": "Any",
			"final": false,
			"refType": "BlobAccessInfo",
			"dependency": "sys"
		},
		"blobs": {
			"id": 1227,
			"type": "AGGREGATION",
			"cardinality": "Any",
			"final": false,
			"refType": "BlobId",
			"dependency": "sys"
		}
	},
	"app": "tutanota",
	"version": "50"
}

export function createFileBlobServiceGetOut(values?: Partial<FileBlobServiceGetOut>): FileBlobServiceGetOut {
	return Object.assign(create(_TypeModel, FileBlobServiceGetOutTypeRef), downcast<FileBlobServiceGetOut>(values))
}

export type FileBlobServiceGetOut = {
	_type: TypeRef<FileBlobServiceGetOut>;

	_format: NumberString;

	accessInfos: BlobAccessInfo[];
	blobs: BlobId[];
}