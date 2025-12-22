# Google Apps Script Template Repo (TypeScript + JSDoc)

這是一個「一個 Repo = 一個 GAS 專案」的 Template Repo。


- ✅ TypeScript 開發、ESLint + JSDoc 規範
- ✅ GitHub Actions：PR 檢查、push main 自動 `clasp push` 部署
- ✅ 內建離線參考資料：`shared/google-apps-script-api-reference/`

## 快速開始（3 分鐘）

1. `npm install`
2. `cp .clasp.json.example .clasp.json`，填入 scriptId
3. `npx clasp login --no-localhost` 取得 `~/.clasprc.json`
4. `npm run check:clasprc -- --print --base64`：確認憑證完整，並輸出純文字與 Base64 版本的 Secret 區塊（避免複製過程被改）
5. 把 `npm run check:clasprc` 印出的區塊貼到 GitHub Secrets：`CLASPRC_JSON`（預設貼 Base64 區塊，純 JSON 也可）
6. push 到 `main` → 會自動部署

> `npm run check:clasprc -- --print --base64` 會驗證 `~/.clasprc.json` 是否包含 `refresh_token` / `clientId` / `clientSecret`，並以 `-----BEGIN/END CLASPRC_JSON-----` 包起來方便複製，同時提供 Base64 版本以避免貼上時被工具轉義。Missing 欄位時會直接報錯，避免在 CI 才發現 Secret 缺欄位。

完整流程與規範請看：**AGENTS.md**
