"use strict";
const express = require("express");
const mime = require("mime");
const fs = require("fs/promises");
const path = require("path");
const zlib = require("zlib");
const {
  constants: { BROTLI_PARAM_MODE, BROTLI_MODE_TEXT },
} = require("zlib");

function getPort() {
  const fromEnv = Number.parseInt(process.env.PORT);
  return Number.isNaN(fromEnv) ? 8080 : fromEnv;
}

const MAX_NAME_LENGTH = 500;

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

async function asyncHelloHandler(req, res, next) {
  await new Promise((r) => setTimeout(r, SLEEP_DURATION_MILLIS));
  res.type("text/plain");
  res.body = "Hello, world!";
  next();
}

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

function powerReciprocalsAltHandler(req, res) {
  const n = Number.parseInt(req.query.n);
  res.type("text/plain");
  let result = 0.0;
  let power = 0.5;
  for (let i = 1; i <= n; i++) {
    power = power * 2;
    if (i % 2) {
      result += 1 / power;
    } else {
      result -= 1 / power;
    }
  }
  res.send(result.toString());
}

function compressIfLong(req, res) {
  if (req.acceptsEncodings("br") && res.body?.length > 256) {
    zlib.brotliCompress(
      res.body,
      {
        params: {
          [BROTLI_PARAM_MODE]: BROTLI_MODE_TEXT,
        },
      },
      (err, compressedResult) => {
        if (err !== null) {
          console.error(`Failed to compress: ${err}`);
          res.send(res.body);
        } else {
          res.set("Content-Encoding", "br");
          res.send(compressedResult);
        }
      }
    );
  } else if (res.body) {
    res.send(res.body);
  }
}

async function usePrecompressedIfPresent(req, res, next) {
  if (req.url.includes("..")) {
    return res.status(404).end();
  }

  const ext = path.extname(req.url);
  const resType = mime.getType(ext);
  if (
    req.acceptsEncodings("br") &&
    (resType.startsWith("text/") ||
      resType.startsWith("application/") ||
      resType == "image/svg+xml")
  ) {
    const compressedLocalPath = "./static" + req.url + ".br";
    try {
      const compressed = await fs.readFile(compressedLocalPath);
      res.set("Content-Encoding", "br");
      res.type(resType);
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
