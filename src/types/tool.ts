export interface Tool {
  id: string
  name: string
  description: string
  icon: string
  category: string
  tags: string[]
  route: string
}

export interface ToolCategory {
  id: string
  name: string
  description: string
}