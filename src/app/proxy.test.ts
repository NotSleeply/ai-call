import { test } from "node:test";
import assert from "node:assert/strict";
import { maskProxyUrl } from "./proxy.js";

test("显示代理配置时不会暴露代理认证信息", () => {
  const masked = maskProxyUrl("http://proxy-user:proxy-secret@127.0.0.1:7890");

  assert.equal(masked.includes("proxy-secret"), false);
  assert.equal(masked.includes("proxy-user"), false);
  assert.match(masked, /认证信息已隐藏/);
  assert.match(masked, /127\.0\.0\.1:7890/);
});

test("无认证的代理地址保持可读", () => {
  assert.equal(
    maskProxyUrl("http://127.0.0.1:7890"),
    "http://127.0.0.1:7890",
  );
  assert.equal(maskProxyUrl("not-a-proxy"), "（格式无效）");
});
