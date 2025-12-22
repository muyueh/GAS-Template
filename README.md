# Google Apps Script Template Repo (TypeScript + JSDoc)

這是一個「一個 Repo = 一個 GAS 專案」的 Template Repo。


- ✅ TypeScript 開發、ESLint + JSDoc 規範
- ✅ GitHub Actions：PR 檢查、push main 自動 `clasp push` 部署
- ✅ 內建離線參考資料：`shared/google-apps-script-api-reference/`

## 快速開始（3 分鐘）

1. `npm install`
2. `cp .clasp.json.example .clasp.json`，填入 scriptId
3. `npx clasp login` 取得 `~/.clasprc.json`
4. 把 `~/.clasprc.json` 內容貼到 GitHub Secrets：`CLASPRC_JSON`
5. push 到 `main` → 會自動部署

完整流程與規範請看：**AGENTS.md**
