import { promises as fs } from "fs";
import { spawn } from "child_process";
import { basename, isAbsolute, relative, resolve, sep } from "path";
import type { ToolDefinition } from "../ai/openClawClient.js";

const MAX_FIND_RESULTS = 200;
const MAX_SEARCH_RESULTS = 100;
const MAX_FILES_TO_SCAN = 5000;
const MAX_READ_CHARS = 100_000;
const MAX_SEARCH_FILE_BYTES = 2_000_000;
const MAX_COMMAND_OUTPUT_CHARS = 12_000;
const DEFAULT_COMMAND_TIMEOUT_MS = 10_000;
const MAX_COMMAND_TIMEOUT_MS = 30_000;

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".codegraph",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "out",
  ".next",
  "target",
]);

const BLOCKED_COMMANDS = new Set([
  "bash",
  "cmd",
  "cmd.exe",
  "command",
  "fish",
  "powershell",
  "powershell.exe",
  "pwsh",
  "pwsh.exe",
  "sh",
  "zsh",
]);

export const READ_ONLY_TOOL_NAMES = [
  "find_files",
  "read_file",
  "search_text",
] as const;

export const ACTION_TOOL_NAMES = ["run_command", "edit_file"] as const;

export type LocalToolName =
  | (typeof READ_ONLY_TOOL_NAMES)[number]
  | (typeof ACTION_TOOL_NAMES)[number];

export interface ToolExecutionResult {
  content: string;
  isError?: boolean;
}

interface ToolInput {
  [key: string]: unknown;
}

interface SafePath {
  absolute: string;
  relative: string;
}

interface WalkResult {
  files: string[];
  truncated: boolean;
}

