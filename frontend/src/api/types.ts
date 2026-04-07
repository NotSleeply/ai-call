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
