import { httpClient } from "./http";
import type { Skill, SkillRunResult } from "./types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export async function getSkills(): Promise<Skill[]> {
  const response = await httpClient.get<ApiResponse<Skill[]>>("/skills");
  return response.data.data;
}

export async function createSkill(payload: {
  name: string;
  description: string;
  prompt: string;
  mode?: "prompt" | "module";
  module_entry?: string;
  auto_triggers?: string[];
}): Promise<Skill> {
  const response = await httpClient.post<ApiResponse<Skill>>(
    "/skills",
    payload,
  );
  return response.data.data;
}

export async function updateSkill(
  id: string,
  payload: {
    name?: string;
    description?: string;
    prompt?: string;
    mode?: "prompt" | "module";
    module_entry?: string;
    auto_triggers?: string[];
  },
): Promise<Skill> {
  const response = await httpClient.put<ApiResponse<Skill>>(
    `/skills/${id}`,
    payload,
  );
  return response.data.data;
}

export async function deleteSkill(id: string): Promise<void> {
  await httpClient.delete(`/skills/${id}`);
}

export async function runSkill(
  id: string,
  task: string,
): Promise<SkillRunResult> {
  const response = await httpClient.post<ApiResponse<SkillRunResult>>(
    `/skills/${id}/run`,
    { task },
  );
  return response.data.data;
}
