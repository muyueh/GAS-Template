# AGENTS.md


> 目標：這個 repo 是「Template Repo：一個 Repo = 一個 GAS 專案」。  
> 所有要部署到 Google Apps Script 的程式碼都用 TypeScript + JSDoc，並由 GitHub Actions 在 push main 後自動部署。

---

## 0) TL;DR（給 Agent 的最短操作路徑）

- 新 repo / 新環境第一次跑：
  1. `node -v && npm -v`
  2. `npm install`
  3. 建立 `.clasp.json`（scriptId + rootDir=dist，並 commit）
  4. `npx clasp login --status`（沒登入就 `npx clasp login --no-localhost`）
  5. 把 `~/.clasprc.json` 內容放到 GitHub Secrets：`CLASPRC_JSON`
- 改 code 前後一定要：
  - `npm run check`
  - 改到 `src/**` 或 `appsscript.json` → PR Body 填 `## Reference Check`

---

## 1) 核心原則（不可違反）

1. **GAS 程式碼一律使用 TypeScript（.ts）**
   - Repo 內「要被部署到 Apps Script 的程式」都放在 `src/`
   - `src/` 只允許 `.ts` / `.html` / `.css`

2. **所有 exported 的函式 / 類別 / 會被外部呼叫的入口點，必須寫 JSDoc**
   - 函式：描述用途、邊界條件、`@param`、`@returns`，必要時 `@throws`
   - 類別：說明責任、使用方式與不變量

3. **Triggers / Menus / WebApp 等入口點必須是「全域函式」**
   - 我們用 `src/lib/registerGlobals.ts` 把函式掛到 `globalThis`
   - Apps Script 才能用字串名稱呼叫（例如觸發器、選單 callback）

4. **Repo 是單一真相來源**
   - `clasp push -f` 會以 repo 覆蓋遠端（移除遠端不存在於本地的檔案）
   - 請不要依賴線上編輯器做臨時改動（會被下一次部署清掉）

---

## 2) 工具鏈前置條件（Node / npm / clasp）

### 2.1 確認 Node 與 npm 有安裝

在任何地方（建議 repo root）執行：

```bash
node -v
npm -v
````

預期結果：

* 兩個指令都要有版本號輸出
* Node 版本建議為 **LTS 或更高**（例如 `v18.x` / `v20.x`）

---

### 2.2 安裝或確認 `clasp` 版本（≥ 3.1.0）

**優先策略：建議一律用 `npx clasp ...`**

* 因為 repo 內會鎖定 `@google/clasp` 版本（CI 也用同一套）
* 這樣最穩、最可重現

確認版本（擇一）：

```bash
npx clasp -v
# 或
clasp -v
```

要求：版本號 **≥ 3.1.0**


---

### 2.3 檢查 `clasp` 登入狀態

在可跑指令的環境中：

```bash
npx clasp login --status
```

可能狀況：

1. ✅ 已登入，顯示目前 Google 帳號
   → 確認這就是你要拿來部署該 Apps Script 專案的帳號

2. ⚠️ 尚未登入 / token 過期 / 帳號錯誤
   → 進入重新登入流程

---

### 2.4 重新登入 `clasp`（建議用 `--no-localhost`）

如果需要重新登入，請執行：

```bash
npx clasp login --no-localhost
```

典型流程：

1. `clasp` 會在終端機印出一段 URL
2. 你應該在瀏覽器開啟該網址，授權 Apps Script API
3. 最後會得到一組 code，把 code 貼回終端機
4. 再次確認：

```bash
npx clasp login --status
```

務必確認：

* 已登入
* 帳號正確（就是要用來部署的那個）

---

### 2.5 Fork / 新環境（Codex Cloud / Codespace / 新 VM）注意事項

重要觀念：

* `clasp login` 是「**機器 / 環境**」層級設定
* 每個新的環境（新 VM、新 Codespace、新 local clone、Codex Cloud 新容器）都需要重新登入一次

常見情境：

* 「我在本機能 `clasp push`，但 CI 失敗」
  → CI 不會跑 `clasp login`，它吃的是 GitHub Secret：`CLASPRC_JSON`（見第 4 節）

---

## 3) Repo 結構（你要去哪裡改什麼）

* `src/`：**所有要部署的 GAS 程式碼（TS）**

  * `src/index.ts`：打包入口（只做 bootstrap + register globals）
  * `src/lib/registerGlobals.ts`：把 entrypoints 掛到 `globalThis`
  * `src/features/*`：功能模組（可當 starter modules）
  * `src/ui/*`：WebApp/Sidebar 的 HTML（build 會複製到 `dist/`）
* `appsscript.json`：GAS manifest（build 會複製到 `dist/`）
* `dist/`：建置輸出（CI/本機產生）

  * **不要手動改**
  * **不需要 commit**
* `scripts/build.mjs`：esbuild 打包（TS → `dist/Code.js`）
* `.clasp.json`：每個專案自己的 scriptId（**需要 commit**）
* `.clasp.json.example`：範本
* `shared/google-apps-script-api-reference/`：離線參考資料（給 Reference Check 用）

---

## 4) 新專案建立流程（Use this template 後要做的事）

### Step A：建立 GAS 專案並取得 Script ID

兩種方式擇一：

* 方式 1（推薦）：先在 Apps Script UI 建立專案

  1. 到 Apps Script 建立新專案（或綁定 Sheet / Doc / Form）
  2. 取得 Script ID（專案設定或 URL 內通常可找到）

* 方式 2：用 clasp 建立（需要先完成 Step C 的登入）

  ```bash
  npx clasp create --type standalone --title "<你的專案名>"
  ```

---

### Step B：把 Repo 連到該 GAS 專案（建立 `.clasp.json`）

在 repo 根目錄：

1. 安裝依賴

   ```bash
   npm install
   ```

2. 建立 `.clasp.json`

   * `cp .clasp.json.example .clasp.json`
   * 編輯 `.clasp.json`：

     * `scriptId`: 貼上你的 Script ID
     * `rootDir`: 必須是 `dist`

3. **commit `.clasp.json`**

   * 這是「repo 綁定哪個 GAS 專案」的唯一來源

---

### Step C：本機登入 clasp（產生 `~/.clasprc.json`）

```bash
npx clasp login --status
# 沒登入就：
npx clasp login --no-localhost
```

成功後你會得到：

* `~/.clasprc.json`（**不要 commit**）

---

### Step D：設定 GitHub Actions Secrets（repo-level）

GitHub Repo → Settings → Secrets and variables → Actions：

* **必填：`CLASPRC_JSON`**

  * 值 = 你的 `~/.clasprc.json` 完整內容（整段 JSON）

* **選填：`GAS_DEPLOYMENT_ID`**

  * 只有你需要 CI 自動更新 Web App / Add-on 部署才要
  * 值可由 `npx clasp deployments` 查到

---

## 5) 開發與部署（本機與 CI/CD）

### 5.1 本機常用指令

* `npm run lint`：ESLint + JSDoc 規範
* `npm run typecheck`：TypeScript 型別檢查
* `npm run build`：產生 `dist/`（`dist/Code.js` + `dist/appsscript.json` + `dist/*.html`）
* `npm run deploy`：build 後 `clasp push -f`（把 HEAD 同步到 GAS）

---

### 5.2 CI/CD 規範（已內建）

* PR / push 會跑：`npm run check`（lint + typecheck + build）
* **push 到 main** 會自動：

  1. build
  2. `clasp push -f`（以 repo 覆蓋 GAS HEAD）
  3. 若有設定 `GAS_DEPLOYMENT_ID`，會額外跑：

     * `clasp deploy --deploymentId ...` 更新部署版本

⚠️ 注意：`clasp push -f` 會移除遠端不在本地的檔案，所以請務必以 repo 為準。

---

## 6) 入口點（Triggers / Menus / WebApp）怎麼加

### 規則

* Apps Script 只能用「全域函式名稱」做觸發器 / 選單 callback
* 因為我們打包成單一檔案，一定要在 `src/lib/registerGlobals.ts` 內把入口函式掛到 `globalThis`

範例：

```ts
import { runDailyJob } from '../features/dailyJob';

/**
 * 把需要給 Apps Script 以「字串名稱」呼叫的入口點掛到 globalThis。
 * 注意：請只掛入口點，不要把整個模組都掛出去。
 */
