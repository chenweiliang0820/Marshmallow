// Canva 提示詞資料型別

export interface CanvaPrompt {
  id: string
  title: string
  description?: string
  category: string
  tags?: string[]
  content: string // 完整的提示詞內容
  example_result?: string // 範例結果（可選）
  created_at: string
  updated_at: string
  usage_count?: number // 使用次數
}

export interface CanvaPromptCategory {
  id: string
  name: string
  description?: string
  icon?: string
}

// 提示詞表單資料
export interface CanvaPromptFormData {
  title: string
  description?: string
  category: string
  tags?: string[]
  content: string
  example_result?: string
}