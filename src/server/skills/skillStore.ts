import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  SkillCreateInput,
  SkillRecord,
  SkillRegistry,
  SkillUpdateInput,
} from "./types.js";

const skillsDir = join(process.cwd(), "data", "skills");
const skillRegistryPath = join(skillsDir, "registry.json");

function nowIso(): string {
  return new Date().toISOString();
}

function createDefaultSkills(): SkillCreateInput[] {
  return [
    {
      name: "代码审查",
      description: "聚焦缺陷、风险、回归影响与测试缺口，给出可执行修复建议。",
      prompt: [
        "你是高级代码审查 Agent。",
        "先给高风险问题，再给中低风险问题。",
        "每条问题包含：问题、影响、建议改法。",
        "最后补充测试建议。",
      ].join("\n"),
      mode: "prompt",
      is_default: true,
    },
    {
      name: "需求拆解",
      description: "将需求拆成可执行开发任务，明确边界、依赖和验收标准。",
      prompt: [
        "你是需求拆解 Agent。",
        "输出：目标、范围、任务清单、验收标准、风险与缓解。",
        "任务清单按前端/后端/测试分组。",
      ].join("\n"),
      mode: "prompt",
      is_default: true,
    },
    {
      name: "故障排查",
      description: "用于定位线上/本地故障，输出排查路径与最小修复步骤。",
      prompt: [
        "你是故障排查 Agent。",
        "先给可能根因优先级，再给验证步骤，再给修复步骤。",
        "强调最小改动和回滚方案。",
      ].join("\n"),
      mode: "prompt",
      is_default: true,
    },
    {
      name: "仓库自动备份",
      description:
        "自动将当前项目备份到指定目录（排除 node_modules/.git/dist 等），适合日常快照归档。",
      prompt:
        "这是一个本地模块技能，负责执行仓库备份。你可以在任务里写：备份仓库到 D:/Backups。",
      mode: "module",
      module_entry: "skills/repo-auto-backup.skill.js",
      auto_triggers: [
        "备份仓库",
        "备份代码",
        "自动备份",
        "backup repo",
        "backup project",
      ],
      is_default: true,
    },
    {
      name: "批量文件前缀",
      description:
        "按自然语言指令为指定目录文件批量添加前缀，适合下载目录归档整理。",
      prompt:
        "这是 Python 模块技能，专门处理批量加前缀。任务示例：给 D:/Downloads 的文件加前缀 202604_",
      mode: "module",
      module_entry: "skills/batch-add-file-prefix.skill.py",
      auto_triggers: ["加前缀", "批量前缀", "rename prefix", "batch prefix"],
      is_default: true,
    },
  ];
}

export class SkillStore {
  constructor() {
    this.ensureStorage();
    this.ensureDefaultSkills();
  }

