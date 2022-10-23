"use strict";
const express = require("express");

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

const app = express();
const port = getPort();

app.get("/hello", helloHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
