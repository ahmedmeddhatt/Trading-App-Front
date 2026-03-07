/**
 * Runs as a jest setupFile — BEFORE setupFilesAfterEnv, inside the test environment.
 * Uses @whatwg-node/fetch (MSW's recommended polyfill) to expose Web Fetch API
 * globals that jest-environment-jsdom does not include.
 */
/* eslint-disable @typescript-eslint/no-require-imports */

// Must be set FIRST — polyfill packages like @fastify/busboy need TextDecoder/TextEncoder
const { TextDecoder, TextEncoder } = require("util");
if (!globalThis.TextDecoder) globalThis.TextDecoder = TextDecoder;
if (!globalThis.TextEncoder) globalThis.TextEncoder = TextEncoder;

const { fetch, Request, Response, Headers, FormData } = require("@whatwg-node/fetch");
const { ReadableStream, WritableStream, TransformStream } = require("stream/web");

Object.assign(globalThis, {
  fetch, Request, Response, Headers, FormData,
  ReadableStream, WritableStream, TransformStream,
});
