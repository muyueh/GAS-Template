# AGENTS.md

> **Audience:** AI Agents (primary).  
> This file is an **operational playbook**: what the Agent should execute in the repo, and what the Agent should ask the human to do in the browser/UI.

---

## How to use this file (Agent ↔ Human boundary)

### Role split

- **🤖 Agent tasks**  
  Things you can do **inside the repo / terminal**: run commands, edit files, verify outputs, prepare copy‑paste payloads.

- **🧑 Human tasks (templates)**  
  Things the human must do in **Google Apps Script UI / Google consent screen / GitHub Settings**.  
  This file includes **ready-to-send message templates** you can paste to the human.

### Notation

- `### 🤖 Agent Flow` = steps you execute.
- `### 🧑 Human Prompt Template` = what you send to the human when you need them.
- `### ✅ Agent Checklist` = **Agent-only** checkboxes you can tick before moving on.

---

## Non‑negotiable guardrails (do not break)

### 1) Entrypoints must be “double-registered” (or they are broken)

Anything that Apps Script must call (e.g. `doGet`, `onOpen`, time-based triggers, menu handlers) is only valid when **both** are true:

1. **Namespace registration**: `src/lib/registerGlobals.ts` attaches the function onto `globalThis.__GAS_TEMPLATE__`.
2. **Top-level wrapper**: `scripts/build.mjs` includes a corresponding **global function wrapper** (Apps Script only discovers top-level functions).

If you add/rename an entrypoint, you must update **both files**, and note in PR / conversation that you checked both layers.

### 2) No secrets in git

- Never commit `~/.clasprc.json` (already ignored).
- Never paste refresh tokens, client secrets, etc. into repo files, comments, tests.
- CI authentication must come from GitHub Actions Secrets: `CLASPRC_JSON`.

### 3) `.clasp.json` must be real (not placeholder)

- `.clasp.json` must exist at repo root and must contain a **real** `scriptId`.
- `rootDir` must be `dist`.
- If `scriptId` is empty or `REPLACE_WITH_SCRIPT_ID`, CI/Deploy will fail by design.

### 4) Reference Check is mandatory for code/manifest changes

If you touched either:
- `src/**`, or
- `appsscript.json`

You must do a Reference Check (offline docs under `shared/google-apps-script-api-reference/`) and record it in PR body under `## Reference Check`.

### 5) Every scenario has a checklist — you must read and execute it

Each scenario includes a **✅ Agent Checklist**. Before proceeding, ensure you have read the scenario instructions and completed the checklist items for that scenario.

---

## Scenario index (playbooks)

