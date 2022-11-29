# **Web Application Templates**
A collection of features that help you create web applications.

# Deno Browser Compatible Module
You can also import deno web browser compatible utilities. (External repository.)

See also https://github.com/dojyorin/deno_simple_utility

## Bundle
You can bundling from TypeScript to one JavaScript with the `deno bundle` command.

```sh
deno bundle https://deno.land/x/simple_utility@v0.0.9/mod.compatible.ts > ./simple_utility.js
```

## Types
Since type information is lost in bundling, we provide complementary type definitions in JSDoc format.

<p>
<details>
<summary>Show more details...</summary>
<p>

```js
/**
* @typedef {string | number | boolean | null | JsonArray | JsonObject} JsonStruct
* @typedef {JsonStruct[]} JsonArray
* @typedef {{[key in string]: JsonStruct}} JsonObject
*/

/**
* @typedef {Exclude<HeadersInit, Headers> | URLSearchParams} QueryInit
* @typedef {Omit<RequestInit, "window"> & {query?: QueryInit}} FetchInit
*/

/**
* @typedef {[string, Uint8Array]} FileInit
*/

/**
* @typedef {Uint8Array} PortableCryptoKey
* @typedef {Record<keyof CryptoKeyPair, PortableCryptoKey>} PortableCryptoKeyPair
*/

/**
* @typedef {object} FetchResponseType
* @property {string} text
* @property {JsonStruct} json
* @property {FormData} form
* @property {Uint8Array} byte
* @property {ArrayBuffer} buffer
* @property {Blob} blob
* @property {boolean} ok
* @property {number} code
* @property {Headers} header
* @property {Response} response
*/

/**
* @function base64Encode
* @param {Uint8Array} data
* @return {string}
*/

/**
* @function base64Decode
* @param {string} data
* @return {Uint8Array}
*/

/**
* @function cryptoRandom
* @param {number} size
* @return {Promise<Uint8Array>}
*/

/**
* @function cryptoHash
* @param {boolean} is512
* @param {Uint8Array} data
* @return {Promise<Uint8Array>}
*/

/**
* @function cryptoGenerateKey
* @param {boolean} isECDH
* @return {Promise<PortableCryptoKeyPair>}
*/

/**
* @function cryptoEncrypt
* @param {PortableCryptoKeyPair} kp
* @param {Uint8Array} data
* @return {Promise<Uint8Array>}
*/

/**
* @function cryptoDecrypt
* @param {PortableCryptoKeyPair} kp
* @param {Uint8Array} data
* @return {Promise<Uint8Array>}
*/

/**
* @function cryptoSign
* @param {PortableCryptoKey} k
* @param {Uint8Array} data
* @return {Promise<Uint8Array>}
*/

/**
* @function cryptoVerify
* @param {Uint8Array} signature
* @param {PortableCryptoKey} k
* @param {Uint8Array} data
* @return {Promise<boolean>}
*/

/**
* @function dateEncode
* @param {Date} [date]
* @return {number}
*/

/**
* @function dateDecode
* @param {number} time
* @return {Date}
*/

/**
* @function dateParse
* @param {string} dt
* @return {number}
*/

/**
* @function deflateEncode
* @param {Uint8Array} data
* @return {Promise<Uint8Array>}
*/

/**
* @function deflateDecode
* @param {Uint8Array} data
* @return {Promise<Uint8Array>}
*/

/**
* @function fetchExtend
* @template {keyof FetchResponseType} T
* @param {string} path
* @param {T} type
* @param {FetchInit} [option]
* @return {Promise<FetchResponseType[T]>}
*/

/**
* @function minipackEncode
* @param {FileInit[]} files
* @return {Promise<Uint8Array>}
*/

/**
* @function minipackDecode
* @param {Uint8Array} archive
* @return {Promise<FileInit[]>}
*/

/**
* @function ucEncode
* @param {string} data
* @return {Uint8Array}
*/

/**
* @function ucDecode
* @param {Uint8Array} data
* @return {string}
*/

/**
* @function hexEncode
* @param {Uint8Array} data
* @return {string}
*/

/**
* @function trimExtend
* @param {string} data
* @return {string}
*/
```

</p>
</details>
</p>