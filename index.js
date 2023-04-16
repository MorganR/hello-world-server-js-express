"use strict";
const express = require("express");
const mime = require("mime");
const fs = require("fs/promises");
const path = require("path");
const zlib = require("zlib");

function getPort() {
  const fromEnv = Number.parseInt(process.env.PORT);
  return Number.isNaN(fromEnv) ? 8080 : fromEnv;
}

const MAX_NAME_LENGTH = 500;
const GZIP_COMPRESSION_LEVEL = 6;

/**
 * Responds with a greeting to "name".
 */
function helloHandler(req, res, next) {
  if (req.query.name?.length > 0) {
    if (req.query.name.length > MAX_NAME_LENGTH) {
      return res.status(400).end();
    }
    res.body = `Hello, ${req.query.name}!`;
  } else {
    res.body = "Hello, world!";
  }
  res.type("text/plain");
  next();
}

const SLEEP_DURATION_MILLIS = 15;

/**
 * Responds with a greeting after a delay.
 */
async function asyncHelloHandler(req, res, next) {
  await new Promise((r) => setTimeout(r, SLEEP_DURATION_MILLIS));
  res.type("text/plain");
  res.body = "Hello, world!";
  next();
}

/**
 * Responds with a list with "n" items.
 */
function linesHandler(req, res, next) {
  const n = Number.parseInt(req.query.n);
  let result = "<ol>\n";
  for (let i = 1; i <= n; i++) {
    result += "  <li>Item number: " + i + "</li>\n";
  }
  result += "</ol>";
  res.body = result;
  res.type("text/html");
  next();
}

/**
 * Responds with the result of an "n"-term convergent sum.
 */
function powerReciprocalsAltHandler(req, res) {
  const n = Number.parseInt(req.query.n);
  res.type("text/plain");
  let result = 0.0;
  let power = 0.5;
  for (let i = 1; i <= n; i++) {
    power *= 2;
    result += 1 / power;

    if (i < n) {
      i++;
      power *= 2;
      result -= 1 / power;
    }
  }
  res.send(result.toString());
}

/**
 * Middleware that compresses the current response body if supported and if long enough to be
 * worthwhile.
 */
function compressIfLong(req, res) {
  if (req.acceptsEncodings("gzip") && res.body?.length > 256) {
    zlib.gzip(
      res.body,
      {
        level: GZIP_COMPRESSION_LEVEL,
      },
      (err, compressedResult) => {
        if (err !== null) {
          console.error(`Failed to compress: ${err}`);
          res.send(res.body);
        } else {
          res.set("Content-Encoding", "gzip");
          res.send(compressedResult);
        }
      }
    );
  } else if (res.body) {
    res.send(res.body);
  }
}

const COMPRESSIBLE_MIME_TYPES = [
  'application/json',
  'application/ld+json',
  'application/xml',
  'image/svg+xml',
];

/**
 * File serving middleware that serves a precompressed file if present and if supported by the
 * request, else defers to the next handler.
 */
async function usePrecompressedIfPresent(req, res, next) {
  // Avoid potentially unsafe URLs.
  if (req.url.includes("..")) {
    return res.status(404).end();
  }

  const ext = path.extname(req.url);
  const resType = mime.getType(ext);
  if (
    req.acceptsEncodings("br") &&
    (resType.startsWith("text/") ||
      COMPRESSIBLE_MIME_TYPES.some(v => v === resType))
  ) {
    const compressedLocalPath = "./static" + req.url + ".br";
    try {
      const compressed = await fs.readFile(compressedLocalPath);
      res.set("Content-Encoding", "br");
      res.type(resType);
      // Send the precompressed file without calling other handlers.
      return res.send(compressed);
    } catch {
      // Ignore the error; this likely means the precompressed file didn't exist.
    }
  }

  next();
}

const app = express();
const port = getPort();

app.get("/strings/hello", helloHandler, compressIfLong);
app.get("/strings/async-hello", asyncHelloHandler, compressIfLong);
app.get("/strings/lines", linesHandler, compressIfLong);
app.get("/math/power-reciprocals-alt", powerReciprocalsAltHandler);
app.use(
  "/static",
  usePrecompressedIfPresent,
  express.static("static", {
    index: false,
    redirect: false,
  })
);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
