# AGENTS.md


> 所有要部署到 Google Apps Script 的程式碼都用 TypeScript + JSDoc，並由 GitHub Actions 在 push main 後自動部署。
> 要跑 clasp/CI 時先釐清 `~/.clasprc.json` 才是憑證；
> **沒有 Script ID 就不要建立/修改 `.clasp.json`**（⚠️ 未取得 Script ID 前請不要新建或修改 `.clasp.json`，避免部署指向未知專案）；
> **寫/改任何 GAS 程式碼或 manifest 前，必須先做 Reference Check（查 vendor library），並在對話/PR 中回報你查了哪些檔案。**

---

## 0) TL;DR（給 Agent 的最短操作路徑）

- 新 repo / 新環境第一次跑：
  1. `node -v && npm -v`
  2. `npm install`
  3. 建立 `.clasp.json`（scriptId + rootDir=dist，並 commit）
     - 若是 monorepo：每個 `apps-script/gas-xxx/` 都要各自有一份可用的 `.clasp.json`
  4. `npx clasp login --status`（沒登入或在非互動環境就用 `npx clasp login --no-localhost`，把 URL 給使用者開）
  5. 把「**完整且非空**」的 `~/.clasprc.json` 內容放到 GitHub Secrets：`CLASPRC_JSON`（建議用 `npm run check:clasprc -- --print --base64` 取得 Base64；純 JSON 也可）
  6. 確認 `.clasp.json` 已填入**真實的** `scriptId`（不能留 `REPLACE_WITH_SCRIPT_ID`），否則 deploy workflow 會失敗
- 改 code 前後一定要：
  - `npm run check`
  - 改到 `src/**` 或 `appsscript.json` → PR Body 填 `## Reference Check`

### 常見錯誤對應表（極短版）
- `clasp login` 無法開瀏覽器：改用 `npx clasp login --no-localhost`，把 URL 給使用者開，使用者回貼完整 redirect URL。
- CI 提示 Missing `CLASPRC_JSON`：到 GitHub Secrets 補上完整 `~/.clasprc.json`（Base64 或純 JSON）。
- CI 提示 `scriptId` 缺失：檢查 `.clasp.json` 是否填入真實 Script ID，且已 commit。

---

## Fork 後第一步（給 Codex / Agent 指令）

> 任何剛 Fork 本 Template 或在新環境開發的人，必須先完成下列流程；請 Codex/Agent 用這份指引帶著使用者走完。

1. 由 Codex/Agent 在可開瀏覽器的環境執行 `npx clasp login --no-localhost`，將終端機顯示的授權 URL 貼給使用者，請使用者在瀏覽器完成授權。
2. 使用者授權後，複製完整的 redirect URL（含 `code=`）貼回終端機，由 Codex/Agent 繼續流程。
3. 確認 `npx clasp login --status` 已顯示登入帳號。
4. Codex/Agent 以清晰的分隔符列印本機 `~/.clasprc.json` 的**完整且非空**內容，避免前後空白或遺漏（例如用 `-----BEGIN CLASPRC_JSON-----` / `-----END CLASPRC_JSON-----` 包住原始 JSON；若貼 Base64 也同樣需完整）。
5. 打開 GitHub Repo → **Settings → Secrets and variables → Actions**，新增/更新 `CLASPRC_JSON`，值為第 4 步的完整 JSON（推薦貼 `npm run check:clasprc -- --print --base64` 的 Base64 區塊，workflow 會同時支援 Base64 / 純 JSON）。

注意：
- `CLASPRC_JSON` 是 CI 還原 `~/.clasprc.json` 的唯一來源，缺少或為空會讓 CI 直接失敗。
- 預設以 Base64 儲存 `CLASPRC_JSON`（用 `npm run check:clasprc -- --print --base64` 取得），但 workflow 也會接受純 JSON。
- 憑證是機器層級設定，換環境或 Fork 後都要重跑登入。
- 若憑證外洩或不確定安全性，請重新執行 `npx clasp login --no-localhost` 產生新 `~/.clasprc.json`，並更新 GitHub Secret。
- CI/CD 會檢查 `CLASPRC_JSON` 是否存在且非空；未設定會使 workflow 直接失敗。

範例輸出（請完整貼上，勿截斷）：
```
-----BEGIN CLASPRC_JSON-----
<這裡貼 Base64 或完整 JSON 內容>
-----END CLASPRC_JSON-----
```