function isRecord(value: unknown): value is ToolInput {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asInput(value: unknown): ToolInput {
  if (!isRecord(value)) {
    throw new Error("工具参数必须是 JSON 对象");
  }
  return value;
}

function requiredString(input: ToolInput, key: string, maxLength: number): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} 必须是非空字符串`);
  }
  if (value.length > maxLength) {
    throw new Error(`${key} 过长`);
  }
  return value.trim();
}

function optionalString(
  input: ToolInput,
  key: string,
  defaultValue: string,
  maxLength: number,
): string {
  const value = input[key];
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(`${key} 必须是长度不超过 ${maxLength} 的字符串`);
  }
  return value.trim() || defaultValue;
}

function boundedInteger(
  input: ToolInput,
  key: string,
  defaultValue: number,
  min: number,
  max: number,
): number {
  const value = input[key];
  if (value === undefined) {
    return defaultValue;
  }
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(`${key} 必须是 ${min}-${max} 之间的整数`);
  }
  return value;
}

function normalizeRelativePath(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  return normalized || ".";
}

function isWithinRoot(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === "" || (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

function isSensitivePath(root: string, target: string): boolean {
  const relativePath = relative(root, target).replaceAll("\\", "/");
  const parts = relativePath.split("/").filter(Boolean);

  return parts.some((part) => {
    const lower = part.toLowerCase();
    if (lower === ".env.example") {
      return false;
    }
    if (
      lower === ".env" ||
      lower.startsWith(".env.") ||
      lower === ".npmrc" ||
      lower === "id_rsa" ||
      lower === "id_ed25519" ||
      /\.(pem|key|p12|pfx)$/i.test(lower)
    ) {
      return true;
    }
    return /(^|[-_.])(secret|secrets|credential|credentials|password|token)([-_.]|$)/i.test(
      part,
    );
  });
}

async function resolveRoot(rootDir: string): Promise<string> {
  const root = await fs.realpath(resolve(rootDir));
  const stat = await fs.stat(root);
  if (!stat.isDirectory()) {
    throw new Error("项目目录不是有效目录");
  }
  return root;
}

async function resolveExistingPath(rootDir: string, inputPath: string): Promise<SafePath> {
  const root = await resolveRoot(rootDir);
  const candidate = resolve(root, inputPath || ".");

  if (!isWithinRoot(root, candidate)) {
    throw new Error("路径必须位于项目目录内");
  }

  let absolute: string;
  try {
    absolute = await fs.realpath(candidate);
  } catch {
    throw new Error(`找不到路径: ${normalizeRelativePath(inputPath)}`);
  }

  if (!isWithinRoot(root, absolute)) {
    throw new Error("路径不能通过符号链接离开项目目录");
  }

  const relativePath = normalizeRelativePath(relative(root, absolute));
  const restrictedPart = relativePath
    .split("/")
    .find((part) => IGNORED_DIRECTORIES.has(part.toLowerCase()));
  if (restrictedPart) {
    throw new Error(`不能访问受限目录: ${restrictedPart}`);
  }
  return { absolute, relative: relativePath };
}

async function resolveFilePath(rootDir: string, inputPath: string): Promise<SafePath> {
  const path = await resolveExistingPath(rootDir, inputPath);
  const stat = await fs.stat(path.absolute);
  if (!stat.isFile()) {
    throw new Error(`${path.relative} 不是文件`);
  }
  if (isSensitivePath(await resolveRoot(rootDir), path.absolute)) {
    throw new Error("出于安全原因，不能读取该敏感文件");
  }
  return path;
}

function ensureNoControlCharacters(value: string, field: string): void {
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error(`${field} 不能包含控制字符`);
  }
}

async function walkFiles(rootDir: string, inputPath: string): Promise<WalkResult> {
  const root = await resolveRoot(rootDir);
  const base = await resolveExistingPath(root, inputPath || ".");
  const baseStat = await fs.stat(base.absolute);
  const files: string[] = [];
  let truncated = false;

  if (baseStat.isFile()) {
    if (!isSensitivePath(root, base.absolute)) {
      files.push(base.absolute);
    }
    return { files, truncated: false };
  }

  if (!baseStat.isDirectory()) {
    throw new Error(`${base.relative} 不是文件或目录`);
  }

  const pending = [base.absolute];

  while (pending.length > 0) {
    const current = pending.pop()!;
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }

      const fullPath = resolve(current, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name.toLowerCase())) {
          continue;
        }
        pending.push(fullPath);
        continue;
      }

      if (!entry.isFile() || isSensitivePath(root, fullPath)) {
        continue;
      }

      files.push(fullPath);
      if (files.length >= MAX_FILES_TO_SCAN) {
        truncated = true;
        return { files, truncated };
      }
    }
  }

  return { files, truncated };
}

function globToRegExp(pattern: string): RegExp {
  const normalized = normalizeRelativePath(pattern);
  let expression = "^";

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (char === "*") {
      if (normalized[i + 1] === "*") {
        i++;
        if (normalized[i + 1] === "/") {
          i++;
          expression += "(?:.*/)?";
        } else {
          expression += ".*";
        }
      } else {
        expression += "[^/]*";
      }
      continue;
    }

    if (char === "?") {
      expression += "[^/]";
      continue;
    }

    expression += /[\\^$+?.()|{}[\]]/.test(char) ? `\\${char}` : char;
  }

  return new RegExp(`${expression}$`, process.platform === "win32" ? "i" : "");
}

function relativeFilePath(root: string, filePath: string): string {
  return normalizeRelativePath(relative(root, filePath));
}

async function findFiles(rootDir: string, rawInput: unknown): Promise<string> {
  const input = asInput(rawInput);
  const pattern = optionalString(input, "pattern", "**/*", 300);
  const path = optionalString(input, "path", ".", 400);
  const maxResults = boundedInteger(input, "maxResults", 50, 1, MAX_FIND_RESULTS);
  const matcher = globToRegExp(pattern);
  const root = await resolveRoot(rootDir);
  const walked = await walkFiles(root, path);
  const matches: string[] = [];

  for (const file of walked.files) {
    const relativePath = relativeFilePath(root, file);
    if (
      (matcher.test(relativePath) ||
        (!pattern.includes("/") && matcher.test(basename(relativePath)))) &&
      matches.length < maxResults
    ) {
      matches.push(relativePath);
    }
  }

  return JSON.stringify({
    pattern,
    path: normalizeRelativePath(path),
    matches,
    truncated: walked.truncated || matches.length >= maxResults,
  });
}

async function readAtMost(filePath: string, maxBytes: number): Promise<Buffer> {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(maxBytes);
    const result = await handle.read(buffer, 0, maxBytes, 0);
    return buffer.subarray(0, result.bytesRead);
  } finally {
    await handle.close();
  }
}

function decodeText(buffer: Buffer, relativePath: string): string {
  if (buffer.includes(0)) {
    throw new Error(`${relativePath} 看起来不是 UTF-8 文本文件`);
  }
  return buffer.toString("utf8");
}

async function readFileTool(rootDir: string, rawInput: unknown): Promise<string> {
  const input = asInput(rawInput);
  const requestedPath = requiredString(input, "path", 400);
  const maxChars = boundedInteger(input, "maxChars", 20_000, 1, MAX_READ_CHARS);
  const file = await resolveFilePath(rootDir, requestedPath);
  const stat = await fs.stat(file.absolute);
  const buffer = await readAtMost(file.absolute, Math.min(stat.size, maxChars * 4 + 4));
  const text = decodeText(buffer, file.relative);
  const truncated = stat.size > buffer.length || text.length > maxChars;

  return JSON.stringify({
    path: file.relative,
    content: text.slice(0, maxChars),
    truncated,
  });
}

function compileSearchRegExp(pattern: string, flags: string): RegExp {
  if (!pattern) {
    throw new Error("pattern 不能为空，search_text 需要正则表达式");
  }
  if (!/^[imsu]*$/.test(flags) || new Set(flags).size !== flags.length) {
    throw new Error("flags 只支持 i、m、s、u，且不能重复");
  }
  try {
    return new RegExp(pattern, flags);
  } catch (error) {
    throw new Error(`无效的正则表达式: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function searchText(rootDir: string, rawInput: unknown): Promise<string> {
  const input = asInput(rawInput);
  const pattern = requiredString(input, "pattern", 500);
  const flags = optionalString(input, "flags", "", 10);
  const path = optionalString(input, "path", ".", 400);
  const maxResults = boundedInteger(input, "maxResults", 50, 1, MAX_SEARCH_RESULTS);
  const expression = compileSearchRegExp(pattern, flags);
  const root = await resolveRoot(rootDir);
  const walked = await walkFiles(root, path);
  const matches: Array<{ path: string; line: number; text: string }> = [];

  for (const filePath of walked.files) {
    if (matches.length >= maxResults) {
      break;
    }

    const stat = await fs.stat(filePath);
    if (stat.size > MAX_SEARCH_FILE_BYTES) {
      continue;
    }

    const content = decodeText(await fs.readFile(filePath), relativeFilePath(root, filePath));
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index++) {
      if (!expression.test(lines[index].slice(0, 10_000))) {
        continue;
      }

      matches.push({
        path: relativeFilePath(root, filePath),
        line: index + 1,
        text: lines[index].slice(0, 500),
      });

      if (matches.length >= maxResults) {
        break;
      }
    }
  }

  return JSON.stringify({
    pattern,
    flags,
    path: normalizeRelativePath(path),
    matches,
    truncated: walked.truncated || matches.length >= maxResults,
  });
}

