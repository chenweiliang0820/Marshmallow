# Supabase 設定指南

## 📋 資料庫結構

需要在 Supabase 中建立以下資料表：

### `canva_prompts` 資料表

用於儲存 Canva 提示詞及其範例。

```sql
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

-- 設定 RLS 政策（允許所有人讀取，僅認證用戶可寫入）
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
```

## 🔧 設定步驟

### 1. 建立 Supabase 專案

1. 前往 [Supabase](https://supabase.com/)
2. 註冊/登入帳號
3. 點擊 "New Project" 建立新專案
4. 填寫專案資訊：
   - **Project Name**: `marshmallow-toolbox`
   - **Database Password**: 設定強密碼（請記下）
   - **Region**: 選擇最接近您的區域

### 2. 執行 SQL 建立資料表

**方法一：使用 SQL 檔案（推薦）**

1. 開啟專案中的 `supabase-setup.sql` 檔案
2. **只複製 SQL 語句部分**（從 `CREATE TABLE` 開始到檔案結尾）
3. 在 Supabase Dashboard 中，前往 **SQL Editor**
4. 貼上 SQL 語句
5. 點擊 **Run** 執行

**方法二：使用下方 SQL 語句**

1. 在 Supabase Dashboard 中，前往 **SQL Editor**
2. 複製下方 ```sql 程式碼區塊中的內容（**不要複製 Markdown 標題和格式**）
3. 貼上 SQL 語句
4. 點擊 **Run** 執行

⚠️ **重要**：只複製純 SQL 語句，不要包含任何 Markdown 格式（如 `###`、```等）

### 3. 取得 API 金鑰

1. 在 Supabase Dashboard 中，前往 **Settings** → **API**
2. 複製以下資訊：
   - **Project URL** (`https://xxxxx.supabase.co`)
   - **anon/public key** (開頭為 `eyJ...`)

### 4. 設定環境變數

在專案根目錄建立 `.env` 檔案：

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **重要**：
- `.env` 檔案已在 `.gitignore` 中，不會被上傳到 GitHub
- 請確保不要將 API 金鑰提交到版本控制

### 5. 測試連線

執行 `npm run dev` 啟動開發伺服器，瀏覽器控制台應該會顯示 Supabase 連線狀態。

## 📊 資料範例

建立資料表後，可以手動插入一些範例資料：

```sql
INSERT INTO canva_prompts (title, description, category, tags, content, example_result)
VALUES (
  '上安國小全校人數圖',
  '可愛風格的統計表格設計提示詞',
  'education',
  ARRAY['教育', '統計表', '可愛風格'],
  '請幫我設計一張「上安國小全校人數圖」的可愛風格統計表。

標題：
上安國小全校人數圖

表格內容：
- 橫向欄位：年級、男、女、合計
- 直向列：一年級、二年級、三年級、四年級、五年級、六年級

設計風格：
- 可愛、活潑、適合國小學生
- 使用圓角表格與柔和線條
- 字體可愛但清楚好讀
- 可加入小圖示（例如鉛筆、書本、星星、笑臉）
- 整體不雜亂，保留填寫空間

色彩與版面：
- 色系：粉色、淺藍、淺黃色等柔和色系
- 背景乾淨、不影響書寫
- A4 直式版面，適合列印或電子填寫

其他需求：
- 表格中的數字保持空白，方便後續填寫',
  '一個適合國小學生的可愛風格統計表，包含年級人數統計欄位'
);
```

## 🔐 安全性建議

1. **Row Level Security (RLS)**：已啟用，可根據需求調整政策
2. **API 金鑰**：使用 `anon` key 即可，不要使用 `service_role` key
3. **環境變數**：確保 `.env` 檔案不會被提交到 GitHub

## ❓ 常見問題

### Q: 如何查看資料表中的資料？

**A:** 在 Supabase Dashboard 中，前往 **Table Editor**，選擇 `canva_prompts` 資料表即可查看。

### Q: 如何備份資料？

**A:** 在 Supabase Dashboard 中，前往 **Settings** → **Database** → **Backups` 查看備份選項。

### Q: 需要認證功能嗎？

**A:** 目前設定為公開存取。如果需要用戶認證功能，可以修改 RLS 政策。

---

**完成設定後，請重新啟動開發伺服器以載入環境變數！**