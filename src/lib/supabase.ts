import { createClient } from '@supabase/supabase-js'

// Supabase 配置
// 請在 .env 檔案中設定這些環境變數
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your .env file.')
}

// 建立 Supabase 客戶端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 測試連線
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('canva_prompts').select('count').limit(1)
    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Supabase connection test failed:', err)
    return false
  }
}