  list(): SkillRecord[] {
    const registry = this.loadRegistry();
    return registry.skills.sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    );
  }

  getById(id: string): SkillRecord | null {
    const registry = this.loadRegistry();
    return registry.skills.find((skill) => skill.id === id) || null;
  }

  findAutoRunnable(userInput: string): SkillRecord | null {
    const normalized = userInput.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const registry = this.loadRegistry();
    return (
      registry.skills.find((skill) => {
        if (skill.mode !== "module" || !skill.module_entry) {
          return false;
        }

        const triggers = skill.auto_triggers || [];
        return triggers.some((trigger) =>
          normalized.includes(trigger.toLowerCase()),
        );
      }) || null
    );
  }

  create(input: SkillCreateInput): SkillRecord {
    const trimmedName = input.name.trim();
    const trimmedDescription = input.description.trim();
    const trimmedPrompt = input.prompt.trim();
    const mode = input.mode || "prompt";

    if (!trimmedName || !trimmedDescription) {
      throw new Error("name、description 不能为空");
    }

    if (mode === "prompt" && !trimmedPrompt) {
      throw new Error("prompt 模式下，prompt 不能为空");
    }

    if (mode === "module" && !input.module_entry?.trim()) {
      throw new Error("module 模式下，module_entry 不能为空");
    }

    const registry = this.loadRegistry();
    const id = this.generateUniqueId(trimmedName, registry.skills);
    const now = nowIso();

    const skill: SkillRecord = {
      id,
      name: trimmedName,
      description: trimmedDescription,
      prompt: trimmedPrompt || "模块 Skill：由本地脚本执行核心逻辑。",
      mode,
      module_entry: input.module_entry?.trim(),
      auto_triggers: input.auto_triggers || [],
      is_default: Boolean(input.is_default),
      created_at: now,
      updated_at: now,
    };

    registry.skills.push(skill);
    this.saveRegistry(registry);

    return skill;
  }

  update(id: string, input: SkillUpdateInput): SkillRecord {
    const registry = this.loadRegistry();
    const idx = registry.skills.findIndex((skill) => skill.id === id);

    if (idx < 0) {
      throw new Error("Skill 不存在");
    }

    const original = registry.skills[idx];
    const nextMode = input.mode || original.mode;
    const nextPrompt = input.prompt?.trim() || original.prompt;
    const nextModuleEntry = input.module_entry ?? original.module_entry;

    const next: SkillRecord = {
      ...original,
      name: input.name?.trim() || original.name,
      description: input.description?.trim() || original.description,
      prompt: nextPrompt,
      mode: nextMode,
      module_entry: nextModuleEntry,
      auto_triggers: input.auto_triggers ?? original.auto_triggers,
      updated_at: nowIso(),
    };

    if (!next.name || !next.description) {
      throw new Error("name、description 不能为空");
    }

    if (next.mode === "prompt" && !next.prompt) {
      throw new Error("prompt 模式下，prompt 不能为空");
    }

    if (next.mode === "module" && !next.module_entry?.trim()) {
      throw new Error("module 模式下，module_entry 不能为空");
    }

    registry.skills[idx] = next;
    this.saveRegistry(registry);

    return next;
  }

  remove(id: string): void {
    const registry = this.loadRegistry();
    const target = registry.skills.find((skill) => skill.id === id);
    if (!target) {
      throw new Error("Skill 不存在");
    }

    if (target.is_default) {
      throw new Error("默认 Skill 不允许删除");
    }

    const before = registry.skills.length;
    registry.skills = registry.skills.filter((skill) => skill.id !== id);

    if (registry.skills.length === before) {
      throw new Error("Skill 不存在");
    }

    this.saveRegistry(registry);
  }

  private ensureStorage(): void {
    if (!existsSync(skillsDir)) {
      mkdirSync(skillsDir, { recursive: true });
    }

    if (!existsSync(skillRegistryPath)) {
      this.saveRegistry({ skills: [] });
    }
  }

  private ensureDefaultSkills(): void {
    const registry = this.loadRegistry();
    const defaults = createDefaultSkills();
    let changed = false;

    for (const item of defaults) {
      const exists = registry.skills.some((skill) => skill.name === item.name);
      if (!exists) {
        const id = this.generateUniqueId(item.name, registry.skills);
        const now = nowIso();
        registry.skills.push({
          id,
          name: item.name,
          description: item.description,
          prompt: item.prompt,
          mode: item.mode || "prompt",
          module_entry: item.module_entry,
          auto_triggers: item.auto_triggers || [],
          is_default: true,
          created_at: now,
          updated_at: now,
        });
        changed = true;
      }
    }

    if (changed) {
      this.saveRegistry(registry);
    }
  }

  private loadRegistry(): SkillRegistry {
    try {
      const raw = readFileSync(skillRegistryPath, "utf-8");
      const parsed = JSON.parse(raw) as SkillRegistry;
      if (!Array.isArray(parsed.skills)) {
        return { skills: [] };
      }

      const upgraded = parsed.skills.map((skill) => ({
        ...skill,
        mode: skill.mode || "prompt",
        auto_triggers: skill.auto_triggers || [],
      }));

      return { skills: upgraded };
    } catch {
      return { skills: [] };
    }
  }

  private saveRegistry(registry: SkillRegistry): void {
    writeFileSync(
      skillRegistryPath,
      JSON.stringify(registry, null, 2),
      "utf-8",
    );
  }

  private generateUniqueId(base: string, skills: SkillRecord[]): string {
    const normalized = base
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);

    const seed = normalized || "skill";

    if (!skills.some((skill) => skill.id === seed)) {
      return seed;
    }

    let counter = 2;
    while (skills.some((skill) => skill.id === `${seed}-${counter}`)) {
      counter += 1;
    }

    return `${seed}-${counter}`;
  }
}
