import { httpClient } from "./http";
import type {
  CommandResponse,
  CreateSchedulePayload,
  ScheduledTask,
  ScheduledTaskRun,
} from "./types";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export async function listSchedules(
  conversationId: number,
): Promise<ScheduledTask[]> {
  const response = await httpClient.get<ApiResponse<ScheduledTask[]>>(
    "/schedules",
    {
      params: { conversationId },
    },
  );

  return response.data.data || [];
}

export async function createSchedule(
  payload: CreateSchedulePayload,
): Promise<CommandResponse> {
  const response = await httpClient.post<CommandResponse>(
    "/schedules",
    payload,
  );
  return response.data;
}

export async function updateScheduleEnabled(
  taskId: number,
  enabled: boolean,
): Promise<CommandResponse> {
  const response = await httpClient.patch<CommandResponse>(
    `/schedules/${taskId}`,
    {
      enabled,
    },
  );
  return response.data;
}

export async function runScheduleNow(taskId: number): Promise<CommandResponse> {
  const response = await httpClient.post<CommandResponse>(
    `/schedules/${taskId}/run`,
  );
  return response.data;
}

export async function listScheduleRuns(
  taskId: number,
  limit: number = 20,
): Promise<ScheduledTaskRun[]> {
  const response = await httpClient.get<ApiResponse<ScheduledTaskRun[]>>(
    `/schedules/${taskId}/runs`,
    {
      params: { limit },
    },
  );

  return response.data.data || [];
}

export async function deleteSchedule(taskId: number): Promise<CommandResponse> {
  const response = await httpClient.delete<CommandResponse>(
    `/schedules/${taskId}`,
  );
  return response.data;
}
