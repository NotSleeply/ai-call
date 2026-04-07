import { Request, Response } from "express";
import { DaxiaAssistant } from "../../assistant.js";
import { ModuleSkillRunner } from "../skills/moduleSkillRunner.js";
import { SkillStore } from "../skills/skillStore.js";

function parseTriggerList(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((item) => String(item).trim())
      .filter((item) => Boolean(item));
  }

  if (typeof input === "string") {
    return input
      .split(/[\n,，]/)
      .map((item) => item.trim())
      .filter((item) => Boolean(item));
  }

  return [];
}

export function createSkillController(assistant: DaxiaAssistant) {
  const store = new SkillStore();
  const moduleRunner = new ModuleSkillRunner();

  return {
    listSkills(_req: Request, res: Response): void {
      const skills = store.list();
      res.json({ success: true, data: skills });
    },

    createSkill(req: Request, res: Response): void {
      try {
        const { name, description, prompt, mode, module_entry, auto_triggers } =
          req.body as {
            name?: string;
            description?: string;
            prompt?: string;
            mode?: "prompt" | "module";
            module_entry?: string;
            auto_triggers?: string[] | string;
          };

        const created = store.create({
          name: name || "",
          description: description || "",
          prompt: prompt || "",
          mode,
          module_entry,
          auto_triggers: parseTriggerList(auto_triggers),
        });

        res.json({ success: true, data: created });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "创建 Skill 失败";
        res.json({ success: false, message });
      }
    },

    updateSkill(req: Request, res: Response): void {
      try {
        const id = req.params.id;
        const { name, description, prompt, mode, module_entry, auto_triggers } =
          req.body as {
            name?: string;
            description?: string;
            prompt?: string;
            mode?: "prompt" | "module";
            module_entry?: string;
            auto_triggers?: string[] | string;
          };

        const updated = store.update(id, {
          name,
          description,
          prompt,
          mode,
          module_entry,
          auto_triggers: parseTriggerList(auto_triggers),
        });
        res.json({ success: true, data: updated });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "更新 Skill 失败";
        res.json({ success: false, message });
      }
    },

    deleteSkill(req: Request, res: Response): void {
      try {
        const id = req.params.id;
        store.remove(id);
        res.json({ success: true, message: "删除成功" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "删除 Skill 失败";
        res.json({ success: false, message });
      }
    },

    async runSkill(req: Request, res: Response): Promise<void> {
      try {
        const id = req.params.id;
        const { task = "" } = req.body as { task?: string };
        const skill = store.getById(id);

        if (!skill) {
          res.json({ success: false, message: "Skill 不存在" });
          return;
        }

        const result =
          skill.mode === "module"
            ? await moduleRunner.run(skill, task)
            : await assistant.runSkillTask(skill.prompt, task);

        res.json({ success: true, data: { output: result } });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "运行 Skill 失败";
        res.json({ success: false, message });
      }
    },
  };
}
