import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "node-html-parser";
import { taskHandler } from "../task-handler.js";

test("commits-info process skips 404 page without .page_edit_url", async () => {
  const html = parse(`
    <!doctype html>
    <html lang="en">
      <head><title>404 Not Found</title></head>
      <body>
        <main class="md-main">
          <h1>404 - 页面未找到</h1>
          <p><a href="/">返回首页</a></p>
        </main>
      </body>
    </html>
  `);

  await taskHandler.process(html);

  assert.equal(html.querySelector("html")?.getAttribute("lang"), "zh-Hans");
  assert.equal(html.querySelector(".page_edit_url"), null);
});

test("commits-info handles document without html tag gracefully", async () => {
  const html = parse(`<div><p>Fragment without html tag</p></div>`);
  await assert.doesNotReject(async () => {
    await taskHandler.process(html);
  });
});

test("commits-info handles page with .page_edit_url without ref (pages without source)", async () => {
  const html = parse(`
    <!doctype html>
    <html>
      <head><title>Test</title></head>
      <body>
        <a class="page_edit_url" href="#">Edit</a>
        <a class="edit_history">History</a>
        <span class="facts_modified">old</span>
        <span class="page_contributors">old</span>
      </body>
    </html>
  `);

  await taskHandler.process(html);

  assert.equal(html.querySelector(".facts_modified")?.textContent, "无更新");
  assert.equal(html.querySelector(".page_contributors")?.textContent, "（自动生成）");
  assert.equal(html.querySelector(".page_edit_url")?.getAttribute("href"), "#");
  assert.ok(html.querySelector(".edit_history")?.getAttribute("href")?.includes("commits/main"));
});

test("commits-info handles page with .page_edit_url but missing other elements without crashing", async () => {
  const html = parse(`
    <!doctype html>
    <html>
      <body>
        <a class="page_edit_url" href="#">Edit</a>
      </body>
    </html>
  `);

  await assert.doesNotReject(async () => {
    await taskHandler.process(html);
  });
  assert.equal(html.querySelector(".page_edit_url")?.getAttribute("href"), "#");
});
