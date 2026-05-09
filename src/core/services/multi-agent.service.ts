// @ts-ignore -- NodeNext .js import resolves to .ts at build time; suppress editor false positive.
import { OpenClawClient } from "../ai/openClawClient.js";

interface AgentResult {
  agent: string;
  output: string;
}

export class MultiAgentService {
  constructor(private readonly openClawClient: OpenClawClient) {}

  async runCollaboration(task?: string): Promise<void> {
    const objective =
      task?.trim() ||
      "为 SmallClaw 设计一次可落地的版本迭代，覆盖前端、后端和验证步骤";

    console.log("\n🤝 多 Agent 协同演示");
    console.log("═".repeat(60));
    console.log(`🎯 任务目标: ${objective}`);
    console.log("\n");

    const planner = await this.runAgent(
      "Planner Agent",
      [
        "你是需求规划 Agent。",
        `目标: ${objective}`,
        "输出格式：",
        "1) 目标拆解（3条）",
        "2) 约束与假设（3条）",
        "3) 里程碑（3条）",
        "要求：中文、简洁、可执行。",
      ].join("\n"),
    );

    const architect = await this.runAgent(
      "Architect Agent",
      [
        "你是系统架构 Agent。",
        `目标: ${objective}`,
        `Planner 输出:\n${planner.output}`,
        "输出格式：",
        "1) 模块拆分方案",
        "2) 接口边界",
        "3) 风险点与规避",
        "要求：结合 Node + Vue 项目。",
      ].join("\n"),
    );

    const implementer = await this.runAgent(
      "Implementer Agent",
      [
        "你是执行 Agent。",
        `目标: ${objective}`,
        `Planner 输出:\n${planner.output}`,
        `Architect 输出:\n${architect.output}`,
        "输出格式：",
        "1) 具体改动清单（文件级）",
        "2) 执行顺序（步骤级）",
        "3) 验证命令（命令级）",
        "要求：可直接交给开发执行。",
      ].join("\n"),
    );

    const reviewer = await this.runAgent(
      "Reviewer Agent",
      [
        "你是评审 Agent。",
        `目标: ${objective}`,
        `Planner 输出:\n${planner.output}`,
        `Architect 输出:\n${architect.output}`,
        `Implementer 输出:\n${implementer.output}`,
        "输出格式：",
        "1) 关键问题（最多5条）",
        "2) 回归测试清单",
        "3) 最终结论",
        "要求：优先给出高风险问题。",
      ].join("\n"),
    );

    console.log("\n✅ 多 Agent 协同完成");
    console.log("═".repeat(60));
    console.log("📌 最终评审结论:");
    console.log(reviewer.output);
    console.log("");
  }

  private async runAgent(agent: string, prompt: string): Promise<AgentResult> {
    console.log(`🧠 ${agent} 开始工作...`);

    const output = await this.openClawClient.generateReply(prompt, []);

    console.log(`\n【${agent} 输出】`);
    console.log("─".repeat(60));
    console.log(output);
    console.log("\n");

    return { agent, output };
  }
}
