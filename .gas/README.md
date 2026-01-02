# GAS bootstrap request/state

This folder contains two machine-readable files that coordinate Apps Script bootstrap with GitHub Actions:

- `request.json` — the trigger file that a human/agent edits to ask Actions to create or link an Apps Script project.
- `state.json` — the status file written by Actions after a successful bootstrap, letting agents know when `scriptId` and auth are verified.

## request.json

Fields:

- `version`: schema version (`1`).
- `kind`: must be `"gas.bootstrap"` for the bootstrap workflow to act.
- `mode`: `"create"` (create a new Apps Script project) or `"link"` (bind an existing project).
- `enabled`: set to `true` to ask the bootstrap workflow to run after the next merge to `main`. The workflow will flip this back to `false` after handling the request.
- `title`: title for a newly created project (create mode only; defaults to `GAS Template Project`).
- `type`: clasp create type (e.g., `standalone`, `docs`, `sheets`, `slides`, `forms`).
- `parentId`: optional Drive parent file/folder ID for the new project.
- `rootDir`: root directory clasp should use (defaults to `dist`).
- `existingScriptId`: required when `mode` is `link`.
- `notes`: free-form helper text.

## state.json

Fields reflect the last successful bootstrap run and **never** contain secrets:

- `auth.configured` / `auth.verified`: whether clasp credentials were present and validated.
- `gas.scriptId`: the linked Apps Script ID.
- `gas.rootDir`: the clasp root dir (usually `dist`).
- `gas.linkedAt`: ISO timestamp when the link/create succeeded.
- `deploy.*`: whether deployment defaults (like `CLASP_DEPLOYMENT_ID`) were detected.
- `request.*`: echo of the last handled request plus timestamps.

Agents should treat the environment as deploy-ready only when `state.json` exists, `auth.verified` is `true`, and `gas.scriptId` is non-empty.