1. [Scenario 1 — Fresh environment bootstrap](#scenario-1--fresh-environment-bootstrap)
2. [Scenario 2 — First-time setup: login + CI secret + bind to GAS (C → D → A → B)](#scenario-2--first-time-setup-login--ci-secret--bind-to-gas-c--d--a--b)
3. [Scenario 3 — Local deploy (manual push)](#scenario-3--local-deploy-manual-push)
4. [Scenario 4 — CI/CD deploy behavior (main / tags / manual)](#scenario-4--cicd-deploy-behavior-main--tags--manual)
5. [Scenario 5 — Add/modify entrypoints (Triggers / Menus / WebApp)](#scenario-5--addmodify-entrypoints-triggers--menus--webapp)
6. [Scenario 6 — Change code/manifest: Reference Check + PR body](#scenario-6--change-codemanifest-reference-check--pr-body)
7. [Scenario 7 — Troubleshooting](#scenario-7--troubleshooting)
8. [Scenario 8 — Pre-PR checklist (Agent)](#scenario-8--pre-pr-checklist-agent)

---

## Scenario 1 — Fresh environment bootstrap

Use when: brand-new machine / Codespace / agent sandbox, or right after cloning.

### 🤖 Agent Flow

1. Verify Node is supported (repo requires Node >= 20):
   ```bash
   node -v
   npm -v
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the repo health check:
   ```bash
   npm run check
   ```

### ✅ Agent Checklist

- [ ] `node -v` shows Node **>= 20**
- [ ] `npm install` succeeded
- [ ] `npm run check` succeeded (lint + typecheck + build)

---

## Scenario 2 — First-time setup: login + CI secret + bind to GAS (C → D → A → B)

Use when: the first time a repo is going to deploy to Google Apps Script.

**Important:** We intentionally do **Step C → Step D → Step A → Step B**  
because `clasp create` and CI auth both depend on having `clasp` credentials first.

### Step C — clasp login (create/update `~/.clasprc.json`)

#### 🤖 Agent Flow

1. Check login status:
   ```bash
   npx clasp login --status
   ```
2. If not logged in, run:
   ```bash
   npx clasp login --no-localhost
   ```
   - This prints a Google auth URL.
   - The terminal will prompt for the verification code / redirect URL (depends on clasp flow).
3. Verify login again:
   ```bash
   npx clasp login --status
   ```
4. Validate local credentials and print a Base64 payload for CI:
   ```bash
   npm run check:clasprc -- --base64
   # (Optional) also print raw JSON for debugging:
   npm run check:clasprc -- --print
   ```

#### 🧑 Human Prompt Template (for the auth flow)

> 我需要你協助完成 Google 授權，讓我們可以用 clasp 部署。  
> 1) 我會貼一個 Google 授權網址給你  
> 2) 請用你要部署的那個 Google 帳號登入並同意權限  
> 3) 完成後，請把畫面上顯示的「驗證碼」或「最後跳轉的完整 URL（包含 code=...）」回傳給我  
> 4) 也請回覆：你是用哪個 Google 帳號（email）完成授權的

### Step D — GitHub Actions secrets (CI auth)

#### 🤖 Agent Flow

1. From Step C you should already have a Base64 string printed between:
   - `-----BEGIN CLASPRC_JSON_BASE64-----`
   - `-----END CLASPRC_JSON_BASE64-----`

2. Tell the human to set GitHub repo secret `CLASPRC_JSON` to the **Base64 content only** (no BEGIN/END marker lines).

#### 🧑 Human Prompt Template (GitHub secret)

> 請到 GitHub Repo → Settings → Secrets and variables → Actions → New repository secret  
> - Name: `CLASPRC_JSON`  
> - Value: 請貼上我提供的 Base64 內容（**只貼中間那一行/那段 Base64**，不要包含 `BEGIN/END` 標記行）  
>  
> （可選）如果你希望 CI 在 tag/手動 release 時固定更新同一個 deployment：  
> - Name: `CLASP_DEPLOYMENT_ID`  
> - Value: 你要更新的 deployment id（可用 `npx clasp deployments` 查到）

### Step A — Decide: existing GAS or create a new GAS (get `Script ID`)

#### 🤖 Agent Flow

1. Ask the human:
   - Do you already have an Apps Script project to bind to? (Yes/No)

2. Branch:

   **A1) Existing GAS project**
   - Ask for Script ID.

   **A2) Create a new GAS project**
   - Offer two options:
     - UI (recommended)
     - `clasp create` (agent can run, requires login)

#### 🧑 Human Prompt Template (existing GAS)

> 你已經有既有的 Apps Script 專案的話，請幫我拿到 Script ID：  
> 1) 打開該 Apps Script 專案  
> 2) Project Settings（或從網址）找到 **Script ID**  
> 3) 回覆我：  
> - Script ID: `...`  
> - 這個專案所在的 Google 帳號（email）: `...`

#### 🧑 Human Prompt Template (create new via UI — recommended)

> 我們需要建立一個新的 Apps Script 專案並拿到 Script ID：  
> 1) 請到 Google Apps Script 建立新專案（standalone，或綁定 Sheet/Doc/Form 也可）  
> 2) 建立後到 Project Settings / 或從網址取得 **Script ID**  
> 3) 回覆我：  
> - Script ID: `...`  
> - 你是用哪個 Google 帳號（email）建立的: `...`

#### 🤖 Agent Flow (create new via clasp)

If the human chooses `clasp create`, run (in repo root):
```bash
npx clasp create --type standalone --title "<project-title>"
```

Then you still must ensure `.clasp.json` uses `rootDir: "dist"` (see Step B).

### Step B — Bind repo to that GAS project (`.clasp.json`)

#### 🤖 Agent Flow

1. Ensure dependencies are installed (if not already):
   ```bash
   npm install
   ```
2. Create or update `.clasp.json` (repo root):
   - If missing:
     ```bash
     cp .clasp.json.example .clasp.json
     ```
   - Edit `.clasp.json` so that:
     - `scriptId` = the real Script ID
     - `rootDir` = `"dist"`
3. Run a build to confirm `dist/` output exists:
   ```bash
   npm run build
   ```
4. Commit `.clasp.json` (scriptId is not a secret, but it must be accurate).

### ✅ Agent Checklist

- [ ] `npx clasp login --status` confirms logged-in account
- [ ] `npm run check:clasprc` reports credentials are valid
- [ ] Provided human with GitHub Secret instructions (`CLASPRC_JSON`, optional `CLASP_DEPLOYMENT_ID`)
- [ ] Collected a real Apps Script `scriptId`
- [ ] `.clasp.json` exists and contains:
  - [ ] `scriptId` is not empty and not `REPLACE_WITH_SCRIPT_ID`
  - [ ] `rootDir` is `dist`
- [ ] `npm run build` succeeds and generates `dist/`

---

## Scenario 3 — Local deploy (manual push)

Use when: you want to push changes to Apps Script **without** waiting for CI.

### 🤖 Agent Flow

1. Preconditions:
   - Logged in via `clasp`
   - `.clasp.json` has correct `scriptId` and `rootDir: dist`

2. Build:
   ```bash
   npm run build
   ```

3. Push to Apps Script (overwrite remote with local dist):
   ```bash
   npx clasp push -f
   # or
   npm run deploy
   ```

### 🧑 Human Prompt Template (optional verification)

> 我已經把最新程式 push 到 Apps Script 的 HEAD 了。  
> 如果你要確認：請打開 Apps Script → Editor 看到 Code.js 更新時間，或直接執行對應入口點測試。

### ✅ Agent Checklist

- [ ] `npm run build` succeeded
- [ ] `npx clasp push -f` succeeded
- [ ] No secrets were created/committed in repo

---

## Scenario 4 — CI/CD deploy behavior (main / tags / manual)

This repo includes workflows:
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

### What happens (mental model)

- **CI (`ci.yml`)**
  - Always validates `.clasp.json` exists and `scriptId` is not placeholder.
  - Runs `npm ci`, then `npm run lint`, `npm run typecheck`.
  - Only validates `CLASPRC_JSON` on **push to `main`**.

- **Deploy (`deploy.yml`)**
  - On **push to `main`**:
    - builds and runs `npx clasp push -f` (updates Apps Script HEAD)
  - On **tag `v*`** or **workflow_dispatch**:
    - additionally runs `npx clasp deploy`
    - if `CLASP_DEPLOYMENT_ID` is set, it updates that deployment id

### ✅ Agent Checklist

- [ ] Secret names are correct and consistent:
  - [ ] `CLASPRC_JSON` (required for deploy)
  - [ ] `CLASP_DEPLOYMENT_ID` (optional for `clasp deploy -i ...`)
- [ ] You understand the difference:
  - [ ] `clasp push` updates **HEAD**
  - [ ] `clasp deploy` updates a **Deployment** (Web App / Add-on release)

---

## Scenario 5 — Add/modify entrypoints (Triggers / Menus / WebApp)

Use when: adding a new callable function from Apps Script (trigger/menu/webapp/global function).

### Rule recap

Entrypoints must be double-registered:
- Namespace: `src/lib/registerGlobals.ts` → `globalThis.__GAS_TEMPLATE__`
- Wrapper: `scripts/build.mjs` → top-level `function yourEntrypoint(...) { return globalThis.__GAS_TEMPLATE__.yourEntrypoint(...); }`

### 🤖 Agent Flow (add a new entrypoint)

Example: you add a new function `runDailyJob()`.

1. Implement it somewhere under `src/features/` and export it.
2. In `src/lib/registerGlobals.ts`:
   - import the function
   - attach it:
     - `namespace.runDailyJob = runDailyJob;`
3. In `scripts/build.mjs`, add a wrapper to `entrypointWrappers`, for example:
   ```js
   function runDailyJob() {
     return globalThis.__GAS_TEMPLATE__.runDailyJob();
   }
   ```
4. Build and sanity-check:
   ```bash
   npm run build
   ```
5. Mention in PR/conversation that you verified both layers.

### 🧑 Human Prompt Template (installing triggers / running first-time setup)

> 如果這個功能需要觸發器（time-based / onOpen installable 等），請你：  
> 1) 打開 Apps Script 專案  
> 2) 在左側「Triggers」或用我提供的安裝函式執行一次（例如 `installTriggers()`）  
> 3) 完成後回覆我：你看到哪些 triggers 被建立，以及是否有授權提示

### ✅ Agent Checklist

- [ ] Updated `src/lib/registerGlobals.ts` (namespace registration)
- [ ] Updated `scripts/build.mjs` (top-level wrapper)
- [ ] `npm run build` succeeds
- [ ] PR/conversation notes mention “double-registration checked”

---

## Scenario 6 — Change code/manifest: Reference Check + PR body

Use when: PR changes `src/**` or `appsscript.json`.

### 🤖 Agent Flow

1. Identify which Apps Script services/APIs are used or changed (e.g. SpreadsheetApp, DriveApp, GmailApp, HtmlService, UrlFetchApp…).
2. Do Reference Check using offline docs:
   - First search keywords in:
     - `shared/google-apps-script-api-reference/keyword-index/`
   - Then open the corresponding full reference:
     - `shared/google-apps-script-api-reference/full-reference/`
3. Record **at least**:
   - 1 keyword-index file
   - 1 full-reference file
4. Put them in PR body under `## Reference Check` (format below).

### PR body snippet (copy-paste)

```md
## Reference Check
- keyword-index: shared/google-apps-script-api-reference/keyword-index/SpreadsheetApp.md
- full-reference: shared/google-apps-script-api-reference/full-reference/SpreadsheetApp.md
```

### ✅ Agent Checklist

- [ ] Reference Check completed for changed APIs
- [ ] PR body contains `## Reference Check` with:
  - [ ] 1 keyword-index path
  - [ ] 1 full-reference path

---

## Scenario 7 — Troubleshooting

### Symptom: CI fails “.clasp.json is missing” / “scriptId missing”

#### 🤖 Agent Flow
- Ensure `.clasp.json` exists in repo root
- Ensure `scriptId` is real (not empty, not `REPLACE_WITH_SCRIPT_ID`)
- Ensure `rootDir` is `dist`
- Commit `.clasp.json`

### Symptom: Deploy fails “Missing CLASPRC_JSON”

#### 🤖 Agent Flow
- Ask the human to set GitHub Secret `CLASPRC_JSON`
- If human already set it, suspect truncation:
  - Re-run login:
    ```bash
    npx clasp login --no-localhost
    ```
  - Validate and regenerate Base64:
    ```bash
    npm run check:clasprc -- --base64
    ```
  - Update the GitHub secret with the **Base64 content only**

### Symptom: “Local deploy works, CI deploy fails”

Likely: local uses `~/.clasprc.json`, CI uses GitHub secret `CLASPRC_JSON`.

#### 🤖 Agent Flow
- Confirm the human used the same Google account for:
  - the Apps Script project ownership/access, and
  - the `clasp login` credentials used to generate the secret

### Symptom: “CI succeeded but Web App didn’t update”

Cause: `clasp push` updates HEAD, but Web App uses a **Deployment**.

#### 🤖 Agent Flow
- For release/update deployment:
  - trigger `deploy.yml` via tag `v*` or workflow_dispatch
- If you need to update a fixed deployment id:
  - set `CLASP_DEPLOYMENT_ID`
  - workflow will run: `npx clasp deploy -i "$CLASP_DEPLOYMENT_ID"`

### ✅ Agent Checklist

- [ ] Identified whether the failure is `.clasp.json` vs auth secret vs deployment semantics
- [ ] Provided the correct human prompt template (if UI action required)
- [ ] Revalidated credentials using `npm run check:clasprc` when auth is involved

---

## Scenario 8 — Pre-PR checklist (Agent)

- [ ] `npm run lint` passed (or explicitly noted why not)
- [ ] `npm run typecheck` passed (or explicitly noted why not)
- [ ] `npm run build` passed
- [ ] If touched `src/**` or `appsscript.json`: PR body includes `## Reference Check`
- [ ] No secrets/tokens/refresh tokens were added to repo (including comments/tests)

---

## Reference (quick lookup)

### Repo map (important files)

- `src/` — editable source of truth (TypeScript)
  - `src/index.ts` — bootstrap
  - `src/lib/registerGlobals.ts` — attaches namespace `globalThis.__GAS_TEMPLATE__`
  - `src/features/**` — feature modules / examples
- `appsscript.json` — manifest (copied to `dist/` on build)
- `scripts/build.mjs` — builds to `dist/` and injects entrypoint wrappers
- `scripts/check-clasprc.mjs` — validates and prints CI-safe credential payload
- `dist/` — build output (gitignored; generated)
- `.clasp.json` — binding to a Script ID (committed)
- `~/.clasprc.json` — local clasp credential (never committed)

### Useful commands

```bash
npm run check          # lint + typecheck + build
npm run build          # generate dist/
npm run deploy         # build + clasp push -f
npx clasp login --status
npx clasp login --no-localhost
npm run check:clasprc -- --base64
npx clasp deployments  # list deployments (for CLASP_DEPLOYMENT_ID)
```
