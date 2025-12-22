# AGENTS.md


---

## 1) 核心原則（不可違反）

1. **GAS 程式碼一律使用 TypeScript（.ts）**  
   - Repo 內「要被部署到 Apps Script 的程式」都放在 `src/`，只允許 `.ts` / `.html` / `.css`。
2. **所有 exported 的函式 / 類別 / 會被外部呼叫的入口點，必須寫 JSDoc**  
   - 函式：描述用途、邊界條件、`@param`、`@returns`、必要時 `@throws`。  
   - 類別：說明責任與不變量。  
3. **觸發器、選單、WebApp 等入口點必須是「全域函式」**  
   - 我們用 `src/lib/registerGlobals.ts` 將函式掛到 `globalThis`，才能被 Apps Script 用字串名稱呼叫。
---

## 2) Repo 結構（你要去哪裡改什麼）

- `src/`：**所有要部署的 GAS 程式碼（TS）**  
  - `src/index.ts`：打包入口（只做 bootstrap + register globals）
  - `src/lib/registerGlobals.ts`：**把 entrypoints 掛到 globalThis**
  - `src/features/*`：功能模組（可當 starter modules）
  - `src/ui/*`：WebApp/Sidebar 的 HTML（build 會複製到 `dist/`）
- `appsscript.json`：GAS manifest（會被 build 複製到 `dist/`）
- `dist/`：**建置輸出（CI/本機產生，請不要手動改、也不需要 commit）**
- `scripts/build.mjs`：esbuild 打包（TS → `dist/Code.js`）
- `.clasp.json`：每個專案自己的 scriptId（**在新 repo 裡自己建立/commit**）
- `shared/google-apps-script-api-reference/`：離線參考資料（給 agent 做 Reference Check 用）
---

## 3) 新專案建立流程（Use this template 後要做的事）

### Step A：建立 GAS 專案並取得 Script ID
你有兩種方式（擇一）：

- **方式 1（推薦）**：先在 Apps Script UI 建立專案  
  1. 到 Apps Script 建立新專案（或綁定 Sheet / Doc / Form）
  2. 取得 Script ID（專案設定 / URL 內通常可找到）

- **方式 2**：用 clasp 建立（需要先完成 Step B 的登入）  
  - `npx clasp create --type standalone --title "<你的專案名>"`

### Step B：把 Repo 連到該 GAS 專案（建立 .clasp.json）
在 repo 根目錄：

1. 安裝依賴  
   - `npm install`
2. 建立 `.clasp.json`  
   - `cp .clasp.json.example .clasp.json`
   - 編輯 `.clasp.json` 的 `scriptId`（貼上你的 Script ID）
   - `rootDir` 必須是 `dist`

### Step C：本機登入 clasp（產生 ~/.clasprc.json）
1. `npx clasp login`  
2. 成功後你會得到 `~/.clasprc.json`（**不要 commit**）

### Step D：設定 GitHub Actions Secrets（repo-level）
在 GitHub Repo → Settings → Secrets and variables → Actions：

- **必填**：`CLASPRC_JSON`  
  - 值 = 你的 `~/.clasprc.json` 完整內容（整段 JSON）
- **選填**：`GAS_DEPLOYMENT_ID`（只有你需要自動更新 Web App / Add-on 部署時才要）
  - 值 = 你的 deploymentId（由 `npx clasp deployments` 查）

---

## 4) 開發與部署（本機與 CI/CD）

### 本機常用指令
- `npm run lint`：ESLint + JSDoc 規範
- `npm run typecheck`：TypeScript 型別檢查
- `npm run build`：產生 `dist/`（`dist/Code.js` + `dist/appsscript.json` + `dist/*.html`）
- `npm run deploy`：build 後 `clasp push -f`（把 HEAD 同步到 GAS）

### CI/CD 規範（已內建）
- PR / push 會跑：`npm run check`（lint + typecheck + build）
- **push 到 main** 會自動：
  1. build
  2. `clasp push -f`（強制以 repo 覆蓋 GAS HEAD）
  3. 若有設定 `GAS_DEPLOYMENT_ID`，會額外跑 `clasp deploy --deploymentId ...` 更新部署版本

> ⚠️ `clasp push -f` 會「移除遠端不在本地的檔案」。  
> 所以請務必以 repo 為準，不要在線上編輯器做臨時改動。

---

## 5) 入口點（Triggers / Menus / WebApp）怎麼加

### 規則
- Apps Script 只能用「全域函式名稱」做觸發器 / 選單 callback。  
- 因為我們會打包成單一檔案，所以一定要在 `src/lib/registerGlobals.ts` 內手動 export：

範例：
```ts
import { runDailyJob } from '../features/dailyJob';

export function registerGlobalFunctions(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  g.runDailyJob = runDailyJob;
}
```

---

## 6) Reference Check（給 Agent 的必做流程）

如果你在 PR 中改到下列任一項：
- `src/**`
- `appsscript.json`

就必須在 PR Body 的 **「## Reference Check」** 填入你查過的參考檔案：

1. **先查 `shared/google-apps-script-api-reference/keyword-index/`**  
2. 再查對應的 **`shared/google-apps-script-api-reference/full-reference/`**

PR 模板裡請至少列：
- 1 個 `keyword-index/*.md`
- 1 個 `full-reference/*.md`

---

## 7) 你可以直接複用的 starter modules（在 src/features）

- `features/helloWorld.ts`：最小可運行 demo（可當 smoke test）
- `features/sheetsMenu.ts`：Spreadsheet `onOpen` + 自訂選單
- `features/webapp.ts`：`doGet()` + HTML 檔案範例
- `features/triggers.ts`：安裝/刪除觸發器
- `features/drive.ts`：Drive folder helper
- `features/gmail.ts`：Gmail search helper
- `features/sheets.ts`：簡單的 Spreadsheet helper

---

## 8) 常見問題（Troubleshooting）

### CI 失敗：Missing CLASPRC_JSON
- 代表 GitHub Secrets 沒設定 `CLASPRC_JSON` 或內容為空  
- 請照「3) Step D」設定

### CI 失敗：Missing .clasp.json
- 代表你還沒把 repo 連到 GAS 專案  
- 請 `cp .clasp.json.example .clasp.json` 並填上 scriptId，然後 commit

### Web App 沒更新
- Web App / Add-on 的「部署」不是 HEAD，必須更新 deployment  
- 設定 `GAS_DEPLOYMENT_ID` 後，CI 會自動跑 `clasp deploy --deploymentId ...`

---

## 9)（給 Agent）修改程式的提交清單

在你提交 PR 之前，請確保：

- [ ] `npm run lint` 過（JSDoc 規範也會被檢查）
- [ ] `npm run typecheck` 過
- [ ] `npm run build` 過（dist 正常生成）
- [ ] 若改到 `src/**` 或 `appsscript.json`，PR Body 已填 Reference Check
- [ ] 沒有把任何 Secret/token 寫進 repo
