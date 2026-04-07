import axios from "axios";

const API_BASE_URL = "/api";

export interface CommandResponse {
  success: boolean;
  message: string;
  data?: any;
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

export const daxiaAPI = {
  // ==================== 对话相关 ====================

  // 获取对话列表
  async getConversations(limit: number = 20): Promise<Conversation[]> {
    const response = await axios.get(`${API_BASE_URL}/conversations`, {
      params: { limit },
    });
    return response.data.data;
  },

  // 创建新对话
  async createConversation(title?: string): Promise<Conversation> {
    const response = await axios.post(`${API_BASE_URL}/conversations`, {
      title,
    });
    return response.data.data;
  },

  // 获取对话详情（含消息）
  async getConversation(id: number): Promise<ConversationWithMessages> {
    const response = await axios.get(`${API_BASE_URL}/conversations/${id}`);
    return response.data.data;
  },

  // 更新对话标题
  async updateConversationTitle(
    id: number,
    title: string,
  ): Promise<Conversation> {
    const response = await axios.put(`${API_BASE_URL}/conversations/${id}`, {
      title,
    });
    return response.data.data;
  },

  // 删除对话
  async deleteConversation(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/conversations/${id}`);
  },

  // ==================== 命令执行 ====================

  // 执行命令
  async executeCommand(
    command: string,
    conversationId?: number,
  ): Promise<CommandResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/command`, {
        command,
        conversationId,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "请求失败",
      };
    }
  },

  // ==================== 快捷命令 ====================

  // 获取天气
  async getWeather(conversationId?: number): Promise<CommandResponse> {
    return this.executeCommand("weather", conversationId);
  },

  // 获取新闻
  async getNews(conversationId?: number): Promise<CommandResponse> {
    return this.executeCommand("news", conversationId);
  },

  // 获取邮件
  async getEmail(conversationId?: number): Promise<CommandResponse> {
    return this.executeCommand("email", conversationId);
  },

  // 生成总结
  async generateSummary(conversationId?: number): Promise<CommandResponse> {
    return this.executeCommand("summary", conversationId);
  },

  // 连接微信
  async connectWeChat(conversationId?: number): Promise<CommandResponse> {
    return this.executeCommand("wx", conversationId);
  },

  // 分析项目
  async analyzeProject(conversationId?: number): Promise<CommandResponse> {
    return this.executeCommand("analyze", conversationId);
  },

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.status === 200;
    } catch {
      return false;
    }
  },
};