function parseSimpleCommandLine(value: string): string[] {
  ensureNoControlCharacters(value, "command");
  if (/[;&|<>`$]/.test(value)) {
    throw new Error("command 不支持管道、重定向、变量展开或命令连接符");
  }

  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;

  const commandText = value.trim();
  for (let index = 0; index < commandText.length; index++) {
    const char = commandText[index];
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\" && quote !== "'") {
      const next = commandText[index + 1];
      if (next === undefined) {
        current += "\\";
        continue;
      }
      if (next === '"' || next === "\\" || /\s/.test(next)) {
        escaped = true;
        continue;
      }
      current += "\\";
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
    } else if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (escaped || quote) {
    throw new Error("command 包含未闭合的引号或转义符");
  }
  if (current) {
    tokens.push(current);
  }
  if (tokens.length === 0) {
    throw new Error("command 不能为空");
  }
  return tokens;
}

function appendOutput(current: string, chunk: Buffer): string {
  if (current.length >= MAX_COMMAND_OUTPUT_CHARS) {
    return current;
  }
  return `${current}${chunk.toString("utf8")}`.slice(0, MAX_COMMAND_OUTPUT_CHARS);
}

function safeChildEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !/(API_KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i.test(key),
    ),
  );
}

async function runCommand(rootDir: string, rawInput: unknown): Promise<string> {
  const input = asInput(rawInput);
  const commandValue = requiredString(input, "command", 1_000);
  const rawArgs = input.args;
  const hasExplicitArgs = rawArgs !== undefined;
  let command: string;
  let args: string[];

  if (hasExplicitArgs) {
    if (
      !Array.isArray(rawArgs) ||
      rawArgs.length > 32 ||
      rawArgs.some((arg) => typeof arg !== "string" || arg.length > 500)
    ) {
      throw new Error("args 必须是不超过 32 项的字符串数组");
    }
    ensureNoControlCharacters(commandValue, "command");
    command = commandValue;
    args = rawArgs as string[];
  } else {
    const parsed = parseSimpleCommandLine(commandValue);
    command = parsed[0];
    args = parsed.slice(1);
  }

  const executableName = basename(command.replaceAll("\\", "/")).toLowerCase();
  if (BLOCKED_COMMANDS.has(executableName)) {
    throw new Error("出于安全原因，run_command 不允许直接启动 shell");
  }
  for (const arg of args) {
    ensureNoControlCharacters(arg, "args");
  }

  const cwdInput = optionalString(input, "cwd", ".", 400);
  const cwd = await resolveExistingPath(rootDir, cwdInput);
  const timeoutMs = boundedInteger(
    input,
    "timeoutMs",
    DEFAULT_COMMAND_TIMEOUT_MS,
    100,
    MAX_COMMAND_TIMEOUT_MS,
  );

  const result = await new Promise<{
    exitCode: number | null;
    stdout: string;
    stderr: string;
    timedOut: boolean;
  }>((resolveResult, reject) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const child = spawn(command, args, {
      cwd: cwd.absolute,
      env: safeChildEnv(),
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const finish = (value: {
      exitCode: number | null;
      stdout: string;
      stderr: string;
      timedOut: boolean;
    }) => {
      if (settled) return;
      settled = true;
      resolveResult(value);
    };

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr = appendOutput(stderr, chunk);
    });
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
    child.once("close", (code) => {
      finish({ exitCode: code, stdout, stderr, timedOut });
    });

    const timeout = setTimeout(() => {
      if (settled) return;
      timedOut = true;
      child.kill();
    }, timeoutMs);

    const clearTimeoutIfFinished = () => clearTimeout(timeout);
    child.once("close", clearTimeoutIfFinished);
    child.once("error", clearTimeoutIfFinished);
  });

  return JSON.stringify({
    command,
    args,
    cwd: cwd.relative,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    success: result.exitCode === 0 && !result.timedOut,
    stdout: result.stdout,
    stderr: result.stderr,
  });
}

function splitPatchLines(text: string): string[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

function samePatchPath(expected: string, actual: string): boolean {
  const normalize = (value: string) => normalizeRelativePath(value.replace(/^[ab]\//, ""));
  return normalize(expected) === normalize(actual);
}

interface PatchHunk {
  oldStart: number | null;
  lines: string[];
}

function parsePatch(patch: string, expectedPath: string): PatchHunk[] {
  ensureNoControlCharacters(patch.replace(/\r?\n/g, ""), "patch");
  let text = patch.trim();
  const fence = text.match(/^```(?:diff|patch)?\s*\n([\s\S]*?)\n```$/i);
  if (fence) {
    text = fence[1];
  }

  let lines = splitPatchLines(text);
  if (lines[0] === "*** Begin Patch") {
    const endIndex = lines.indexOf("*** End Patch");
    if (endIndex < 0) {
      throw new Error("补丁缺少 *** End Patch");
    }
    const updateLines = lines.filter(
      (_, index) => index > 0 && index < endIndex,
    );
    const updateFile = updateLines.find((line) => line.startsWith("*** Update File: "));
    if (!updateFile || !samePatchPath(expectedPath, updateFile.slice(16).trim())) {
      throw new Error("补丁目标文件与 path 不一致，或补丁包含多个文件");
    }
    lines = updateLines.filter((line) => !line.startsWith("*** Update File: "));
  } else {
    const plusHeader = lines.find((line) => line.startsWith("+++ "));
    const minusHeader = lines.find((line) => line.startsWith("--- "));
    if (plusHeader && minusHeader) {
      if (!samePatchPath(expectedPath, plusHeader.slice(4).split("\t")[0].trim())) {
        throw new Error("标准补丁目标文件与 path 不一致");
      }
      lines = lines.filter((line) => !line.startsWith("--- ") && !line.startsWith("+++ "));
    }
  }

  const hunks: PatchHunk[] = [];
  let current: PatchHunk | null = null;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      if (current) hunks.push(current);
      const header = line === "@@"
        ? null
        : line.match(/^@@(?: -(\d+)(?:,(\d+))?)?(?: \+(\d+)(?:,(\d+))?)? @@/);
      if (line !== "@@" && !header) {
        throw new Error(`无法解析补丁块: ${line}`);
      }
      current = {
        oldStart: header?.[1] ? Number(header[1]) : null,
        lines: [],
      };
      continue;
    }

    if (line === "\\ No newline at end of file") {
      continue;
    }
    if (line === "*** End of File") {
      continue;
    }
    if (!current) {
      if (line.trim() === "") continue;
      throw new Error("补丁缺少 @@ 块头");
    }
    if (!line.startsWith(" ") && !line.startsWith("+") && !line.startsWith("-")) {
      throw new Error(`补丁包含无法识别的行: ${line}`);
    }
    current.lines.push(line);
  }

  if (current) hunks.push(current);
  if (hunks.length === 0) {
    throw new Error("补丁没有可应用的修改块");
  }
  return hunks;
}

function applyPatch(original: string, patch: string, expectedPath: string): string {
  const originalHadNewline = /(?:\r?\n)$/.test(original);
  const originalLines = splitPatchLines(original);
  const hunks = parsePatch(patch, expectedPath);
  const output: string[] = [];
  let cursor = 0;

  for (const hunk of hunks) {
    const oldLines = hunk.lines
      .filter((line) => !line.startsWith("+"))
      .map((line) => line.slice(1));
    const newLines = hunk.lines
      .filter((line) => !line.startsWith("-"))
      .map((line) => line.slice(1));
    let start = hunk.oldStart === null ? -1 : Math.max(0, hunk.oldStart - 1);

    if (start < 0) {
      if (oldLines.length === 0) {
        start = cursor;
      }
    }

    if (start < 0) {
      start = -1;
      for (let index = cursor; index <= originalLines.length - oldLines.length; index++) {
        if (oldLines.every((line, offset) => originalLines[index + offset] === line)) {
          if (start >= 0) {
            throw new Error("补丁上下文匹配不唯一，请提供带行号的标准补丁");
          }
          start = index;
        }
      }
      if (start < 0) {
        throw new Error("补丁上下文与当前文件不匹配");
      }
    }

    if (start < cursor || oldLines.some((line, offset) => originalLines[start + offset] !== line)) {
      throw new Error("补丁上下文与当前文件不匹配");
    }

    output.push(...originalLines.slice(cursor, start), ...newLines);
    cursor = start + oldLines.length;
  }

  output.push(...originalLines.slice(cursor));
  const updated = output.join("\n") + (originalHadNewline ? "\n" : "");
  if (updated === original) {
    throw new Error("补丁未产生文件变化");
  }
  return updated;
}

async function editFile(rootDir: string, rawInput: unknown): Promise<string> {
  const input = asInput(rawInput);
  const requestedPath = requiredString(input, "path", 400);
  const patch = requiredString(input, "patch", 100_000);
  const file = await resolveFilePath(rootDir, requestedPath);
  const original = (await fs.readFile(file.absolute)).toString("utf8");
  if (original.includes("\u0000")) {
    throw new Error(`${file.relative} 不是可编辑的文本文件`);
  }

  const updated = applyPatch(original, patch, file.relative);
  await fs.writeFile(file.absolute, updated, "utf8");

  return JSON.stringify({ path: file.relative, changed: true });
}

function toolParameters(
  properties: Record<string, unknown>,
  required: string[] = [],
): Record<string, unknown> {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

export function getToolDefinitions(allowActions: boolean): ToolDefinition[] {
  const definitions: ToolDefinition[] = [
    {
      type: "function",
      function: {
        name: "find_files",
        description:
          "在当前项目目录内按 glob 查找文件。默认忽略 .git、node_modules、dist、build 等目录，不读取敏感文件。",
        parameters: toolParameters({
          pattern: { type: "string", description: "glob 模式，例如 **/*.ts 或 package.json" },
          path: { type: "string", description: "搜索起点，相对项目目录，默认 ." },
          maxResults: { type: "integer", minimum: 1, maximum: MAX_FIND_RESULTS },
        }),
      },
    },
    {
      type: "function",
      function: {
        name: "read_file",
        description:
          "读取项目内一个 UTF-8 文本文件。path 必须是相对项目目录的路径，不能读取密钥、环境变量等敏感文件。",
        parameters: toolParameters(
          {
            path: { type: "string", description: "相对项目目录的文件路径" },
            maxChars: { type: "integer", minimum: 1, maximum: MAX_READ_CHARS },
          },
          ["path"],
        ),
      },
    },
    {
      type: "function",
      function: {
        name: "search_text",
        description:
          "在项目文本文件中逐行执行 JavaScript 正则表达式搜索。pattern 必须是正则表达式，不支持模糊或普通字符串搜索。",
        parameters: toolParameters(
          {
            pattern: { type: "string", description: "必填正则表达式" },
            flags: { type: "string", description: "可选 flags，仅支持 i、m、s、u" },
            path: { type: "string", description: "搜索起点，相对项目目录，默认 ." },
            maxResults: { type: "integer", minimum: 1, maximum: MAX_SEARCH_RESULTS },
          },
          ["pattern"],
        ),
      },
    },
  ];

  if (allowActions) {
    definitions.push(
      {
        type: "function",
        function: {
          name: "run_command",
          description:
            "执行一个简单的本地命令。必须使用 command + args 或一个简单的带引号命令字符串；不支持 shell、管道、重定向、命令连接和变量展开。执行前会要求用户确认。",
          parameters: toolParameters({
            command: { type: "string", description: "可执行文件名，或简单命令字符串" },
            args: {
              type: "array",
              items: { type: "string" },
              maxItems: 32,
              description: "命令参数；填写后 command 只能是可执行文件名",
            },
            cwd: { type: "string", description: "项目内工作目录，默认 ." },
            timeoutMs: { type: "integer", minimum: 100, maximum: MAX_COMMAND_TIMEOUT_MS },
          }),
        },
      },
      {
        type: "function",
        function: {
          name: "edit_file",
          description:
            "使用 unified diff 或 apply_patch 风格补丁修改项目内一个文本文件。只接受 patch，不接受整文件覆盖；执行前会要求用户确认。",
          parameters: toolParameters(
            {
              path: { type: "string", description: "相对项目目录的文件路径" },
              patch: { type: "string", description: "只包含一个文件修改的补丁" },
            },
            ["path", "patch"],
          ),
        },
      },
    );
  }

  return definitions;
}

export async function executeLocalTool(
  name: string,
  rawInput: unknown,
  rootDir: string = process.cwd(),
): Promise<ToolExecutionResult> {
  try {
    let content: string;
    switch (name as LocalToolName) {
      case "find_files":
        content = await findFiles(rootDir, rawInput);
        break;
      case "read_file":
        content = await readFileTool(rootDir, rawInput);
        break;
      case "search_text":
        content = await searchText(rootDir, rawInput);
        break;
      case "run_command":
        content = await runCommand(rootDir, rawInput);
        break;
      case "edit_file":
        content = await editFile(rootDir, rawInput);
        break;
      default:
        throw new Error(`未知工具: ${name}`);
    }
    return { content };
  } catch (error) {
    return {
      content: error instanceof Error ? error.message : String(error),
      isError: true,
    };
  }
}
