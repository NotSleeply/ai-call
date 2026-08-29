import { config as loadDotEnv } from "dotenv";
import {
  Agent,
  Dispatcher,
  ProxyAgent,
  setGlobalDispatcher,
} from "undici";
import {
  PROXY_CONFIG_KEYS,
  readConfigValues,
  resolveConfigPath,
  writeConfigValues,
} from "../config.js";

export type ProxyConfigKey = (typeof PROXY_CONFIG_KEYS)[number];

export type ProxyConfigSource = "配置文件" | "环境变量" | "未设置";

export interface ProxyConfigEntry {
  key: ProxyConfigKey;
  value: string;
  source: ProxyConfigSource;
}

export interface ProxyConfiguration {
  configPath: string;
  entries: Record<ProxyConfigKey, ProxyConfigEntry>;
}

export interface ProxySettings {
  httpProxy: string;
  httpsProxy: string;
  allProxy: string;
  noProxy: string;
}

export class ProxyConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProxyConfigurationError";
  }
}

loadDotEnv({
  quiet: true,
  path: [".env", resolveConfigPath()],
});

function readEnvironmentValue(
  key: ProxyConfigKey,
  env: NodeJS.ProcessEnv,
): string {
  const lowercaseValue = env[key.toLowerCase()]?.trim();
  if (lowercaseValue) {
    return lowercaseValue;
  }

  return env[key]?.trim() || "";
}

function readEffectiveValue(
  key: ProxyConfigKey,
  storedValues: ReadonlyMap<string, string>,
  env: NodeJS.ProcessEnv,
): { value: string; source: ProxyConfigSource } {
  const storedValue = storedValues.get(key)?.trim() || "";
  if (storedValue) {
    return { value: storedValue, source: "配置文件" };
  }

  const environmentValue = readEnvironmentValue(key, env);
  if (environmentValue) {
    return { value: environmentValue, source: "环境变量" };
  }

  return { value: "", source: "未设置" };
}

export function readProxyConfiguration(
  env: NodeJS.ProcessEnv = process.env,
  configPath = resolveConfigPath(),
): ProxyConfiguration {
  const storedValues = readConfigValues(configPath);
  const entries = {} as Record<ProxyConfigKey, ProxyConfigEntry>;

  for (const key of PROXY_CONFIG_KEYS) {
    const resolved = readEffectiveValue(key, storedValues, env);
    entries[key] = { key, ...resolved };
  }

  return { configPath, entries };
}

export function resolveProxySettings(
  storedValues: ReadonlyMap<string, string> = readConfigValues(),
  env: NodeJS.ProcessEnv = process.env,
): ProxySettings {
  const storedHttpProxy = storedValues.get("HTTP_PROXY")?.trim() || "";
  const storedHttpsProxy = storedValues.get("HTTPS_PROXY")?.trim() || "";
  const storedAllProxy = storedValues.get("ALL_PROXY")?.trim() || "";
  const environmentHttpProxy = readEnvironmentValue("HTTP_PROXY", env);
  const environmentHttpsProxy = readEnvironmentValue("HTTPS_PROXY", env);
  const environmentAllProxy = readEnvironmentValue("ALL_PROXY", env);
  const httpProxy =
    storedHttpProxy || storedAllProxy || environmentHttpProxy || environmentAllProxy;
  const httpsProxy =
    storedHttpsProxy ||
    storedHttpProxy ||
    storedAllProxy ||
    environmentHttpsProxy ||
    httpProxy;
  const allProxy = storedAllProxy || environmentAllProxy;
  const noProxy =
    storedValues.get("NO_PROXY")?.trim() ||
    readEnvironmentValue("NO_PROXY", env);

  return { httpProxy, httpsProxy, allProxy, noProxy };
}

export function readProxySettings(
  env: NodeJS.ProcessEnv = process.env,
  configPath = resolveConfigPath(),
): ProxySettings {
  return resolveProxySettings(readConfigValues(configPath), env);
}

export function saveProxyConfiguration(
  updates: Partial<Record<ProxyConfigKey, string>>,
  configPath = resolveConfigPath(),
): void {
  const values = readConfigValues(configPath);

  for (const key of PROXY_CONFIG_KEYS) {
    if (!(key in updates)) {
      continue;
    }

    const value = updates[key]?.trim() || "";
    if (value) {
      values.set(key, value);
    } else {
      values.delete(key);
    }
  }

  writeConfigValues(values, configPath);
}

export function validateProxyUrl(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  try {
    const url = new URL(value.trim());
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.length > 0
    );
  } catch {
    return false;
  }
}

function normalizeHostname(value: string): string {
  return value.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
}

function splitNoProxyRule(
  rule: string,
): { hostname: string; port?: number } | undefined {
  let value = rule.trim();
  if (!value) {
    return undefined;
  }

  if (value.startsWith("[")) {
    const closingBracket = value.indexOf("]");
    if (closingBracket < 0) {
      return undefined;
    }

    const hostname = value.slice(0, closingBracket + 1);
    const portText = value.slice(closingBracket + 1);
    if (portText && !/^:\d+$/.test(portText)) {
      return undefined;
    }

    return {
      hostname,
      ...(portText ? { port: Number(portText.slice(1)) } : {}),
    };
  }

  const lastColon = value.lastIndexOf(":");
  if (lastColon > -1 && /^\d+$/.test(value.slice(lastColon + 1))) {
    return {
      hostname: value.slice(0, lastColon),
      port: Number(value.slice(lastColon + 1)),
    };
  }

  return { hostname: value };
}

