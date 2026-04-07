export interface CommandResponse {
  success: boolean;
  message: string;
  data?: unknown;
  openUrl?: string;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  qr_code?: string;
  created_at: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  prompt: string;
  mode?: "prompt" | "module";
  module_entry?: string;
  auto_triggers?: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkillRunResult {
  output: string;
}

export type ModelProvider = "auto" | "deepseek" | "api" | "ollama";
export type ScheduleFrequencyType = "daily" | "interval" | "once";

export interface ScheduledTask {
  id: number;
  conversationId: number;
  name: string;
  workspace?: string | null;
  command: string;
  modelProvider: ModelProvider;
  modelName?: string | null;
  frequencyType: ScheduleFrequencyType;
  intervalSeconds: number;
  timeOfDay?: string | null;
  weekdays: number[];
  runAt?: string | null;
  startDate?: string | null;
  pushToWechat: boolean;
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string | null;
}

export interface CreateSchedulePayload {
  conversationId: number;
  name: string;
  workspace?: string;
  prompt: string;
  modelProvider: ModelProvider;
  modelName?: string;
  frequencyType: ScheduleFrequencyType;
  intervalMinutes?: number;
  timeOfDay?: string;
  weekdays?: number[];
  runAt?: string;
  startDate?: string;
  pushToWechat?: boolean;
}

export interface ScheduledTaskRun {
  id: number;
  taskId: number;
  success: boolean;
  output: string;
  executedAt: string;
}
