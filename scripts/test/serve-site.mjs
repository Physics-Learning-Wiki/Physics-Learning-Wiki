#!/usr/bin/env node

import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";

const SITE_PREFIX = "/Physics-Learning-Wiki/";
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function parseArgs(argv) {
  const options = { site: process.env.SITE_DIR ?? "site", host: "127.0.0.1", port: 4173 };
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === "--site" || option === "--host" || option === "--port") {
      const value = argv[index + 1];
      if (!value) throw new Error(`Missing value for ${option}`);
      options[option.slice(2)] = option === "--port" ? Number(value) : value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${option}`);
    }
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
const siteRoot = path.resolve(options.site);
const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (requestUrl.pathname === SITE_PREFIX.slice(0, -1)) {
    response.writeHead(308, { location: SITE_PREFIX });
    response.end();
    return;
  }
  if (!requestUrl.pathname.startsWith(SITE_PREFIX)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.pathname.slice(SITE_PREFIX.length));
  } catch {
    response.writeHead(400);
    response.end("Bad path");
    return;
  }
  const segments = pathname.split("/").filter(Boolean);
  if (segments.some(segment => segment === "." || segment === "..")) {
    response.writeHead(400);
    response.end("Bad path");
    return;
  }

  let filePath = path.resolve(siteRoot, ...segments);
  if (!filePath.startsWith(`${siteRoot}${path.sep}`) && filePath !== siteRoot) {
    response.writeHead(400);
    response.end("Bad path");
    return;
  }
  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) filePath = path.join(filePath, "index.html");
    else if (pathname.endsWith("/")) filePath = path.join(filePath, "index.html");
  } catch {
    if (!path.extname(filePath)) filePath = path.join(filePath, "index.html");
  }

  let body;
  let status = 200;
  try {
    body = await fs.readFile(filePath);
    if (pathname === "sitemap.xml") {
      body = Buffer.from(body.toString("utf8").replace(/https?:\/\/[^/]+/g, requestUrl.origin));
    }
  } catch {
    status = 404;
    try {
      filePath = path.join(siteRoot, "404.html");
      body = await fs.readFile(filePath);
    } catch {
      body = Buffer.from("Not found", "utf8");
    }
  }
  response.writeHead(status, {
    "content-type": CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "cache-control": "no-cache"
  });
  response.end(body);
});

server.listen(options.port, options.host, () => {
  console.log(`Serving ${siteRoot} at http://${options.host}:${options.port}${SITE_PREFIX}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
