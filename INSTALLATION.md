# 安裝指南 - 棉花糖工具箱

## 問題：npm 無法辨識

如果您看到 `npm : 無法辨識 'npm' 詞彙...` 的錯誤，表示 **Node.js 尚未安裝**。

---

## ✅ 解決方案：安裝 Node.js

### 方法一：從官網下載（推薦）

1. **下載 Node.js**
   - 前往官方網站：https://nodejs.org/
   - 下載 **LTS 版本**（推薦，較穩定）
   - 例如：`v20.x.x` 或 `v18.x.x`

2. **執行安裝程式**
   - 下載後執行 `.msi` 安裝檔
   - 依預設選項安裝（會自動加入 PATH）
   - 安裝過程中確保勾選 **"Add to PATH"** 選項

3. **驗證安裝**
   - 重新開啟 PowerShell 或命令提示字元
   - 執行以下命令確認：
   ```powershell
   node --version
   npm --version
   ```
   - 應該會顯示版本號（例如：`v20.10.0` 和 `10.2.3`）

### 方法二：使用 Chocolatey（如果已安裝）

如果您已安裝 Chocolatey 套件管理器：

```powershell
choco install nodejs-lts
```

---

## 🔧 安裝完 Node.js 後的步驟

### 1. 安裝專案依賴

在專案目錄中執行：

```powershell
cd C:\棉花糖工具箱
npm install
```

### 2. 啟動開發伺服器

```powershell
npm run dev
```

成功後會看到類似訊息：
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 3. 在瀏覽器開啟

開啟瀏覽器，前往：`http://localhost:5173/`

---

## ❓ 常見問題

### Q: 安裝後仍然無法使用 npm？

**A: 請重新開啟終端機**
- 關閉目前的 PowerShell 視窗
- 重新開啟新的 PowerShell 視窗
- 再次執行 `npm --version` 測試

### Q: 還是找不到 npm？

**A: 檢查 PATH 環境變數**
1. 按 `Win + R`，輸入 `sysdm.cpl`
2. 選擇「進階」→「環境變數」
3. 在「系統變數」中找到 `Path`
4. 確認包含 Node.js 安裝路徑（通常是 `C:\Program Files\nodejs\`）
5. 如果沒有，手動新增並重新啟動終端機

### Q: 專案路徑有中文會影響嗎？

**A: 通常不會**
- Vite 和 Node.js 都支援中文路徑
- 如果遇到編碼問題，建議使用英文路徑

---

## 📝 下一步

安裝完成後，您可以：

1. ✅ 測試本地運行（`npm run dev`）
2. 📤 上傳至 GitHub（版本控制）
3. ☁️ 整合 Supabase（如果需要後端服務）
4. 🚀 部署至 Netlify（上線）

---

**需要協助嗎？** 如果安裝過程中遇到任何問題，請隨時提問！