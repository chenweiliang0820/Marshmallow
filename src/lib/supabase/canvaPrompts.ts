import { supabase } from '../supabase'
import { CanvaPrompt, CanvaPromptFormData } from '@/types/canva'

// 取得所有提示詞
export const getAllPrompts = async (): Promise<CanvaPrompt[]> => {
  try {
    const { data, error } = await supabase
      .from('canva_prompts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return []
  }
}

// 依分類取得提示詞
export const getPromptsByCategory = async (category: string): Promise<CanvaPrompt[]> => {
  try {
    const { data, error } = await supabase
      .from('canva_prompts')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching prompts by category:', error)
    return []
  }
}

// 取得單一提示詞
export const getPromptById = async (id: string): Promise<CanvaPrompt | null> => {
  try {
    const { data, error } = await supabase
      .from('canva_prompts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching prompt:', error)
    return null
  }
}

// 新增提示詞
export const createPrompt = async (prompt: CanvaPromptFormData): Promise<CanvaPrompt | null> => {
  try {
    const { data, error } = await supabase
      .from('canva_prompts')
      .insert({
        ...prompt,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating prompt:', error)
    return null
  }
}

// 更新提示詞
export const updatePrompt = async (
  id: string,
  prompt: Partial<CanvaPromptFormData>
): Promise<CanvaPrompt | null> => {
  try {
    const { data, error } = await supabase
      .from('canva_prompts')
      .update({
        ...prompt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating prompt:', error)
    return null
  }
}

// 刪除提示詞
export const deletePrompt = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('canva_prompts').delete().eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting prompt:', error)
    return false
  }
}

// 增加使用次數
export const incrementUsageCount = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('increment_usage_count', { prompt_id: id })

    if (error) {
      // 如果 RPC 不存在，手動更新
      const prompt = await getPromptById(id)
      if (prompt) {
        await updatePrompt(id, {})
        // 手動更新 usage_count
        const { error: updateError } = await supabase
          .from('canva_prompts')
          .update({ usage_count: (prompt.usage_count || 0) + 1 })
          .eq('id', id)

        if (updateError) throw updateError
      }
    }
    return true
  } catch (error) {
    console.error('Error incrementing usage count:', error)
    return false
  }
}

// 搜尋提示詞
export const searchPrompts = async (query: string): Promise<CanvaPrompt[]> => {
  try {
    const { data, error } = await supabase
      .from('canva_prompts')
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error searching prompts:', error)
    return []
  }
}