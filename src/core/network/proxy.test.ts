import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveProxySettings,
  saveProxyConfiguration,
  shouldBypassProxy,
  validateProxyUrl,
} from "./proxy.js";

test("代理配置优先使用配置文件，否则读取标准环境变量", () => {
  const settings = resolveProxySettings(
    new Map([
      ["HTTPS_PROXY", "http://from-file:7890"],
      ["NO_PROXY", "localhost,127.0.0.1"],
    ]),
    {
      http_proxy: "http://from-lowercase:8080",
      HTTP_PROXY: "http://from-uppercase:8080",
      HTTPS_PROXY: "http://from-env:8080",
      ALL_PROXY: "http://all:1080",
    },
  );

  assert.equal(settings.httpProxy, "http://from-lowercase:8080");
  assert.equal(settings.httpsProxy, "http://from-file:7890");
  assert.equal(settings.allProxy, "http://all:1080");
  assert.equal(settings.noProxy, "localhost,127.0.0.1");
});

test("HTTPS 代理缺失时回退到 HTTP 或 ALL 代理", () => {
  assert.equal(
    resolveProxySettings(new Map(), {
      HTTP_PROXY: "http://http-proxy:8080",
    }).httpsProxy,
    "http://http-proxy:8080",
  );
  assert.equal(
    resolveProxySettings(new Map(), {
      ALL_PROXY: "http://all-proxy:1080",
    }).httpsProxy,
    "http://all-proxy:1080",
  );
});

test("本地保存的 ALL_PROXY 优先于环境代理", () => {
  const settings = resolveProxySettings(
    new Map([["ALL_PROXY", "http://saved-all:1080"]]),
    {
      HTTP_PROXY: "http://environment-http:8080",
      HTTPS_PROXY: "http://environment-https:8080",
    },
  );

  assert.equal(settings.httpProxy, "http://saved-all:1080");
  assert.equal(settings.httpsProxy, "http://saved-all:1080");
});

test("NO_PROXY 支持域名、端口和通配符", () => {
  assert.equal(
    shouldBypassProxy(new URL("https://api.example.com/v1"), "example.com"),
    true,
  );
  assert.equal(
    shouldBypassProxy(new URL("https://api.example.com/v1"), ".example.com"),
    true,
  );
  assert.equal(
    shouldBypassProxy(new URL("https://api.example.com/v1"), "example.com:443"),
    true,
  );
  assert.equal(
    shouldBypassProxy(new URL("https://api.example.com/v1"), "example.com:80"),
    false,
  );
  assert.equal(
    shouldBypassProxy(new URL("https://api.example.com/v1"), "localhost"),
    false,
  );
  assert.equal(
    shouldBypassProxy(new URL("https://api.example.com/v1"), "*"),
    true,
  );
});

test("代理地址只接受 HTTP 或 HTTPS", () => {
  assert.equal(validateProxyUrl("http://127.0.0.1:7890"), true);
  assert.equal(validateProxyUrl("https://proxy.example.com:8443"), true);
  assert.equal(validateProxyUrl("socks5://127.0.0.1:1080"), false);
  assert.equal(validateProxyUrl(""), true);
});

test("保存代理配置时保留当前模型并清除旧的非支持配置", () => {
  const directory = mkdtempSync(join(tmpdir(), "aic-proxy-"));
  const configPath = join(directory, ".env");
  writeFileSync(
    configPath,
    "AIC_API_KEY=key\nAIC_BASE_URL=https://api.example.com/v1\nAIC_MODEL=old-model\nHTTPS_PROXY=http://old-proxy:8080\nDEEPSEEK_API_KEY=old-key\n",
    "utf8",
  );

  saveProxyConfiguration(
    { HTTPS_PROXY: "http://new-proxy:7890" },
    configPath,
  );

  assert.equal(
    readFileSync(configPath, "utf8"),
    "AIC_API_KEY=key\nAIC_BASE_URL=https://api.example.com/v1\nAIC_MODEL=old-model\nHTTPS_PROXY=http://new-proxy:7890\n",
  );
});