### 登入失敗或憑證疑似損壞時的回收步驟
1. 重新執行 `npx clasp login --no-localhost`，取得新授權 URL，請使用者在瀏覽器完成授權並回貼完整 redirect URL（含 `code=`）。
2. 再次執行 `npx clasp login --status` 確認帳號。
3. 用 `npm run check:clasprc -- --print --base64` 驗證 `~/.clasprc.json` 是否完整（Base64 或純 JSON 皆可），並更新 GitHub Secret：`CLASPRC_JSON`。
4. 在對話中保留 redirect URL 及貼入的 JSON/BASE64 區塊，便於追溯。

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
  → CI 不會跑 `clasp login`，它吃的是 GitHub Secret：`CLASPRC_JSON`（見第 4 節 / 第 5.3 節）

---

## 3) Repo 結構（你要去哪裡改什麼）

> 下列結構以「單一 GAS 專案資料夾」為單位描述。
> 若是 monorepo，通常會長得像：`apps-script/gas-xxx/`，而每個 `gas-xxx/` 內都遵循同一套結構。

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

在該專案資料夾（單一 repo 時是 repo root；monorepo 時通常是 `apps-script/gas-xxx/`）：

1. 安裝依賴

   ```bash
   npm install
   ```

2. 建立 `.clasp.json`

   * `cp .clasp.json.example .clasp.json`
   * 編輯 `.clasp.json`：

     * `scriptId`: **必須**貼上你的 Script ID（不能留白或 `REPLACE_WITH_SCRIPT_ID`，不然 deploy workflow 會直接失敗）
     * `rootDir`: 必須是 `dist`

3. **commit `.clasp.json`**（確保其中的 `scriptId` 已填好且可用）

   * 這是「這個資料夾綁定哪個 GAS 專案」的唯一來源

---

### Step C：本機登入 clasp（產生 `~/.clasprc.json`）

在本機或可互動登入的環境：

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

  * 值 = 你的 `~/.clasprc.json` **完整且非空**內容（預設貼 `npm run check:clasprc -- --print --base64` 的 Base64 區塊，純 JSON 也可）
  * 這份 secret 會用於 CI 還原 `~/.clasprc.json`，讓 workflow 可以執行 `clasp push`
  * deploy workflow 會檢查此 secret 是否存在／非空，缺少時會直接失敗並提示補上

* **選填：`GAS_DEPLOYMENT_ID`**

  * 只有你需要 CI 自動更新 Web App / Add-on 部署才要
  * 值可由 `npx clasp deployments` 查到

---

## 5) 開發與部署（本機與 CI/CD）

**本機檢查順序（推 PR 前照做）：** `npm run lint` → `npm run typecheck` → `npm run build` →（需要時）`npm run deploy`。改到 `src/**` 或 `appsscript.json` 時，務必先完成 Reference Check（見第 7 節）再送 PR。

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

## 5.3 GitHub Actions 部署（clasp）

這是一份最小可落地的 CI/CD 規格，搭配 `.github/workflows/ci.yml` 與 `.github/workflows/deploy.yml`：

* CI/CD 核心規則

  * PR / push 一律跑 lint + typecheck + build（必要時再跑 test）
  * 部署只做一件事：把 build 產物 `clasp push` 到 Apps Script
  * 正式發佈（`clasp deploy`）僅允許在 `workflow_dispatch`（手動）或 tag（如 `v1.2.3`）時執行
  * 嚴禁把憑證 commit 進 repo，`.clasprc.json` 必須透過 GitHub Secrets

* 必要 Secrets（GitHub Repo → Settings → Secrets and variables → Actions）

  * `CLASPRC_JSON`：你的 `.clasprc.json` 內容（預設貼 Base64 區塊，純 JSON 也可）
  * `CLASP_DEPLOYMENT_ID`（選填）：若要固定更新某個 deployment（常見於 WebApp / Add-on）

* Repo 約定（配合 `src/` 原則）

  * `src/`：唯一的人類可編輯部署來源（`.ts` / `.html` / `.css`）
  * `dist/`：build 產物（workflow 產生，可不 commit）
  * `.clasp.json`：`rootDir` 指向 `dist/`，`scriptId` **必須可用**（可 commit 或在 workflow 內用 secret 生成）

* Workflow 摘要

  * `ci.yml`：PR / push（含 main）跑 lint、typecheck、build，測試視 `npm test` 是否存在而定
  * `deploy.yml`：push main 必做 build + `npx clasp push -f`；tag 或手動觸發時再執行 `npx clasp deploy`，並以 `CLASP_DEPLOYMENT_ID`（若有）控制目標 deployment

* 落地前請確認

  * `npm run build` 會把 `src/` 編譯到 `dist/`（或你指定的 rootDir）
  * `npx clasp push` 的 rootDir 與 build 產物一致（透過 `.clasp.json` 或 build 流程控制）
  * `CLASPRC_JSON` 已設定成 repo secret，而非寫在檔案或 commit 記錄裡

---

