import axios from 'axios'

const API_BASE_URL = '/api'

export interface CommandResponse {
  success: boolean
  message: string
  data?: any
}

export const daxiaAPI = {
  // 执行命令
  async executeCommand(command: string, args?: string[]): Promise<CommandResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/command`, {
        command,
        args: args || []
      })
      return response.data
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '请求失败'
      }
    }
  },

  // 获取天气
  async getWeather(): Promise<CommandResponse> {
    return this.executeCommand('weather')
  },

  // 获取新闻
  async getNews(): Promise<CommandResponse> {
    return this.executeCommand('news')
  },

  // 获取邮件
  async getEmail(): Promise<CommandResponse> {
    return this.executeCommand('email')
  },

  // 生成总结
  async generateSummary(): Promise<CommandResponse> {
    return this.executeCommand('summary')
  },

  // 连接微信
  async connectWeChat(): Promise<CommandResponse> {
    return this.executeCommand('wx')
  },

  // 分析项目
  async analyzeProject(): Promise<CommandResponse> {
    return this.executeCommand('analyze')
  },

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`)
      return response.status === 200
    } catch {
      return false
    }
  }
}
