import {create} from "../../common/utils/EntityUtils.js"
import {TypeRef, downcast} from "@tutao/tutanota-utils"
import type {TypeModel} from "../../common/EntityTypes.js"


export const FileBlobServiceGetInTypeRef: TypeRef<FileBlobServiceGetIn> = new TypeRef("tutanota", "FileBlobServiceGetIn")
export const _TypeModel: TypeModel = {
	"name": "FileBlobServiceGetIn",
	"since": 50,
	"type": "DATA_TRANSFER_TYPE",
	"id": 1229,
	"rootId": "CHR1dGFub3RhAATN",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_format": {
			"id": 1230,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		}
	},
	"associations": {
		"file": {
			"id": 1231,
			"type": "LIST_ELEMENT_ASSOCIATION",
			"cardinality": "One",
			"final": false,
			"refType": "File"
		}
	},
	"app": "tutanota",
	"version": "50"
}

export function createFileBlobServiceGetIn(values?: Partial<FileBlobServiceGetIn>): FileBlobServiceGetIn {
	return Object.assign(create(_TypeModel, FileBlobServiceGetInTypeRef), downcast<FileBlobServiceGetIn>(values))
}

export type FileBlobServiceGetIn = {
	_type: TypeRef<FileBlobServiceGetIn>;

	_format: NumberString;

	file: IdTuple;
}