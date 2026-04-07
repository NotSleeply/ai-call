export function resolveCommandKey(rawCommand: string): string {
  const normalized = rawCommand.trim().toLowerCase();
  const firstToken = normalized.split(/\s+/)[0];
  const is2048Intent =
    normalized.includes("2048") &&
    /(生成|打开|玩|做|来个|小游戏|play|create|make|build|start|game)/i.test(
      rawCommand,
    );

  if (firstToken === "2048" || is2048Intent) {
    return "2048";
  }

  return firstToken;
}
