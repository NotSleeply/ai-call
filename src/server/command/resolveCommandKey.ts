export function resolveCommandKey(rawCommand: string): string {
  const normalized = rawCommand.trim().toLowerCase();
  const firstToken = normalized.split(/\s+/)[0];
  const isMultiAgentIntent =
    firstToken === "agents" ||
    firstToken === "multiagent" ||
    firstToken === "swarm" ||
    /(多\s*agent|多智能体|agent协同|协同工作|multi\s*-?\s*agent|agent\s*swarm)/i.test(
      rawCommand,
    );
  const is2048Intent =
    normalized.includes("2048") &&
    /(生成|打开|玩|做|来个|小游戏|play|create|make|build|start|game)/i.test(
      rawCommand,
    );

  if (isMultiAgentIntent) {
    return "agents";
  }

  if (firstToken === "2048" || is2048Intent) {
    return "2048";
  }

  return firstToken;
}
