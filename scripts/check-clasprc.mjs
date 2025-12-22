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

let data;
try {
  data = JSON.parse(raw);
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  fail(`Failed to parse ${credentialsPath} as JSON: ${reason}`);
}

const pickFirst = (...candidates) =>
  candidates.find((value) => typeof value === 'string' && value.trim())?.trim();

const refreshToken = pickFirst(data.refresh_token, data.token?.refresh_token);
const clientId = pickFirst(data.clientId, data.oauth2ClientSettings?.clientId);
const clientSecret = pickFirst(
  data.clientSecret,
  data.oauth2ClientSettings?.clientSecret
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

console.log('✅ CLASPRC_JSON source looks valid and contains required tokens.');

if (shouldPrint) {
  console.log('-----BEGIN CLASPRC_JSON-----');
  console.log(raw);
  console.log('-----END CLASPRC_JSON-----');
}

if (shouldPrintBase64) {
  const encoded = Buffer.from(raw, 'utf8').toString('base64');
  console.log('-----BEGIN CLASPRC_JSON_BASE64-----');
  console.log(encoded);
  console.log('-----END CLASPRC_JSON_BASE64-----');
}