## 5.4（新增）clasp 憑證與 workflow 實際部署機制（CI 會做什麼）

### A) 在本機或可互動登入環境取得「clasp 憑證」

在本機或任何「可以開瀏覽器授權」的環境中登入：

```bash
npx clasp login --no-localhost
```

成功後會產生（或更新）：

* `~/.clasprc.json`（**這個才是憑證本體**，不要 commit）

---

### B) 把 `~/.clasprc.json` 全文放到 GitHub Actions secret：`CLASPRC_JSON`

* GitHub Repo → Settings → Secrets and variables → Actions
* 新增 / 更新 secret：`CLASPRC_JSON`（Base64 為預設，純 JSON 也可；Base64 較不怕貼上被截斷）

  * `CLASPRC_JSON` = `~/.clasprc.json` 的「完整 JSON 內容」（整段貼上）

---

### C) 每次部署時，workflow 做的事（重點流程）

1. **驗證 `.clasp.json` 與 `scriptId`**

   * CI 會先檢查 `.clasp.json` 是否存在且 `scriptId` 不是空白或 `REPLACE_WITH_SCRIPT_ID`
   * 若不符合，workflow 會直接失敗並提示補齊

2. **還原 `~/.clasprc.json`**

   * workflow 會把 **非空** `secrets.CLASPRC_JSON` 寫回 runner 的 `~/.clasprc.json`
   * 若 secret 遺失或為空，workflow 會直接失敗並提示你補上完整的 `~/.clasprc.json`
   * 成功後，後續 `npx clasp ...` 具備登入狀態（CI 不跑互動式 login）

3. **對每個 `apps-script/gas-xxx/` 逐一執行 `clasp push -f`**

   * workflow 會在每個 Apps Script 專案資料夾內執行：

     ```bash
     npx clasp push -f
     ```

4. **前提：該資料夾內的 `.clasp.json` 必須「完整可用」**

   * `.clasp.json` 內的 `scriptId` 必須存在且正確
   * `rootDir` 必須指向正確的 build 產物（通常是 `dist`）
   * 沒有 `scriptId`（或不可用）就不應該跑部署 / 不應該建立或修改那份 `.clasp.json`

> 重點：`CLASPRC_JSON`（`~/.clasprc.json`）解決的是「身份驗證」；
> `.clasp.json` 解決的是「這個資料夾要推到哪一個 Script ID」。

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

### PR Body 範例（請依實際查閱檔案替換）
```
## Reference Check
- keyword-index: shared/google-apps-script-api-reference/keyword-index/SpreadsheetApp.md
- full-reference: shared/google-apps-script-api-reference/full-reference/SpreadsheetApp.md
```

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
* 請照第 4 節 Step D / 第 5.4 節設定

---

### CI 失敗：Missing `.clasp.json`

* 代表該專案資料夾還沒綁定 GAS 專案
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
* [ ] 若改到 `src/**` 或 `appsscript.json`，已先查 vendor library 並在 PR Body 填寫 `## Reference Check`（格式如第 7 節範例）
* [ ] 沒有把任何 secret/token/refresh token 寫進 repo（包含貼在檔案、測試碼、註解）

---

## 11) 作業紀錄

### 2024-12-22：clasp 登入流程

* 目標：為指定的 Script ID 進行 clasp 認證。
* 步驟：
  1. `npx clasp login --no-localhost` 取得授權網址。
  2. 使用者於瀏覽器授權後回傳 redirect URL，內含授權 code。
  3. 將該 redirect URL 貼回同一個登入流程，完成授權。
* 結果：clasp 登入成功。

### 2025-02-23：CLASPRC_JSON 驗證缺少欄位

* 狀況：CI 回報 CLASPRC_JSON 缺少 `refresh_token` / `clientId` / `clientSecret`，推測是複製貼上時被截斷。
* 處置：請執行 `npm run check:clasprc -- --print --base64` 重新驗證本機 `~/.clasprc.json`，並重新複製指令輸出的區塊（純文字或 Base64 皆可）到 GitHub Secrets：`CLASPRC_JSON`。
* 備註：Base64 區塊可避免部分工具自動轉義或刪除換行。

### 2025-03-10：認證問題重跑流程規範

* 狀況：遇到 clasp 認證異常或 CI 憑證錯誤時。
* 處置：必須重新跑認證流程，由 Codex/Agent 提供 `npx clasp login --no-localhost` 的指引，使用者在瀏覽器授權後將完整 redirect URL 貼回終端機，由 Codex/Agent 完成後續輸入。
* 要求：認證指令與使用者貼回的完整 URL 流程必須在對話紀錄中留存（可作為後續追溯與更新 `CLASPRC_JSON` 的依據）。
