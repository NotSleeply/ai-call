import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getReasoningCapability,
  REASONING_CAPABILITY_TTL_MS,
  resolveReasoningCapabilitiesPath,
  setReasoningCapability,
} from "./reasoningCapabilities.js";

test("推理能力缓存按模型和地址隔离，并且不保存 API Key", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "aic-capabilities-test-"));
  const cachePath = join(rootDir, "data", "reasoning-capabilities.json");

  try {
    setReasoningCapability(
      "https://api.example.com/v1/",
      "model-a",
      "rejects-none",
      { cachePath, now: 1_000 },
    );

    assert.equal(
      getReasoningCapability("https://api.example.com/v1", "model-a", {
        cachePath,
        now: 2_000,
      }),
      "rejects-none",
    );
    assert.equal(
      getReasoningCapability("https://api.example.com/v1", "model-b", {
        cachePath,
        now: 2_000,
      }),
      undefined,
    );
    assert.equal(
      getReasoningCapability("https://other.example.com/v1", "model-a", {
        cachePath,
        now: 2_000,
      }),
      undefined,
    );

    const content = readFileSync(cachePath, "utf8");
    assert.match(content, /"model": "model-a"/);
    assert.match(content, /"baseUrl": "https:\/\/api\.example\.com\/v1"/);
    assert.equal(content.includes("sk-secret"), false);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("推理能力缓存超过 30 天后失效", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "aic-capabilities-test-"));
  const cachePath = join(rootDir, "reasoning-capabilities.json");

  try {
    setReasoningCapability(
      "https://api.example.com/v1",
      "model-a",
      "supports-none",
      {
        cachePath,
        now: 1_000,
      },
    );

    assert.equal(
      getReasoningCapability("https://api.example.com/v1", "model-a", {
        cachePath,
        now: 1_000 + REASONING_CAPABILITY_TTL_MS,
      }),
      undefined,
    );
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("损坏的推理能力缓存会忽略并重新建立", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "aic-capabilities-test-"));
  const cachePath = join(rootDir, "reasoning-capabilities.json");

  try {
    writeFileSync(cachePath, "not-json", "utf8");
    assert.equal(
      getReasoningCapability("https://api.example.com/v1", "model-a", {
        cachePath,
        now: 1_000,
      }),
      undefined,
    );

    setReasoningCapability(
      "https://api.example.com/v1",
      "model-a",
      "supports-none",
      { cachePath, now: 1_000 },
    );
    assert.ok(existsSync(cachePath));
    assert.equal(
      getReasoningCapability("https://api.example.com/v1", "model-a", {
        cachePath,
        now: 1_001,
      }),
      "supports-none",
    );
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("推理能力缓存默认位于用户数据目录", () => {
  const previousDataDir = process.env.AI_CALL_DATA_DIR;
  const dataDir = mkdtempSync(join(tmpdir(), "aic-data-test-"));
  process.env.AI_CALL_DATA_DIR = dataDir;

  try {
    assert.equal(
      resolveReasoningCapabilitiesPath(),
      join(dataDir, "reasoning-capabilities.json"),
    );
  } finally {
    if (previousDataDir === undefined) delete process.env.AI_CALL_DATA_DIR;
    else process.env.AI_CALL_DATA_DIR = previousDataDir;
    rmSync(dataDir, { recursive: true, force: true });
  }
});
