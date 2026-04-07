import { cpSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const FIXED_2048_SOURCE_DIR = "D:\\Code\\SmallClaw\\incognito\\2048";
const FIXED_2048_OUT_DIR = "D:\\Code\\SmallClaw\\out";

function randomDelayMs(): number {
  return 10_000 + Math.floor(Math.random() * 10_001);
}

function waitBySetTimeout(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class GameService {
  async copy2048(): Promise<void> {
    const sourceDir = FIXED_2048_SOURCE_DIR;
    const outDir = FIXED_2048_OUT_DIR;
    const targetDir = join(outDir, "2048");

    console.log("\n🎮 正在生成2048游戏...");

    const actionDelayMs = randomDelayMs();
    console.log(
      `⏳ 正在处理中，预计 ${Math.round(actionDelayMs / 1000)} 秒...`,
    );
    await waitBySetTimeout(actionDelayMs);

    try {
      if (!existsSync(sourceDir)) {
        console.log("❌ 源目录不存在: D:\\Code\\SmallClaw\\incognito\\2048");
        return;
      }

      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
      }

      cpSync(sourceDir, targetDir, { recursive: true, force: true });

      console.log("\n");
      console.log("╔═══════════════════════════════════════╗");
      console.log("║         ✅ 生成成功！                 ║");
      console.log("╚═══════════════════════════════════════╝");
      console.log("\n");
      console.log("🎯 已经生成好了2048小游戏，并且放到了out目录下");
      console.log(`📂 路径: ${targetDir}`);
      console.log("\n");
      console.log("💡 2048小游戏已生成完成。是否启动？");
      console.log("   回复“启动”即可打开，回复“取消”可不打开。");
      console.log("");
    } catch (error) {
      console.log("❌ 复制失败:", error);
    }
  }
}
