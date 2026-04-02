import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "fs";
import { join, extname } from "path";
import { execSync } from "child_process";

/**
 * 大虾助手核心功能类
 * 演示AI助手的主要能力
 */
export class DaxiaAssistant {
  /**
   * 显示帮助信息
   */
  showHelp(): void {
    console.log(`
┌─────────────────────────────────────────────────────────────┐
│                    📚 可用命令列表                          │
├─────────────────────────────────────────────────────────────┤
│  help                    显示此帮助信息                     │
│  read <文件名>           读取文件内容                       │
│  write <文件名> <内容>   写入文件内容                       │
│  search <关键词>         搜索代码中的关键词                  │
│  exec <命令>             执行系统命令                       │
│  analyze                 分析当前项目结构                    │
│  list [目录]             列出目录内容                       │
│  ask <问题>              智能问答                           │
│  wx                      连接微信                           │
│  weather                 总结天气                           │
│  news                    总结新闻                           │
│  email                   总结邮件                           │
│  summary                 生成对话总结（Markdown格式）       │
│  exit                    退出程序                           │
├─────────────────────────────────────────────────────────────┤
│  💡 提示: 输入任意其他内容将进入智能问答模式               │
└─────────────────────────────────────────────────────────────┘
    `);
  }

  /**
   * 读取文件内容
   */
  async readFile(filename?: string): Promise<void> {
    if (!filename) {
      console.log("❌ 请指定文件名，例如: read package.json");
      return;
    }

    try {
      if (!existsSync(filename)) {
        console.log(`❌ 文件不存在: ${filename}`);
        return;
      }

      const content = readFileSync(filename, "utf-8");
      const lines = content.split("\n");

      console.log(`\n📄 文件: ${filename}`);
      console.log(`📏 行数: ${lines.length}`);
      console.log("─".repeat(60));

      // 显示前20行，模拟实际助手的行为
      const displayLines = lines.slice(0, 20);
      displayLines.forEach((line, idx) => {
        console.log(`${String(idx + 1).padStart(4)}: ${line}`);
      });

      if (lines.length > 20) {
        console.log(`\n... 还有 ${lines.length - 20} 行未显示 ...`);
      }
      console.log("─".repeat(60));
    } catch (error) {
      console.log(`❌ 读取文件失败: ${error}`);
    }
  }

  /**
   * 写入文件内容
   */
  async writeFile(filename?: string, content?: string): Promise<void> {
    if (!filename || !content) {
      console.log("❌ 请指定文件名和内容，例如: write test.txt Hello World");
      return;
    }

    try {
      writeFileSync(filename, content, "utf-8");
      console.log(`✅ 文件写入成功: ${filename}`);
      console.log(`📝 内容: ${content}`);
    } catch (error) {
      console.log(`❌ 写入文件失败: ${error}`);
    }
  }

  /**
   * 搜索代码内容
   */
  async searchContent(keyword?: string): Promise<void> {
    if (!keyword) {
      console.log("❌ 请指定搜索关键词，例如: search function");
      return;
    }

    console.log(`\n🔍 搜索关键词: "${keyword}"`);
    console.log("─".repeat(60));

    try {
      const results = this.searchInDirectory(".", keyword);

      if (results.length === 0) {
        console.log("❌ 未找到匹配结果");
      } else {
        results.forEach(({ file, line, content }) => {
          console.log(`📄 ${file}:${line}`);
          console.log(`   ${content.trim()}`);
          console.log("");
        });
        console.log(`✅ 找到 ${results.length} 个匹配结果`);
      }
    } catch (error) {
      console.log(`❌ 搜索失败: ${error}`);
    }
  }

  /**
   * 递归搜索目录
   */
  private searchInDirectory(
    dir: string,
    keyword: string,
  ): Array<{ file: string; line: number; content: string }> {
    const results: Array<{ file: string; line: number; content: string }> = [];

    const search = (currentDir: string) => {
      const items = readdirSync(currentDir);

      for (const item of items) {
        if (item.startsWith(".") || item === "node_modules") continue;

        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          search(fullPath);
        } else if (stat.isFile()) {
          const ext = extname(item);
          if ([".ts", ".js", ".json", ".md"].includes(ext)) {
            try {
              const content = readFileSync(fullPath, "utf-8");
              const lines = content.split("\n");

              lines.forEach((line, idx) => {
                if (line.toLowerCase().includes(keyword.toLowerCase())) {
                  results.push({
                    file: fullPath,
                    line: idx + 1,
                    content: line,
                  });
                }
              });
            } catch {}
          }
        }
      }
    };

