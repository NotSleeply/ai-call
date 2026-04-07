import { pathToFileURL } from "url";
import { extname, resolve } from "path";
import { spawn } from "child_process";
import { SkillRecord } from "./types.js";

interface SkillModule {
  name: string;
  description: string;
  inputs: Record<string, string>;
  output: string;
  shouldAutoInvoke?: (task: string) => boolean;
  handler: (
    context: {
      cwd: string;
      now: string;
      skillId: string;
      log: (message: string) => void;
    },
    task: string,
  ) => Promise<string> | string;
}

interface SkillModuleContainer {
  skill?: SkillModule;
  default?: SkillModule;
}

function toStringResult(result: unknown): string {
  if (typeof result === "string") {
    return result;
  }
  if (result === undefined || result === null) {
    return "Skill 已执行完成。";
  }
  return JSON.stringify(result, null, 2);
}

export class ModuleSkillRunner {
  async run(skill: SkillRecord, task: string): Promise<string> {
    if (!skill.module_entry) {
      throw new Error("模块 Skill 缺少 module_entry 配置");
    }

    const absolutePath = resolve(process.cwd(), skill.module_entry);
    const extension = extname(absolutePath).toLowerCase();

    if (extension === ".py") {
      return this.runPythonSkill(absolutePath, skill, task);
    }

    const loaded = await this.loadSkillModule(absolutePath);

    if (loaded.shouldAutoInvoke && !loaded.shouldAutoInvoke(task)) {
      return "当前输入未命中该 Skill 的触发条件，请调整任务描述后重试。";
    }

    const result = await loaded.handler(
      {
        cwd: process.cwd(),
        now: new Date().toISOString(),
        skillId: skill.id,
        log: (message: string) => {
          console.log(`[Skill:${skill.name}] ${message}`);
        },
      },
      task,
    );

    return toStringResult(result);
  }

  private async loadSkillModule(absolutePath: string): Promise<SkillModule> {
    const moduleUrl = pathToFileURL(absolutePath).href;

    let loaded: SkillModuleContainer;
    try {
      loaded = (await import(moduleUrl)) as SkillModuleContainer;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`加载 Skill 模块失败：${msg}`);
    }

    const candidate = loaded.skill || loaded.default;
    if (!candidate || typeof candidate.handler !== "function") {
      throw new Error("Skill 模块格式错误：缺少 skill.handler");
    }

    return candidate;
  }

  private async runPythonSkill(
    absolutePath: string,
    skill: SkillRecord,
    task: string,
  ): Promise<string> {
    const pythonBins = [
      process.env.PYTHON_BIN,
      "python",
      "python3",
      "py",
    ].filter((item): item is string => Boolean(item));

    let lastError = "";

    for (const bin of pythonBins) {
      try {
        const result = await this.execPython(bin, absolutePath, skill, task);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/ENOENT/i.test(message)) {
          lastError = message;
          continue;
        }
        throw new Error(`Python Skill 执行失败：${message}`);
      }
    }

    throw new Error(
      `未找到可用的 Python 解释器（尝试: ${pythonBins.join(", ")}）。${lastError}`,
    );
  }

  private execPython(
    pythonBin: string,
    absolutePath: string,
    skill: SkillRecord,
    task: string,
  ): Promise<string> {
    return new Promise((resolveResult, reject) => {
      const now = new Date().toISOString();
      const args = [
        absolutePath,
        "--task",
        task,
        "--cwd",
        process.cwd(),
        "--skill-id",
        skill.id,
        "--now",
        now,
      ];

      const child = spawn(pythonBin, args, {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf-8");
      });

      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf-8");
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `命令 ${pythonBin} 退出码 ${code}，stderr: ${stderr.trim() || "(空)"}`,
            ),
          );
          return;
        }

        const output = stdout.trim();
        if (!output) {
          resolveResult("Skill 已执行完成。\n(无输出)");
          return;
        }

        resolveResult(output);
      });
    });
  }
}
