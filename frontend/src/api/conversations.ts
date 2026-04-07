import { httpClient } from "./http";
import type { Conversation, ConversationWithMessages } from "./types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export async function getConversations(
  limit: number = 20,
): Promise<Conversation[]> {
  const response = await httpClient.get<ApiResponse<Conversation[]>>(
    "/conversations",
    {
      params: { limit },
    },
  );

  return response.data.data;
}

export async function createConversation(
  title?: string,
): Promise<Conversation> {
  const response = await httpClient.post<ApiResponse<Conversation>>(
    "/conversations",
    {
      title,
    },
  );

  return response.data.data;
}

export async function getConversation(
  id: number,
): Promise<ConversationWithMessages> {
  const response = await httpClient.get<ApiResponse<ConversationWithMessages>>(
    `/conversations/${id}`,
  );

  return response.data.data;
}

export async function updateConversationTitle(
  id: number,
  title: string,
): Promise<Conversation> {
  const response = await httpClient.put<ApiResponse<Conversation>>(
    `/conversations/${id}`,
    {
      title,
    },
  );

  return response.data.data;
}

export async function deleteConversation(id: number): Promise<void> {
  await httpClient.delete(`/conversations/${id}`);
}
