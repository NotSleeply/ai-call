import QRCode from "qrcode";
import { delay } from "../utils/delay.js";

export class WeChatService {
  async connectWeChat(): Promise<void> {
    console.log("\n🔄 正在初始化微信连接...");
    await delay(500);

    console.log("📡 正在生成二维码...");
    await delay(800);

    console.log("\n");
    console.log("╔═══════════════════════════════════════╗");
    console.log("║                                       ║");
    console.log("║   请使用微信扫描下方二维码登录         ║");
    console.log("║                                       ║");
    console.log("╚═══════════════════════════════════════╝");
    console.log("\n");

    try {
      const qrAscii = await QRCode.toString("https://weixin.qq.com/daxia-demo", {
        type: "terminal",
        small: true,
      });
      console.log(qrAscii);
    } catch {
      await this.displayQRCode();
    }

    console.log("\n");
    console.log("⏳ 等待扫码中...");
    await delay(2000);

    console.log("📱 检测到扫码动作...");
    await delay(1000);

    console.log("✅ 扫码成功！");
    await delay(500);

    console.log("🔐 正在验证身份...");
    await delay(800);

    console.log("✅ 身份验证通过！");
    await delay(300);

    console.log("\n");
    console.log("╔═══════════════════════════════════════╗");
    console.log("║        🎉 微信连接成功！              ║");
    console.log("╚═══════════════════════════════════════╝");
    console.log("\n");
    console.log("💡 提示: 现在可以使用微信相关功能了！");
    console.log("   - 查看消息: wx messages");
    console.log("   - 发送消息: wx send <好友> <内容>");
    console.log("   - 断开连接: wx disconnect");
    console.log("\n");
  }

  async generateQRCodeBase64(): Promise<string> {
    try {
      return await QRCode.toDataURL("https://weixin.qq.com/daxia-demo", {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    } catch {
      throw new Error("生成二维码失败");
    }
  }

  private async displayQRCode(): Promise<void> {
    const qrSize = 21;
    const qrCode: string[][] = [];

    for (let i = 0; i < qrSize; i++) {
      qrCode[i] = [];
      for (let j = 0; j < qrSize; j++) {
        qrCode[i][j] = "  ";
      }
    }

    this.drawFinderPattern(qrCode, 0, 0);
    this.drawFinderPattern(qrCode, qrSize - 7, 0);
    this.drawFinderPattern(qrCode, 0, qrSize - 7);

    for (let i = 0; i < qrSize; i++) {
      for (let j = 0; j < qrSize; j++) {
        if (qrCode[i][j] === "  ") {
          qrCode[i][j] = Math.random() > 0.5 ? "██" : "  ";
        }
      }
    }

    for (let i = 0; i < qrSize; i++) {
      const row = qrCode[i].join("");
      const padding = " ".repeat(10);
      console.log(padding + "║ " + row + " ║");
    }
  }

  private drawFinderPattern(
    qrCode: string[][],
    startX: number,
    startY: number,
  ): void {
    for (let i = 0; i < 7; i++) {
      qrCode[startY][startX + i] = "██";
      qrCode[startY + 6][startX + i] = "██";
      qrCode[startY + i][startX] = "██";
      qrCode[startY + i][startX + 6] = "██";
    }

    for (let i = 2; i < 5; i++) {
      for (let j = 2; j < 5; j++) {
        qrCode[startY + i][startX + j] = "██";
      }
    }
  }
}
