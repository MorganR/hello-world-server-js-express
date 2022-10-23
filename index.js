"use strict";
const express = require("express");
const mime = require("mime");
const fs = require("fs/promises");
const path = require("path");

function getPort() {
  const fromEnv = Number.parseInt(process.env.PORT);
  return Number.isNaN(fromEnv) ? 8080 : fromEnv;
}

function helloHandler(req, res) {
  if (req.query.name?.length > 0) {
    res.send(`Hello, ${req.query.name}!`);
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
      res.type(ext);
      return res.send(compressed);
    } catch {
      // Ignore the error, this likely means the precompressed file didn't exist.
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
