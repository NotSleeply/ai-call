import { httpClient } from "./http";
import type { CommandResponse } from "./types";

export async function executeCommand(
  command: string,
  conversationId?: number,
): Promise<CommandResponse> {
  try {
    const response = await httpClient.post<CommandResponse>("/command", {
      command,
      conversationId,
    });

    return response.data;
  } catch (error: unknown) {
    const message =
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: { data?: { message?: string } } }).response
        ?.data?.message === "string"
        ? (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message || "请求失败"
        : "请求失败";

    return {
      success: false,
      message,
    };
  }
}

export function getWeather(conversationId?: number): Promise<CommandResponse> {
  return executeCommand("weather", conversationId);
}

export function getNews(conversationId?: number): Promise<CommandResponse> {
  return executeCommand("news", conversationId);
}

export function getEmail(conversationId?: number): Promise<CommandResponse> {
  return executeCommand("email", conversationId);
}

export function generateSummary(
  conversationId?: number,
): Promise<CommandResponse> {
  return executeCommand("summary", conversationId);
}

export function connectWeChat(
  conversationId?: number,
): Promise<CommandResponse> {
  return executeCommand("wx", conversationId);
}

export function analyzeProject(
  conversationId?: number,
): Promise<CommandResponse> {
  return executeCommand("analyze", conversationId);
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await httpClient.get("/health");
    return response.status === 200;
  } catch {
    return false;
  }
}
