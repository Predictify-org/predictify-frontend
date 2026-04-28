import "@testing-library/jest-dom";
import { randomUUID } from "node:crypto";
import { ReadableStream, TransformStream, WritableStream } from "node:stream/web";
import { TextDecoder, TextEncoder } from "node:util";

if (typeof global.TextEncoder === "undefined") {
  (global as any).TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === "undefined") {
  (global as any).TextDecoder = TextDecoder;
}

if (typeof global.ReadableStream === "undefined") {
  (global as any).ReadableStream = ReadableStream;
}

if (typeof global.TransformStream === "undefined") {
  (global as any).TransformStream = TransformStream;
}

if (typeof global.WritableStream === "undefined") {
  (global as any).WritableStream = WritableStream;
}

const {
  fetch,
  Headers,
  Request,
  Response,
} = require("next/dist/compiled/@edge-runtime/primitives/fetch");

if (typeof global.crypto === "undefined") {
  (global as any).crypto = {
    randomUUID: () => randomUUID(),
  };
} else if (typeof global.crypto.randomUUID === "undefined") {
  (global.crypto as any).randomUUID = () => randomUUID();
}

if (typeof global.fetch === "undefined") {
  (global as any).fetch = fetch;
}

if (typeof global.Headers === "undefined") {
  (global as any).Headers = Headers;
}

if (typeof global.Request === "undefined") {
  (global as any).Request = Request;
}

if (typeof global.Response === "undefined") {
  (global as any).Response = Response;
}

process.env.STELLAR_NETWORK ??= "testnet";
process.env.JWT_SECRET ??= "test-secret-at-least-32-characters-long";
