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

> `npm run check:clasprc -- --print --base64` 會驗證 `~/.clasprc.json` 是否包含 refresh token 與 OAuth client ID/secret。clasp v3 會把欄位存在 `tokens.default.client_id/client_secret`（snake_case），舊版則是 `clientId/clientSecret` 或 `oauth2ClientSettings`；腳本會同時接受這兩種格式，並以 `-----BEGIN/END CLASPRC_JSON-----` 包起來方便複製，同時提供 Base64 版本以避免貼上時被工具轉義。Missing 欄位時會直接報錯，避免在 CI 才發現 Secret 缺欄位。

完整流程與規範請看：**AGENTS.md**

## GAS Bootstrap（request/state + Actions）

Repo 內的 `.gas/` 目錄提供「可供 Actions 消費的 request/state」雙檔案，讓沒有本機憑證的 Agent 也能透過 PR 觸發 bootstrap：

- `.gas/request.json`：請求檔，`kind` 需為 `gas.bootstrap`，`mode` 可選 `create` 或 `link`。預設 `enabled=false`，改成 `true` 並填好欄位後 merge 到 `main`，`gas-bootstrap.yml` 會觸發。
- `.gas/state.json`：狀態檔，僅由 Actions 回寫，包含 `auth.verified` 與 `gas.scriptId` 等欄位。只有當 `auth.verified=true` 且 `gas.scriptId` 有值時才視為可部署。

流程概要：

1. 編輯 `.gas/request.json`：設定 `mode=create`（新建專案）或 `mode=link`（綁定既有 Script ID），把 `enabled` 調成 `true` 並依需求填 `title`、`type`、`parentId` 或 `existingScriptId`。
2. 提交/merge 到 `main`。
3. `gas-bootstrap.yml` 會讀取 `CLASPRC_JSON` Secret、create/link 專案，寫入 `.clasp.json`、`.gas/state.json`，並自動開 PR 回寫結果，同時把 `.gas/request.json` 重設為 disabled。
4. 人類/Agent merge bot PR 後，`deploy.yml` 才會開始在 `main` push 上執行 `clasp push`/`clasp deploy`。
