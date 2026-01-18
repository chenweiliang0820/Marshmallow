# Git 安裝與 GitHub 上傳指南

## 🔍 問題：Git 未安裝

系統找不到 `git` 命令，表示 **Git 尚未安裝**。

---

## ✅ 解決方案：安裝 Git

### 方法一：從官網下載（推薦）

1. **下載 Git for Windows**
   - 前往官方網站：https://git-scm.com/download/win
   - 下載最新版本（通常會自動選擇正確版本）
   - 檔案大小約 50-60 MB

2. **執行安裝程式**
   - 執行下載的 `.exe` 安裝檔
   - **重要選項**：
     - ✅ 勾選 "Git from the command line and also from 3rd-party software"
     - ✅ 勾選 "Use bundled OpenSSH"
     - ✅ 使用預設編輯器（或選擇您喜歡的）
     - ✅ 使用預設分支名稱（main）
   - 其他選項使用預設即可

3. **驗證安裝**
   - **重新開啟 PowerShell**（很重要！）
   - 執行以下命令確認：
   ```powershell
   git --version
   ```
   - 應該會顯示版本號（例如：`git version 2.43.0`）

### 方法二：使用 Winget（Windows 11）

如果您使用 Windows 11 且已安裝 Winget：

```powershell
winget install --id Git.Git -e --source winget
```

安裝完成後，**重新開啟 PowerShell**。

---

## 📤 安裝完成後的步驟

### 步驟 1：初始化 Git 儲存庫

在專案目錄中執行：

```powershell
cd C:\棉花糖工具箱

# 初始化 Git
git init

# 檢查狀態
git status
```

### 步驟 2：第一次提交

```powershell
# 加入所有檔案
git add .

# 建立第一次提交
git commit -m "Initial commit: 棉花糖工具箱專案初始化

- 建立 React + Vite + TypeScript 專案
- 設定 Tailwind CSS 深色主題
- 建立首頁、工具列表頁、工具詳情頁
- 新增範例工具（Canva 工具集）
- 完成基礎路由系統"
```

### 步驟 3：在 GitHub 建立儲存庫

1. **登入 GitHub**
   - 前往 https://github.com
   - 登入您的帳號（如果沒有帳號，先註冊）

2. **建立新儲存庫**
   - 點擊右上角「+」圖示 → 選擇「New repository」
   - **Repository name**: `marshmallow-toolbox`（或自訂名稱）
   - **Description**: `專業工具集合平台 - 棉花糖工具箱`
   - 選擇 **Public**（公開）或 **Private**（私有）
   - ⚠️ **不要**勾選以下選項（我們已有這些檔案）：
     - ❌ Add a README file
     - ❌ Add .gitignore
     - ❌ Choose a license
   - 點擊「Create repository」

3. **複製儲存庫網址**
   - 建立後會看到儲存庫頁面
   - 複製 HTTPS 網址，例如：
     ```
     https://github.com/YOUR_USERNAME/marshmallow-toolbox.git
     ```

### 步驟 4：連接並推送上傳

```powershell
# 連接遠端儲存庫（將 YOUR_USERNAME 替換為您的 GitHub 帳號）
git remote add origin https://github.com/YOUR_USERNAME/marshmallow-toolbox.git

# 檢查遠端設定
git remote -v

# 設定分支名稱（如果還沒設定）
git branch -M main

# 推送上傳（首次推送）
git push -u origin main
```

### 🔐 驗證問題

如果執行 `git push` 時要求輸入帳號密碼：

- **Username**: 輸入您的 GitHub 帳號名稱
- **Password**: ⚠️ **不要輸入密碼**，需要使用 **Personal Access Token**

#### 如何建立 Personal Access Token？

1. **開啟 GitHub Settings**
   - 點擊右上角頭像 → Settings
   - 或直接前往：https://github.com/settings/tokens

2. **建立 Token**
   - 左側選單：Developer settings → Personal access tokens → Tokens (classic)
   - 點擊「Generate new token (classic)」

3. **設定 Token**
   - **Note**: 輸入說明，例如「Marshmallow Toolbox」
   - **Expiration**: 選擇期限（建議 90 天或更長）
   - **Scopes**: 勾選 `repo`（完整權限）
   - 點擊「Generate token」

4. **複製 Token**
   - ⚠️ **重要**：Token 只會顯示一次，請立即複製並妥善保存
   - 如果遺失，需要重新建立

5. **使用 Token**
   - 在 `git push` 要求密碼時，**貼上 Token 而不是密碼**

---

## 🔄 日後更新專案

當您修改程式碼後，使用以下命令更新 GitHub：

```powershell
# 檢查變更
git status

# 加入變更檔案
git add .

# 提交變更
git commit -m "描述您的變更內容"

# 推送上傳
git push
```

---

## ❓ 常見問題

### Q: `git push` 失敗，顯示認證錯誤？

**A: 解決方法：**
- 確認已使用 Personal Access Token 而不是密碼
- 確認 Token 權限包含 `repo`
- 可以嘗試清除認證快取：
  ```powershell
  git credential-manager-core erase
  ```
  然後再次執行 `git push`

### Q: 想重新連接不同的儲存庫？

**A: 刪除遠端並重新設定：**
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/NEW_REPO_NAME.git
git push -u origin main
```

### Q: 忘記提交訊息格式？

**A: 基本格式：**
```powershell
git commit -m "簡短描述（第一行）" -m "詳細說明（可選，第二行）"
```

---

## ✅ 完成！

上傳成功後，您的專案就會出現在 GitHub 上。您可以在 GitHub 網站上：

- 📖 查看程式碼
- 🔗 分享專案連結
- 📝 管理 Issues 和 Pull Requests
- 🚀 準備部署至 Netlify

**需要協助嗎？** 如果在上傳過程中遇到任何問題，請告訴我！