export function registerGlobalFunctions(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  g.runDailyJob = runDailyJob;
}
```

---

## 7) Reference Check（給 Agent 的必做流程）

如果你在 PR 中改到下列任一項：

* `src/**`
* `appsscript.json`

你必須在 PR Body 的 **「## Reference Check」** 填入你查過的參考檔案：

1. 先查 `shared/google-apps-script-api-reference/keyword-index/`
2. 再查對應的 `shared/google-apps-script-api-reference/full-reference/`

最低要求（PR Body 至少列）：

* 1 個 `keyword-index/*.md`
* 1 個 `full-reference/*.md`

---

## 8) Starter modules（在 `src/features`）

* `features/helloWorld.ts`：最小可運行 demo（可當 smoke test）
* `features/sheetsMenu.ts`：Spreadsheet `onOpen` + 自訂選單
* `features/webapp.ts`：`doGet()` + HTML 範例
* `features/triggers.ts`：安裝/刪除觸發器
* `features/drive.ts`：Drive folder helper
* `features/gmail.ts`：Gmail search helper
* `features/sheets.ts`：Spreadsheet helper

---

## 9) Troubleshooting（常見問題）

### CI 失敗：Missing `CLASPRC_JSON`

* 代表 GitHub Secrets 沒設定 `CLASPRC_JSON` 或內容為空
* 請照第 4 節 Step D 設定

---

### CI 失敗：Missing `.clasp.json`

* 代表 repo 還沒綁定 GAS 專案
* 請 `cp .clasp.json.example .clasp.json` 並填上 scriptId，然後 commit

---

### CI 成功但 Web App 沒更新

* Web App / Add-on 的「部署」不是 HEAD，需要更新 deployment
* 設定 `GAS_DEPLOYMENT_ID` 後，CI 才會自動 `clasp deploy --deploymentId ...`

---

### 本機可以 deploy、CI 不行

* 本機靠的是你環境內的 `~/.clasprc.json`
* CI 靠的是 GitHub Secrets 的 `CLASPRC_JSON`
* 請確認你把 **同一個 Google 帳號**的 `~/.clasprc.json` 放進了該 repo 的 `CLASPRC_JSON`

---

## 10)（給 Agent）提交 PR 前的清單

* [ ] `npm run lint` 通過（包含 JSDoc 規範）
* [ ] `npm run typecheck` 通過
* [ ] `npm run build` 通過（dist 正常生成）
* [ ] 若改到 `src/**` 或 `appsscript.json`，PR Body 已填 `## Reference Check`
* [ ] 沒有把任何 secret/token/refresh token 寫進 repo（包含貼在檔案、測試碼、註解）

```

如果你希望我再幫你把這份文件「更像 AI 操作手冊」一點（例如：加上 **Agent 行為規範：只改 `src/**`、不要改 `dist/**`、遇到缺少 scriptId 要先停**，或把每個步驟做成可直接 copy/paste 的 command blocks），我也可以直接替你做第二版。
::contentReference[oaicite:0]{index=0}
```
