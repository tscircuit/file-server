import { Buffer } from "node:buffer"

export const decodeBase64ToUint8Array = (base64: string): Uint8Array => {
  const buffer = Buffer.from(base64, "base64")
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

export const uint8ArrayToArrayBuffer = (view: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(view.byteLength)
  new Uint8Array(buffer).set(view)
  return buffer
}
