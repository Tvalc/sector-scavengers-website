/**
 * Second preview of the main site on port 4174 (edit live alongside :4173).
 * Dynamic import so PORT is set before preview.mjs reads it.
 */
process.env.PORT = "4174";
await import(new URL("./preview.mjs", import.meta.url));
