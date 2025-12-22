/* global console, process, Buffer */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Validate that ~/.clasprc.json (or a provided path) contains the fields
 * required for clasp authentication. This helps catch truncated secrets
 * before pushing to CI.
 */
const argv = process.argv.slice(2);

let credentialsPath = path.join(os.homedir(), '.clasprc.json');
let shouldPrint = false;
let shouldPrintBase64 = false;
let wasBase64Source = false;

for (let index = 0; index < argv.length; index += 1) {
  const arg = argv[index];

  if (arg === '--print') {
    shouldPrint = true;
    continue;
  }

  if (arg === '--base64') {
    shouldPrintBase64 = true;
    continue;
  }

  if (arg === '--path' || arg === '-p') {
    const next = argv[index + 1];
    if (next) {
      credentialsPath = path.resolve(next);
      index += 1;
    }
    continue;
  }

  if (arg.startsWith('--path=')) {
    const [, value] = arg.split('=');
    if (value) {
      credentialsPath = path.resolve(value);
    }
  }
}

/**
 * Exit the process with a message.
 * @param message Description of the validation failure.
 * @returns Never resolves; exits the process.
 */
function fail(message) {
  console.error(`❌ ${message}`);
  return process.exit(1);
}

if (!fs.existsSync(credentialsPath)) {
  fail(
    `Missing clasp credentials at ${credentialsPath}. Run 'npx clasp login --no-localhost' to create it.`
  );
}

const raw = fs.readFileSync(credentialsPath, 'utf8').trim();
if (!raw) {
  fail(
    `Credentials file ${credentialsPath} is empty. Paste the full JSON from 'npx clasp login --no-localhost' without truncation.`
  );
}

const attemptParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

let parsed = attemptParse(raw);
let normalizedRaw = raw;

if (!parsed) {
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8').trim();
    if (decoded) {
      parsed = attemptParse(decoded);
      if (parsed) {
        normalizedRaw = decoded;
        wasBase64Source = true;
      }
    }
  } catch {
    // Ignore base64 decoding errors; we'll fail below if parsing still fails.
  }
}

if (!parsed) {
  fail(
    `Failed to parse ${credentialsPath} as JSON or base64-encoded JSON. If you pasted the Base64 block from 'npm run check:clasprc -- --print --base64', ensure it stayed intact.`
  );
}

const pickFirst = (...candidates) =>
  candidates.find((value) => typeof value === 'string' && value.trim())?.trim();

/**
 * Extracts credential fields from the modern `tokens` map (clasp v3+), preferring
 * the `default` user and falling back to any other token entries.
 * @param fieldNames field names to try (snake_case or camelCase)
 * @returns candidate values in priority order
 */
const pickFromTokens = (fieldNames) => {
  const tokens = parsed.tokens;
  if (!tokens || typeof tokens !== 'object') return [];

  const orderedEntries = [];
  if (tokens.default && typeof tokens.default === 'object') {
    orderedEntries.push(tokens.default);
  }
  for (const [key, token] of Object.entries(tokens)) {
    if (key === 'default') continue;
    if (token && typeof token === 'object') orderedEntries.push(token);
  }

  const candidates = [];
  for (const token of orderedEntries) {
    for (const name of fieldNames) {
      const value = token[name];
      if (typeof value === 'string' && value.trim()) {
        candidates.push(value.trim());
        break;
      }
    }
  }
  return candidates;
};

const refreshToken = pickFirst(
  parsed.refresh_token,
  parsed.token?.refresh_token,
  parsed.token?.refreshToken,
  ...pickFromTokens(['refresh_token', 'refreshToken'])
);
const clientId = pickFirst(
  parsed.clientId,
  parsed.oauth2ClientSettings?.clientId,
  parsed.client_id,
  ...pickFromTokens(['clientId', 'client_id'])
);
const clientSecret = pickFirst(
  parsed.clientSecret,
  parsed.oauth2ClientSettings?.clientSecret,
  parsed.client_secret,
  ...pickFromTokens(['clientSecret', 'client_secret'])
);

const missing = [];
if (!refreshToken) missing.push('refresh_token');
if (!clientId) missing.push('clientId');
if (!clientSecret) missing.push('clientSecret');

if (missing.length) {
  fail(
    `Incomplete clasp credentials: missing ${missing.join(
      ', '
    )}. Re-run 'npx clasp login --no-localhost' and paste the entire ${credentialsPath} into the CLASPRC_JSON secret.`
  );
}

console.log(
  `✅ CLASPRC_JSON source looks valid and contains required tokens (${wasBase64Source ? 'base64' : 'JSON'}).`
);

if (shouldPrint) {
  console.log('-----BEGIN CLASPRC_JSON-----');
  console.log(normalizedRaw);
  console.log('-----END CLASPRC_JSON-----');
}

if (shouldPrintBase64) {
  const encoded = Buffer.from(normalizedRaw, 'utf8').toString('base64');
  console.log('-----BEGIN CLASPRC_JSON_BASE64-----');
  console.log(encoded);
  console.log('-----END CLASPRC_JSON_BASE64-----');
}
