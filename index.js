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

function helloHandler(req, res) {
  res.type("text/plain");

  if (req.query.name?.length > 0) {
    if (req.query.name.length > MAX_NAME_LENGTH) {
      return res.status(400).end();
    }
    const result = `Hello, ${req.query.name}!`;

    // Compress the response if it's long and supported.
    if (req.acceptsEncodings("br") && result.length > 256) {
      zlib.brotliCompress(
        result,
        {
          params: {
            [BROTLI_PARAM_MODE]: BROTLI_MODE_TEXT,
          },
        },
        (err, compressedResult) => {
          if (err !== null) {
            console.error(`Failed to compress: ${err}`);
            res.send(result);
          } else {
            res.set("Content-Encoding", "br");
            res.send(compressedResult);
          }
        }
      );
      return;
    }

    res.send(result);
    return;
  }

  res.send("Hello, world!");
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

app.get("/hello", helloHandler);
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
