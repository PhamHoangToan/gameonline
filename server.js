"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");
var os = require("os");
var WebSocket = require("ws");

var PORT = process.env.PORT || 3000;
var PUBLIC_DIR = __dirname;

var MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".ico": "image/x-icon",
  ".json": "application/json"
};

var server = http.createServer(function (req, res) {
  var urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";

  var filePath = path.join(PUBLIC_DIR, path.normalize(decodeURIComponent(urlPath)));
  if (filePath.indexOf(PUBLIC_DIR) !== 0) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Khong tim thay file");
      return;
    }
    var ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

var wss = new WebSocket.Server({ server: server, path: "/ws" });
var lastState = null;

wss.on("connection", function (ws) {
  if (lastState) {
    ws.send(JSON.stringify({ type: "state", state: lastState }));
  }

  ws.on("message", function (raw) {
    var msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }

    if (msg.type === "cmd") {
      broadcast({ type: "cmd", action: msg.action }, ws);
    } else if (msg.type === "state") {
      lastState = msg.state;
      broadcast({ type: "state", state: msg.state }, ws);
    }
  });
});

function broadcast(data, sender) {
  var json = JSON.stringify(data);
  wss.clients.forEach(function (client) {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

server.listen(PORT, function () {
  console.log("");
  console.log("Ai La Trieu Phu - server dong bo dang chay");
  console.log("----------------------------------------------------");
  console.log("Man hinh hien thi (mo tren LAPTOP):");
  console.log("  http://localhost:" + PORT + "/");
  console.log("");
  console.log("Dieu khien (mo tren DIEN THOAI, cung mang Wi-Fi):");

  var nets = os.networkInterfaces();
  var found = false;
  Object.keys(nets).forEach(function (name) {
    nets[name].forEach(function (net) {
      if (net.family === "IPv4" && !net.internal) {
        found = true;
        console.log("  http://" + net.address + ":" + PORT + "/remote.html");
      }
    });
  });
  if (!found) {
    console.log("  (khong tim thay dia chi IP mang LAN, kiem tra ket noi Wi-Fi)");
  }
  console.log("----------------------------------------------------");
  console.log("Nhan Ctrl+C de dung server.");
  console.log("");
});
