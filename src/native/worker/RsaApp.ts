import {base64ToUint8Array, uint8ArrayToBase64} from "@tutao/tutanota-utils"
import {Request} from "../../api/common/MessageDispatcher"
import type {PrivateKey, PublicKey, RsaKeyPair} from "@tutao/tutanota-crypto"
import type {NativeInterface} from "../common/NativeInterface"
import type {RsaImplementation} from "../../api/worker/crypto/RsaImplementation"
import type {Randomizer} from "@tutao/tutanota-crypto"

export class RsaApp implements RsaImplementation {
	_native: NativeInterface
	_rng: Randomizer

	constructor(native: NativeInterface, rng: Randomizer) {
		this._native = native
		this._rng = rng
	}

	generateKey(): Promise<RsaKeyPair> {
		const seed = this._rng.generateRandomData(512)

		return this._native.invokeNative(new Request("generateRsaKey", [uint8ArrayToBase64(seed)]))
	}

	/**
	 * Encrypt bytes with the provided publicKey
	 */
	encrypt(publicKey: PublicKey, bytes: Uint8Array): Promise<Uint8Array> {
		const seed = this._rng.generateRandomData(32)

		let encodedBytes = uint8ArrayToBase64(bytes)
		return this._native
				   .invokeNative(new Request("rsaEncrypt", [publicKey, encodedBytes, uint8ArrayToBase64(seed)]))
				   .then(base64 => base64ToUint8Array(base64))
	}

	/**
	 * Decrypt bytes with the provided privateKey
	 */
	decrypt(privateKey: PrivateKey, bytes: Uint8Array): Promise<Uint8Array> {
		let encodedBytes = uint8ArrayToBase64(bytes)
		return this._native.invokeNative(new Request("rsaDecrypt", [privateKey, encodedBytes])).then(base64 => base64ToUint8Array(base64))
	}
}