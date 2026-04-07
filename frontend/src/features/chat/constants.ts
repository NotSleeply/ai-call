export const loadingPhases = [
  "正在与助手同步上下文...",
  "正在组织回复内容...",
  "正在润色输出格式...",
] as const;

export const quickCommands = [
  {
    name: "agents 为 SmallClaw 规划一次前后端协同迭代",
    label: "多Agent协同",
    icon: "🤝",
  },
  {
    name: "请把当前仓库备份到 D:/CodeBackups",
    label: "仓库备份Skill",
    icon: "🧩",
  },
  { name: "weather", label: "天气", icon: "🌤️" },
  { name: "news", label: "新闻", icon: "📰" },
  { name: "email", label: "邮件", icon: "📧" },
  { name: "ollama 你好，请介绍你自己", label: "Ollama", icon: "🦙" },
  { name: "wx", label: "微信", icon: "💬" },
  { name: "summary", label: "总结", icon: "📝" },
  { name: "2048", label: "2048", icon: "🎮" },
  { name: "help", label: "帮助", icon: "❓" },
] as const;

export const commandConfig: Record<string, { loading: string }> = {
  weather: { loading: "正在获取天气信息..." },
  news: { loading: "正在获取新闻..." },
  email: { loading: "正在获取邮件..." },
  agents: { loading: "正在组织多 Agent 协同..." },
  summary: { loading: "正在生成总结..." },
  wx: { loading: "正在连接微信..." },
  ollama: { loading: "正在调用本地 Ollama..." },
  skillrun: { loading: "正在执行所选 Skill..." },
  analyze: { loading: "正在分析项目..." },
  help: { loading: "获取帮助信息..." },
  "2048": { loading: "正在生成2048游戏..." },
};

export const commandKeywords = new Set([
  "weather",
  "news",
  "email",
  "agents",
  "summary",
  "wx",
  "ollama",
  "analyze",
  "help",
  "read",
  "write",
  "list",
  "search",
  "exec",
  "2048",
]);