export function shouldBypassProxy(target: URL, noProxy: string): boolean {
  const targetHostname = normalizeHostname(target.hostname);
  const targetPort = Number(target.port) || (target.protocol === "https:" ? 443 : 80);

  for (const rawRule of noProxy.split(/[,\s]+/)) {
    if (rawRule.trim() === "*") {
      return true;
    }

    const rule = splitNoProxyRule(rawRule);
    if (!rule || (rule.port !== undefined && rule.port !== targetPort)) {
      continue;
    }

    const hostname = normalizeHostname(rule.hostname);
    if (!hostname) {
      continue;
    }

    const suffix = hostname.replace(/^\*\.?/, "").replace(/^\./, "");
    if (
      targetHostname === suffix ||
      targetHostname.endsWith(`.${suffix}`)
    ) {
      return true;
    }
  }

  return false;
}

class ProxyRoutingDispatcher extends Dispatcher {
  private readonly directAgent = new Agent();
  private readonly httpProxyAgent?: ProxyAgent;
  private readonly httpsProxyAgent?: ProxyAgent;
  private readonly noProxy: string;
  private readonly dispatchers: Dispatcher[];

  constructor(settings: ProxySettings) {
    super();
    this.noProxy = settings.noProxy;

    const proxyAgents = new Map<string, ProxyAgent>();
    const createProxyAgent = (
      proxyUrl: string,
      key: string,
    ): ProxyAgent | undefined => {
      if (!proxyUrl) {
        return undefined;
      }
      if (!validateProxyUrl(proxyUrl)) {
        throw new ProxyConfigurationError(
          `${key} 必须是有效的 http:// 或 https:// 代理地址`,
        );
      }

      const existing = proxyAgents.get(proxyUrl);
      if (existing) {
        return existing;
      }

      try {
        const agent = new ProxyAgent(proxyUrl);
        proxyAgents.set(proxyUrl, agent);
        return agent;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new ProxyConfigurationError(`${key} 代理地址无效: ${message}`);
      }
    };

    this.httpProxyAgent = createProxyAgent(settings.httpProxy, "HTTP_PROXY");
    this.httpsProxyAgent = createProxyAgent(
      settings.httpsProxy,
      "HTTPS_PROXY",
    );
    this.dispatchers = [
      this.directAgent,
      ...proxyAgents.values(),
    ];
  }

  dispatch(
    options: Dispatcher.DispatchOptions,
    handler: Dispatcher.DispatchHandlers,
  ): boolean {
    const origin = options.origin;
    if (!origin) {
      return this.directAgent.dispatch(options, handler);
    }

    const target = new URL(String(origin));
    const dispatcher = shouldBypassProxy(target, this.noProxy)
      ? this.directAgent
      : target.protocol === "https:"
        ? this.httpsProxyAgent || this.directAgent
        : this.httpProxyAgent || this.directAgent;

    return dispatcher.dispatch(options, handler);
  }

  close(): Promise<void>;
  close(callback: () => void): void;
  close(callback?: () => void): Promise<void> | void {
    const promise = Promise.all(
      this.dispatchers.map((dispatcher) => dispatcher.close()),
    ).then(() => undefined);

    if (callback) {
      promise.then(() => callback(), () => callback());
      return;
    }

    return promise;
  }

  destroy(): Promise<void>;
  destroy(error: Error | null): Promise<void>;
  destroy(callback: () => void): void;
  destroy(error: Error | null, callback: () => void): void;
  destroy(
    errorOrCallback?: Error | null | (() => void),
    callback?: () => void,
  ): Promise<void> | void {
    const error = typeof errorOrCallback === "function" ? null : errorOrCallback;
    const completionCallback =
      typeof errorOrCallback === "function" ? errorOrCallback : callback;
    const promise = Promise.all(
      this.dispatchers.map((dispatcher) =>
        error === undefined ? dispatcher.destroy() : dispatcher.destroy(error),
      ),
    ).then(() => undefined);

    if (completionCallback) {
      promise.then(() => completionCallback(), () => completionCallback());
      return;
    }

    return promise;
  }
}

function createProxyDispatcher(settings: ProxySettings): Dispatcher | undefined {
  if (!settings.httpProxy && !settings.httpsProxy) {
    return undefined;
  }

  return new ProxyRoutingDispatcher(settings);
}

let configuredSignature = "";
let configuredDispatcher: Dispatcher | undefined;

export function configureProxyDispatcher(): Dispatcher | undefined {
  const settings = readProxySettings();
  const signature = JSON.stringify(settings);
  if (signature === configuredSignature) {
    return configuredDispatcher;
  }

  const dispatcher = createProxyDispatcher(settings);
  setGlobalDispatcher(dispatcher ?? new Agent());
  configuredSignature = signature;
  configuredDispatcher = dispatcher;
  return dispatcher;
}
