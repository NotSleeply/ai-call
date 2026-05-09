import { execSync } from "child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs";
import { extname, join } from "path";

export class FileSystemService {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`❌ 命令执行失败: ${message}`);
    }
  }

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
        `\n✅ 共 ${items.filter((item) => !item.startsWith(".")).length} 项`,
      );
    } catch (error) {
      console.log(`❌ 列出目录失败: ${error}`);
    }
  }

  private searchInDirectory(
    dir: string,
    keyword: string,
  ): Array<{ file: string; line: number; content: string }> {
    const results: Array<{ file: string; line: number; content: string }> = [];

    const search = (currentDir: string): void => {
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
            } catch {
              // ignore unreadable files
            }
          }
        }
      }
    };

    search(dir);
    return results.slice(0, 10);
  }

  private getProjectStats(dir: string): {
    totalFiles: number;
    totalDirs: number;
    codeFiles: number;
    totalLines: number;
    fileTypes: Record<string, number>;
  } {
    let totalFiles = 0;
    let totalDirs = 0;
    let codeFiles = 0;
    let totalLines = 0;
    const fileTypes: Record<string, number> = {};

    const scan = (currentDir: string): void => {
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
            } catch {
              // ignore unreadable files
            }
          }
        }
      }
    };

    scan(dir);

    return { totalFiles, totalDirs, codeFiles, totalLines, fileTypes };
  }

  private detectProjectType(fileTypes: Record<string, number>): string {
    if (fileTypes[".ts"] || fileTypes[".tsx"]) return "TypeScript 项目";
    if (fileTypes[".js"] || fileTypes[".jsx"]) return "JavaScript 项目";
    if (fileTypes[".py"]) return "Python 项目";
    if (fileTypes[".java"]) return "Java 项目";
    return "未知类型";
  }
}
