/**
 * === 必填設定 ===
 * FORM_ID：你的 Google Form ID（網址 /d/{ID}/edit 這段）
 * NUMBER_QUESTION_TITLE：表單裡「選號碼」那題的題目標題（要跟回覆表欄位標題一致）
 */
/**
 * Runtime configuration for the form number selector.
 */
const CONFIG = {
  FORM_ID: 'PASTE_YOUR_FORM_ID_HERE',
  NUMBER_QUESTION_TITLE: '你的號碼', // 例： "號碼" / "Number" / "1~1000 號"
  RESPONSE_SHEET_NAME: '' // 可留空：自動找含有該欄位標題的工作表；或填 "表單回應 1"
};

/**
 * Handles Google Forms submissions to enforce unique number selection.
 * @param e Apps Script form submit event.
 * @returns Nothing.
 */
export function onFormSubmit(e: GoogleAppsScript.Events.FormsOnFormSubmit): void {
  if (!e || !e.namedValues) {
    return;
  }

  const pickedRaw = (e.namedValues[CONFIG.NUMBER_QUESTION_TITLE] || [])[0];
  const picked = normalizeValue_(pickedRaw);
  if (!picked) {
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = CONFIG.RESPONSE_SHEET_NAME
    ? ss.getSheetByName(CONFIG.RESPONSE_SHEET_NAME)
    : guessResponseSheet_(ss, CONFIG.NUMBER_QUESTION_TITLE);

  if (!sheet) {
    throw new Error(
      `找不到回覆工作表。請確認 RESPONSE_SHEET_NAME，或確認欄位標題含「${CONFIG.NUMBER_QUESTION_TITLE}」。`
    );
  }

  // 用 Lock 避免同時多人送出造成表單選項更新互相覆蓋
  const lock = LockService.getScriptLock();
  lock.waitLock(30_000);

  try {
    const isDup = isDuplicateInEarlierRows_(sheet, CONFIG.NUMBER_QUESTION_TITLE, picked);
    if (isDup) {
      // 重複不用處理 → 直接結束
      return;
    }

    // 第一次出現 → 從表單選項移除，讓後面的人選不到
    removeChoiceFromForm_(CONFIG.FORM_ID, CONFIG.NUMBER_QUESTION_TITLE, picked);
  } finally {
    lock.releaseLock();
  }
}

/** ========== helpers ========== */

/**
 * Normalizes a value into a trimmed string.
 * @param value Raw value from the form or sheet.
 * @returns Normalized string value.
 */
function normalizeValue_(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

/**
 * Finds a response sheet by matching header names when no sheet name is provided.
 * @param ss Active spreadsheet.
 * @param headerName Column header to find.
 * @returns Matching response sheet or null.
 */
function guessResponseSheet_(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  headerName: string
): GoogleAppsScript.Spreadsheet.Sheet | null {
  for (const sheet of ss.getSheets()) {
    const lastCol = sheet.getLastColumn();
    if (lastCol < 1) {
      continue;
    }
    const headers = sheet
      .getRange(1, 1, 1, lastCol)
      .getValues()[0]
      .map((header) => normalizeValue_(header));
    if (headers.includes(headerName)) {
      return sheet;
    }
  }
  return null;
}

/**
 * Checks whether the selected number appeared in earlier form responses.
 * @param sheet Response sheet.
 * @param headerName Column header to scan.
 * @param value Selected number value.
 * @returns True when the value already exists in earlier rows.
 */
function isDuplicateInEarlierRows_(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  headerName: string,
  value: string
): boolean {
  const lastCol = sheet.getLastColumn();
  const headers = sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map((header) => normalizeValue_(header));
  const idx = headers.indexOf(headerName);
  if (idx === -1) {
    throw new Error(`找不到欄位「${headerName}」。請確認表單題目標題與回覆表欄位標題一致。`);
  }

  const lastRow = sheet.getLastRow(); // onFormSubmit 觸發時，最新一筆已寫入最後一列
  const numEarlierRows = lastRow - 2; // 只檢查第 2 列到第 (lastRow-1) 列
  if (numEarlierRows <= 0) {
    return false;
  }

  const col = idx + 1;
  const values = sheet.getRange(2, col, numEarlierRows, 1).getValues();
  for (const [cell] of values) {
    if (normalizeValue_(cell) === value) {
      return true;
    }
  }
  return false;
}

/**
 * Removes the selected option from the form choice list.
 * @param formId Google Form ID.
 * @param questionTitle Target question title.
 * @param picked Selected value to remove.
 * @returns Nothing.
 */
function removeChoiceFromForm_(formId: string, questionTitle: string, picked: string): void {
  const form = FormApp.openById(formId);
  const item = findChoiceItemByTitle_(form, questionTitle);
  if (!item) {
    throw new Error(`在表單內找不到題目：「${questionTitle}」。`);
  }

  const choices = item.getChoices();
  const filtered = choices.filter((choice) => normalizeValue_(choice.getValue()) !== picked);

  // 若找不到對應選項（可能是格式不一致），就不更新
  if (filtered.length === choices.length) {
    return;
  }

  item.setChoices(filtered);
}

/**
 * Finds a list or multiple-choice item by its title.
 * @param form Google Form instance.
 * @param title Question title to match.
 * @returns The list/multiple-choice item if found, otherwise null.
 */
function findChoiceItemByTitle_(
  form: GoogleAppsScript.Forms.Form,
  title: string
): GoogleAppsScript.Forms.ListItem | GoogleAppsScript.Forms.MultipleChoiceItem | null {
  for (const item of form.getItems()) {
    if (item.getTitle() !== title) {
      continue;
    }

    const type = item.getType();
    if (type === FormApp.ItemType.LIST) {
      return item.asListItem();
    }
    if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
      return item.asMultipleChoiceItem();
    }

    throw new Error(`題目「${title}」不是「下拉選單」或「單選」，目前只支援這兩種。`);
  }
  return null;
}
