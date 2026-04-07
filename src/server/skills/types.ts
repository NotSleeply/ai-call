export interface SkillRecord {
  id: string;
  name: string;
  description: string;
  prompt: string;
  mode: "prompt" | "module";
  module_entry?: string;
  auto_triggers?: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkillRegistry {
  skills: SkillRecord[];
}

export interface SkillCreateInput {
  name: string;
  description: string;
  prompt: string;
  mode?: "prompt" | "module";
  module_entry?: string;
  auto_triggers?: string[];
  is_default?: boolean;
}

export interface SkillUpdateInput {
  name?: string;
  description?: string;
  prompt?: string;
  mode?: "prompt" | "module";
  module_entry?: string;
  auto_triggers?: string[];
}
