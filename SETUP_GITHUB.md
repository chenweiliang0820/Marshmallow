# GitHub 上傳指南

## 📤 將專案上傳至 GitHub

### 前置準備

1. **確保 Node.js 已安裝**（參考 `INSTALLATION.md`）
2. **確保專案可以正常運行**（`npm run dev` 成功）

---

## 🚀 步驟一：初始化 Git 儲存庫

在專案目錄中執行：

```powershell
cd C:\棉花糖工具箱

# 初始化 Git
git init

# 檢查狀態
git status
```

---

## 📝 步驟二：建立 .gitignore（已完成）

專案已包含 `.gitignore` 檔案，會自動排除：
- `node_modules/`
- `dist/`
- `.env` 檔案
- 其他暫存檔案

---

## ✅ 步驟三：第一次提交

```powershell
# 加入所有檔案
git add .

# 建立第一次提交
git commit -m "Initial commit: 棉花糖工具箱專案初始化"
```

---

## 🌐 步驟四：在 GitHub 建立儲存庫

1. **登入 GitHub**
   - 前往 https://github.com
   - 登入您的帳號

2. **建立新儲存庫**
   - 點擊右上角「+」→「New repository」
   - Repository name: `marshmallow-toolbox`（或自訂名稱）
   - Description: `專業工具集合平台 - 棉花糖工具箱`
   - 選擇 **Public** 或 **Private**
   - ⚠️ **不要**勾選「Initialize with README」（我們已有 README）
   - 點擊「Create repository」

3. **複製儲存庫網址**
   - 建立後會看到儲存庫網址
   - 例如：`https://github.com/您的帳號/marshmallow-toolbox.git`

---

## 📤 步驟五：連接並推送上傳

```powershell
# 連接遠端儲存庫（將 YOUR_USERNAME 替換為您的 GitHub 帳號）
git remote add origin https://github.com/YOUR_USERNAME/marshmallow-toolbox.git

# 檢查遠端設定
git remote -v

# 推送上傳（首次推送）
git branch -M main
git push -u origin main
```

### 如果需要驗證

如果要求輸入帳號密碼：
- **Username**: 您的 GitHub 帳號
- **Password**: 使用 **Personal Access Token**（不是密碼）

#### 如何建立 Personal Access Token？

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. 勾選 `repo` 權限
4. 複製產生的 Token
5. 使用此 Token 作為密碼

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

## 📋 建議的 README 內容

專案已包含 `README.md`，您可以在 GitHub 上查看。如果需要在 GitHub 顯示專案預覽圖或徽章，可以更新 README。

---

## ❓ 常見問題

### Q: `git push` 失敗？

**A: 檢查以下事項：**
- 確認已登入 GitHub
- 確認遠端網址正確（`git remote -v`）
- 確認 Token 權限正確

### Q: 想重新開始？

**A: 刪除遠端並重新設定：**
```powershell
git remote remove origin
# 然後重新執行步驟四和五
```

---

## ✅ 完成！

上傳成功後，您的專案就會出現在 GitHub 上。接下來可以：

1. 📖 在 GitHub 上查看程式碼
2. 🔗 分享專案連結給其他人
3. ☁️ 準備部署至 Netlify

**需要協助嗎？** 如果在上傳過程中遇到問題，請告訴我！