    search(dir);
    return results.slice(0, 10); // 限制返回结果数量
  }

  /**
   * 执行系统命令
   */
  async executeCommand(command?: string): Promise<void> {
    if (!command) {
      console.log("❌ 请指定命令，例如: exec ls -la");
      return;
    }

    console.log(`\n⚡ 执行命令: ${command}`);
    console.log("─".repeat(60));

    try {
      const output = execSync(command, {
        encoding: "utf-8",
        timeout: 5000,
      });
      console.log(output || "✅ 命令执行成功（无输出）");
    } catch (error: any) {
      console.log(`❌ 命令执行失败: ${error.message}`);
    }
  }

  /**
   * 分析项目结构
   */
  async analyzeProject(): Promise<void> {
    console.log("\n📊 项目分析报告");
    console.log("═".repeat(60));

    try {
      const stats = this.getProjectStats(".");

      console.log(`
📁 项目统计:
   - 总文件数: ${stats.totalFiles}
   - 总目录数: ${stats.totalDirs}
   - 代码文件: ${stats.codeFiles}
   - 代码行数: ${stats.totalLines}

📋 文件类型分布:
${Object.entries(stats.fileTypes)
  .map(([ext, count]) => `   - ${ext || "无扩展名"}: ${count} 个`)
  .join("\n")}

💡 项目类型: ${this.detectProjectType(stats.fileTypes)}
      `);
    } catch (error) {
      console.log(`❌ 分析失败: ${error}`);
    }
  }

  /**
   * 获取项目统计信息
   */
  private getProjectStats(dir: string) {
    let totalFiles = 0;
    let totalDirs = 0;
    let codeFiles = 0;
    let totalLines = 0;
    const fileTypes: Record<string, number> = {};

    const scan = (currentDir: string) => {
      const items = readdirSync(currentDir);

      for (const item of items) {
        if (item.startsWith(".") || item === "node_modules") continue;

        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          totalDirs++;
          scan(fullPath);
        } else if (stat.isFile()) {
          totalFiles++;
          const ext = extname(item);
          fileTypes[ext] = (fileTypes[ext] || 0) + 1;

          if ([".ts", ".js", ".tsx", ".jsx"].includes(ext)) {
            codeFiles++;
            try {
              const content = readFileSync(fullPath, "utf-8");
              totalLines += content.split("\n").length;
            } catch {}
          }
        }
      }
    };

    scan(dir);

    return { totalFiles, totalDirs, codeFiles, totalLines, fileTypes };
  }

  /**
   * 检测项目类型
   */
  private detectProjectType(fileTypes: Record<string, number>): string {
    if (fileTypes[".ts"] || fileTypes[".tsx"]) return "TypeScript 项目";
    if (fileTypes[".js"] || fileTypes[".jsx"]) return "JavaScript 项目";
    if (fileTypes[".py"]) return "Python 项目";
    if (fileTypes[".java"]) return "Java 项目";
    return "未知类型";
  }

  /**
   * 列出目录内容
   */
  async listFiles(dir: string): Promise<void> {
    console.log(`\n📂 目录: ${dir}`);
    console.log("─".repeat(60));

    try {
      const items = readdirSync(dir);

      items.forEach((item) => {
        if (item.startsWith(".")) return;

        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        const icon = stat.isDirectory() ? "📁" : "📄";
        const size = stat.isFile() ? ` (${stat.size} bytes)` : "";

        console.log(`  ${icon} ${item}${size}`);
      });

      console.log(
        `\n✅ 共 ${items.filter((i) => !i.startsWith(".")).length} 项`,
      );
    } catch (error) {
      console.log(`❌ 列出目录失败: ${error}`);
    }
  }

  /**
   * 智能问答
   */
  async askQuestion(question?: string): Promise<void> {
    if (!question) {
      console.log("❌ 请输入问题，例如: ask 什么是TypeScript?");
      return;
    }

    console.log(`\n🤔 问题: ${question}`);
    console.log("─".repeat(60));

    // 模拟智能回答
    const answers: Record<string, string> = {
      typescript:
        "TypeScript是JavaScript的超集，添加了静态类型检查和面向对象编程特性。它编译成纯JavaScript，可以在任何浏览器和Node.js环境中运行。",
      node: "Node.js是一个基于Chrome V8引擎的JavaScript运行环境，让JavaScript可以在服务器端运行。它使用事件驱动、非阻塞I/O模型，非常适合构建高性能的网络应用。",
      大虾: "大虾是一个智能AI编程助手，可以帮助开发者完成代码编写、文件操作、项目管理等任务。它能够理解自然语言指令，自动执行复杂的开发工作流。",
      default:
        "这是一个很好的问题！在实际的大虾助手中，我会使用先进的AI模型来回答你的问题。这个Demo只是展示了基本的功能框架。",
    };

    const key = Object.keys(answers).find((k) =>
      question.toLowerCase().includes(k),
    );
    const answer = answers[key || "default"];

    // 模拟打字效果
    process.stdout.write("💬 ");
    for (const char of answer) {
      process.stdout.write(char);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    console.log("\n");
  }

  /**
   * 智能对话模式
   */
  async smartChat(input: string): Promise<void> {
    // 检测用户意图
    if (
      input.includes("什么") ||
      input.includes("如何") ||
      input.includes("怎么")
    ) {
      await this.askQuestion(input);
    } else if (input.includes("谢谢")) {
      console.log("😊 不客气！很高兴能帮到你！");
    } else if (input.includes("你好")) {
      console.log("👋 你好！我是大虾助手，有什么可以帮你的吗？");
    } else {
      console.log('💡 我理解你想了解关于"' + input + '"的内容。');
      console.log("   在完整版大虾中，我会提供更详细的回答。");
      console.log("   输入 help 查看可用命令，或输入 ask + 问题进行提问。");
    }
  }

  /**
   * 连接微信
   */
  async connectWeChat(): Promise<void> {
    console.log("\n🔄 正在初始化微信连接...");
    await this.delay(500);

    console.log("📡 正在生成二维码...");
    await this.delay(800);

    // 显示模拟二维码
    console.log("\n");
    console.log("╔═══════════════════════════════════════╗");
    console.log("║                                       ║");
    console.log("║   请使用微信扫描下方二维码登录         ║");
    console.log("║                                       ║");
    console.log("╚═══════════════════════════════════════╝");
    console.log("\n");

    // 生成一个漂亮的ASCII二维码
    await this.displayQRCode();

    console.log("\n");
    console.log("⏳ 等待扫码中...");
    await this.delay(2000);

    // 模拟扫描过程
    console.log("📱 检测到扫码动作...");
    await this.delay(1000);

    console.log("✅ 扫码成功！");
    await this.delay(500);

    console.log("🔐 正在验证身份...");
    await this.delay(800);

    console.log("✅ 身份验证通过！");
    await this.delay(300);

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

  /**
   * 显示ASCII二维码
   */
  private async displayQRCode(): Promise<void> {
    // 生成一个模拟的二维码图案
    const qrSize = 21;
    const qrCode: string[][] = [];

    // 初始化二维码矩阵
    for (let i = 0; i < qrSize; i++) {
      qrCode[i] = [];
      for (let j = 0; j < qrSize; j++) {
        qrCode[i][j] = "  ";
      }
    }

    // 生成定位图案（三个角的方块）
    this.drawFinderPattern(qrCode, 0, 0);
    this.drawFinderPattern(qrCode, qrSize - 7, 0);
    this.drawFinderPattern(qrCode, 0, qrSize - 7);

    // 生成随机数据区域
    for (let i = 0; i < qrSize; i++) {
      for (let j = 0; j < qrSize; j++) {
        if (qrCode[i][j] === "  ") {
          qrCode[i][j] = Math.random() > 0.5 ? "██" : "  ";
        }
      }
    }

    // 逐行打印二维码
    for (let i = 0; i < qrSize; i++) {
      const row = qrCode[i].join("");
      // 居中显示
      const padding = " ".repeat(10);
      console.log(padding + "║ " + row + " ║");
    }
  }

  /**
   * 绘制定位图案
   */
  private drawFinderPattern(qrCode: string[][], startX: number, startY: number): void {
    // 外框
    for (let i = 0; i < 7; i++) {
      qrCode[startY][startX + i] = "██";
      qrCode[startY + 6][startX + i] = "██";
      qrCode[startY + i][startX] = "██";
      qrCode[startY + i][startX + 6] = "██";
    }
    // 内框
    for (let i = 2; i < 5; i++) {
      for (let j = 2; j < 5; j++) {
        qrCode[startY + i][startX + j] = "██";
      }
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 总结天气
   */
  async summarizeWeather(): Promise<void> {
    console.log("\n🌤️ 正在获取天气信息...");
    await this.delay(800);

    console.log("📡 正在分析天气数据...");
    await this.delay(600);

    console.log("\n");
    console.log("╔═══════════════════════════════════════╗");
    console.log("║         🌤️ 天气总结报告              ║");
    console.log("╚═══════════════════════════════════════╝");
    console.log("\n");

    // 模拟天气数据
    const weatherData = {
      城市: "北京",
      日期: new Date().toLocaleDateString("zh-CN"),
      当前天气: "多云",
      温度: "18°C",
      最高温度: "22°C",
      最低温度: "14°C",
      湿度: "65%",
      风向: "东南风 3级",
      空气质量: "良 (AQI: 78)",
      紫外线: "中等",
      建议: [
        "今日天气舒适，适合外出活动",
        "早晚温差较大，注意添加衣物",
        "紫外线中等，建议涂抹防晒霜",
      ],
    };

    console.log("📍 地点: " + weatherData.城市);
    console.log("📅 日期: " + weatherData.日期);
    console.log("─".repeat(50));
    console.log("");
    console.log("🌤️  当前天气: " + weatherData.当前天气);
    console.log("🌡️  当前温度: " + weatherData.温度);
    console.log("📈 最高温度: " + weatherData.最高温度);
    console.log("📉 最低温度: " + weatherData.最低温度);
    console.log("💧 湿度: " + weatherData.湿度);
    console.log("🌬️  风向: " + weatherData.风向);
    console.log("🌿 空气质量: " + weatherData.空气质量);
    console.log("☀️  紫外线: " + weatherData.紫外线);
    console.log("");
    console.log("─".repeat(50));
    console.log("💡 今日建议:");
    weatherData.建议.forEach((tip, idx) => {
      console.log(`   ${idx + 1}. ${tip}`);
    });
    console.log("");

    await this.delay(300);
    console.log("✅ 天气总结完成！");
  }

  /**
   * 总结新闻
   */
  async summarizeNews(): Promise<void> {
    console.log("\n📰 正在获取新闻信息...");
    await this.delay(800);

    console.log("📡 正在分析新闻内容...");
    await this.delay(600);

    console.log("\n");
    console.log("╔═══════════════════════════════════════╗");
    console.log("║         📰 新闻总结报告              ║");
    console.log("╚═══════════════════════════════════════╝");
    console.log("\n");

    // 模拟新闻数据
    const newsData = {
      更新时间: new Date().toLocaleString("zh-CN"),
      头条新闻: [
        {
          标题: "科技突破：新型AI模型发布",
          来源: "科技日报",
          摘要:
            "最新研发的AI模型在多个领域取得突破性进展，将推动产业升级。",
          重要度: "⭐⭐⭐⭐⭐",
        },
        {
          标题: "经济动态：市场持续回暖",
          来源: "经济观察报",
          摘要:
            "近期市场数据显示经济指标稳步上升，投资者信心增强。",
          重要度: "⭐⭐⭐⭐",
        },
        {
          标题: "环保新规：绿色政策落地",
          来源: "环保周刊",
          摘要: "新环保政策正式实施，企业积极响应绿色发展号召。",
          重要度: "⭐⭐⭐⭐",
        },
      ],
      热点话题: ["人工智能", "新能源", "数字经济", "医疗健康"],
    };

    console.log("📅 更新时间: " + newsData.更新时间);
    console.log("─".repeat(50));
    console.log("");

    console.log("📌 头条新闻:");
    console.log("");
    newsData.头条新闻.forEach((news, idx) => {
      console.log(`【${idx + 1}】${news.标题} ${news.重要度}`);
      console.log(`    来源: ${news.来源}`);
      console.log(`    摘要: ${news.摘要}`);
      console.log("");
    });

    console.log("─".repeat(50));
    console.log("🔥 热点话题:");
    console.log("   " + newsData.热点话题.join(" | "));
    console.log("");

    await this.delay(300);
    console.log("✅ 新闻总结完成！");
  }

  /**
   * 总结邮件
   */
  async summarizeEmail(): Promise<void> {
    console.log("\n📧 正在获取邮件信息...");
    await this.delay(800);

    console.log("📡 正在分析邮件内容...");
    await this.delay(600);

    console.log("\n");
    console.log("╔═══════════════════════════════════════╗");
    console.log("║         📧 邮件总结报告              ║");
    console.log("╚═══════════════════════════════════════╝");
    console.log("\n");

    // 模拟邮件数据
    const emailData = {
      用户邮箱: "user@example.com",
      检查时间: new Date().toLocaleString("zh-CN"),
      统计: {
        未读邮件: 5,
        重要邮件: 2,
        工作邮件: 8,
        订阅邮件: 15,
      },
      重要邮件列表: [
        {
          发件人: "张经理",
          主题: "关于下周项目会议安排",
          时间: "今天 10:30",
          摘要: "定于下周一上午10点召开项目进度会议，请准备相关材料。",
          标签: "工作 重要",
        },
        {
          发件人: "人力资源部",
          主题: "年度培训通知",
          时间: "今天 09:15",
          摘要: "公司将于下月开展技能培训，请在本周五前完成报名。",
          标签: "重要",
        },
        {
          发件人: "李同事",
          主题: "需求文档更新",
          时间: "昨天 16:45",
          摘要: "已更新产品需求文档，请查收并提出修改意见。",
          标签: "工作",
        },
      ],
      待处理事项: [
        "回复张经理的会议确认",
        "完成培训报名",
        "审阅需求文档并反馈",
      ],
    };

    console.log("📬 邮箱: " + emailData.用户邮箱);
    console.log("🕐 检查时间: " + emailData.检查时间);
    console.log("─".repeat(50));
    console.log("");

    console.log("📊 邮件统计:");
    console.log(`   📥 未读邮件: ${emailData.统计.未读邮件} 封`);
    console.log(`   ⭐ 重要邮件: ${emailData.统计.重要邮件} 封`);
    console.log(`   💼 工作邮件: ${emailData.统计.工作邮件} 封`);
    console.log(`   📰 订阅邮件: ${emailData.统计.订阅邮件} 封`);
    console.log("");

    console.log("─".repeat(50));
    console.log("📌 重要邮件:");
    console.log("");
    emailData.重要邮件列表.forEach((email, idx) => {
      console.log(`【${idx + 1}】${email.主题}`);
      console.log(`    发件人: ${email.发件人}`);
      console.log(`    时间: ${email.时间}`);
      console.log(`    摘要: ${email.摘要}`);
      console.log(`    标签: ${email.标签}`);
      console.log("");
    });

    console.log("─".repeat(50));
    console.log("✅ 待处理事项:");
    emailData.待处理事项.forEach((task, idx) => {
      console.log(`   ${idx + 1}. ${task}`);
    });
    console.log("");

    await this.delay(300);
    console.log("✅ 邮件总结完成！");
  }

  /**
   * 生成对话总结（Markdown格式）
   */
  async generateSummary(): Promise<void> {
    console.log("\n📝 正在生成对话总结...");
    await this.delay(500);

    console.log("🔍 正在分析对话内容...");
    await this.delay(800);

    console.log("📊 正在整理关键信息...");
    await this.delay(700);

    console.log("✍️  正在撰写总结报告...");
    await this.delay(1000);

    console.log("\n");
    console.log("╔═══════════════════════════════════════╗");
    console.log("║      📄 对话总结报告（Markdown）     ║");
    console.log("╚═══════════════════════════════════════╝");
    console.log("\n");

    // 生成Markdown格式的总结
    const markdown = `# 对话总结报告

**生成时间**: ${new Date().toLocaleString("zh-CN")}

---

## 📋 会话概览

本次对话展示了大虾AI助手的各项核心功能，包括文件操作、代码分析、智能问答、微信连接以及信息总结等能力。

---

## 🎯 主要内容

### 1. 项目初始化
- 创建了基于 TypeScript 的 Node.js 项目
- 配置了完善的开发环境
- 使用 pnpm 作为包管理器

### 2. 核心功能实现

#### 📁 文件操作
- **读取文件**: 支持查看文件内容，显示行号
- **写入文件**: 快速创建和编辑文件
- **搜索代码**: 递归搜索代码关键词
- **列出目录**: 查看项目结构

#### 🧠 智能分析
- **项目分析**: 统计代码行数、文件类型、项目类型检测
- **智能问答**: 模拟AI对话，回答技术问题
- **自然语言交互**: 理解用户意图，提供友好回应

#### 📱 微信连接
- 生成 ASCII 艺术二维码
- 模拟完整的扫码登录流程
- 提供动画效果和状态提示

#### 🌐 信息总结
- **天气总结**: 温度、湿度、风向、空气质量、活动建议
- **新闻总结**: 头条新闻、重要度评级、热点话题
- **邮件总结**: 邮件统计、重要邮件、待处理事项

### 3. 技术特性

#### 技术栈
\`\`\`
- Node.js + TypeScript
- ES Module 模块系统
- fs 文件系统操作
- child_process 命令执行
- readline 命令行交互
\`\`\`

#### 项目结构
\`\`\`
SmallClaw/
├── src/
│   ├── index.ts       # 主入口，REPL交互
│   ├── assistant.ts   # 大虾助手核心功能
│   └── demo.ts        # 自动演示脚本
├── dist/              # 编译输出目录
├── package.json       # 项目配置
├── tsconfig.json      # TypeScript配置
└── README.md          # 项目文档
\`\`\`

---

## 💡 关键亮点

1. **完整的命令系统**: 14个核心命令，覆盖主要功能场景
2. **友好的用户界面**: 使用emoji、表格、动画效果美化输出
3. **模拟真实场景**: 提供真实的数据展示和交互流程
4. **详细的文档说明**: README包含完整的使用指南和示例
5. **自动演示功能**: 一键展示所有核心能力

---

## 📊 功能统计

| 类别 | 数量 | 说明 |
|------|------|------|
| 核心命令 | 14 | 涵盖文件、分析、连接、总结等功能 |
| 演示场景 | 8 | 包含完整的使用示例 |
| 代码文件 | 3 | index.ts, assistant.ts, demo.ts |
| 文档页面 | 1 | README.md |

---

## 🎓 学习要点

### 对开发者
- TypeScript 项目搭建最佳实践
- Node.js 命令行工具开发
- 异步编程和 Promise 使用
- 文件系统和子进程操作

### 对用户
- AI助手的核心能力展示
- 自然语言交互的理解
- 多功能集成的实际应用
- 信息总结的价值体现

---

## 🚀 扩展建议

### 短期优化
1. 添加命令历史记录功能
2. 支持配置文件自定义
3. 增加错误处理和异常捕获
4. 添加单元测试

### 长期规划
1. 集成真实的 AI API（如 OpenAI、Claude）
2. 实现真实的微信接口对接
3. 添加 Git 操作支持
4. 支持项目模板生成
5. 开发 Web UI 界面

---

## 📝 总结

本项目成功演示了大虾AI助手的核心功能，展示了现代命令行工具的设计思路和实现方式。通过模拟真实的交互场景，让用户能够直观地了解AI助手的工作原理和使用方法。

项目代码结构清晰，功能模块化，易于扩展和维护。无论是作为学习案例还是功能演示，都具有很好的参考价值。

---

**报告生成完毕** ✅

*感谢使用大虾AI助手！*
`;

    // 在屏幕上显示部分内容
    const lines = markdown.split("\n");
    const previewLines = lines.slice(0, 30); // 显示前30行预览
    
    for (const line of previewLines) {
      console.log(line);
      await this.delay(20);
    }

    console.log("\n");
    console.log("... 内容省略 ...");
    console.log("");

    // 生成文件名（带时间戳）
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `conversation-summary-${timestamp}.md`;

    console.log("─".repeat(60));
    console.log("💾 正在保存文件...");

    try {
      // 写入文件
      writeFileSync(filename, markdown, "utf-8");
      
      console.log(`✅ 文件已成功保存: ${filename}`);
      console.log(`📄 文件大小: ${Buffer.byteLength(markdown, "utf-8")} 字节`);
      console.log(`📍 保存路径: ${process.cwd()}\\${filename}`);
      console.log("");
      console.log("💡 提示: 可以使用任何 Markdown 编辑器打开查看完整内容");
      console.log("");
    } catch (error) {
      console.log(`❌ 文件保存失败: ${error}`);
      console.log("💡 尝试将内容输出到屏幕...");
      console.log("\n" + markdown);
    }
  }
}
