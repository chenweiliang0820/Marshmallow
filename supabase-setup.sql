-- Supabase 資料庫設定 SQL
-- 請在 Supabase SQL Editor 中執行此檔案
-- 只複製從這裡開始到檔案結尾的 SQL 語句，不要包含任何 Markdown 格式

-- 建立 canva_prompts 資料表
CREATE TABLE canva_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[],
  content TEXT NOT NULL,
  example_result TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引以提高查詢效能
CREATE INDEX idx_canva_prompts_category ON canva_prompts(category);
CREATE INDEX idx_canva_prompts_created_at ON canva_prompts(created_at DESC);
CREATE INDEX idx_canva_prompts_tags ON canva_prompts USING GIN(tags);

-- 啟用 Row Level Security (RLS)
ALTER TABLE canva_prompts ENABLE ROW LEVEL SECURITY;

-- 設定 RLS 政策（允許所有人讀取和寫入）
CREATE POLICY "Anyone can read canva_prompts"
  ON canva_prompts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert canva_prompts"
  ON canva_prompts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update canva_prompts"
  ON canva_prompts FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete canva_prompts"
  ON canva_prompts FOR DELETE
  USING (true);

-- 自動更新 updated_at 的觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
CREATE TRIGGER update_canva_prompts_updated_at
  BEFORE UPDATE ON canva_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();