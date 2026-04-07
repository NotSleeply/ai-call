export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isLaunchConfirm(text: string): boolean {
  return /^(启动|开始|打开|start|open|go)$/i.test(text.trim());
}

export function isLaunchCancel(text: string): boolean {
  return /^(取消|不用|不启动|不要|算了|cancel|no)$/i.test(text.trim());
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return date.toLocaleDateString("zh-CN");
}
