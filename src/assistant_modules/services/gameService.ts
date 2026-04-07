import { cpSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { delay } from "../utils/delay.js";

export class GameService {
  async copy2048(): Promise<void> {
    const sourceDir = join(process.cwd(), "incognito", "2048");
    const outDir = join(process.cwd(), "out");
    const targetDir = join(outDir, "2048");

    console.log("\n🎮 正在生成2048游戏...");

    try {
      if (!existsSync(sourceDir)) {
        console.log("❌ 源目录不存在: incognito/2048");
        return;
      }

      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
      }

      cpSync(sourceDir, targetDir, { recursive: true });

      await delay(500);

      console.log("\n");
      console.log("╔═══════════════════════════════════════╗");
      console.log("║         ✅ 生成成功！                 ║");
      console.log("╚═══════════════════════════════════════╝");
      console.log("\n");
      console.log("🎯 已经生成好了2048，并且放到了out目录下");
      console.log(`📂 路径: ${targetDir}`);
      console.log("\n");
      console.log("💡 2048 已生成完成。是否启动？");
      console.log("   回复“启动”即可打开，回复“取消”可不打开。");
      console.log("");
    } catch (error) {
      console.log("❌ 复制失败:", error);
    }
  }
}
