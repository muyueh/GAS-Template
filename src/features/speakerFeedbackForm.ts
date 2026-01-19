const FIXED_SPREADSHEET_ID = '1HzS_hQWZdsgBa4IAnKYxqjo2s7BjVxsVOsajIxJ1yCw';
const FIXED_DATA_SHEET_ID = 1576736650;
const TEMPLATE_FORM_ID = '1EelmbBwTrqvncthzXeyf_BI5O2hGbuh9ITZ3SoEqiNQ';
const OUTPUT_SHEET_NAME = 'Output';
const DEFAULT_MARKER_TITLE = '[[SPEAKER_BLOCKS]]';
const DEFAULT_FORM_TITLE = '講者回饋表單';
const DEFAULT_QUESTION_PREFIX = 'A';
const DEFAULT_IGNORE_STATUSES = ['skip', '忽略', '不產生', '不處理', 'x', '完成', '已完成', 'done', 'completed'];

const DEFAULT_RATING_ROWS = [
  '整體推薦度',
  '對我的實用性',
  '對我的啟發性',
  '業配程度'
];

const DEFAULT_RATING_COLUMNS = ['1. 非常低', '2. 低', '3. 普通', '4. 高', '5. 非常高'];

const COLUMN_NAME_CANDIDATES = ['講者名稱', 'speaker', 'speaker name'];
const COLUMN_TOPIC_CANDIDATES = ['講者主題', 'topic', 'title'];
const COLUMN_STATUS_CANDIDATES = ['狀態', 'status'];
const COLUMN_FORM_TITLE_CANDIDATES = ['表單名稱', 'form title', 'form_name'];

const QUESTION_START_NUMBER = 1;
const QUESTION_REQUIRED = true;
const REMOVE_MARKER = true;

type CellValue = string | number | boolean | Date | null | undefined;

type SpeakerRow = {
  formTitle: string;
  speakerName: string;
  speakerTopic: string;
  status: string;
  rowIndex: number;
};

type SpeakerConfig = {
  markerTitle: string;
  questionPrefix: string;
  questionStartNumber: number;
  questionRequired: boolean;
  removeMarker: boolean;
  ratingRows: string[];
  ratingColumns: string[];
  ignoreStatuses: string[];
};

type OutputRow = {
  createdFormId: string;
  publishedUrl: string;
  editUrl: string;
  createdAt: Date;
};

type FormUrls = {
  publishedUrl: string;
  editUrl: string;
  publishedUrlWarning: string | null;
};

/**
 * Generates a new Google Form from a template and inserts speaker rating blocks.
 * It reads speaker data from the spreadsheet and writes back the created URLs.
 * @returns Nothing.
 */
export function generateSpeakerFeedbackForm(): void {
  const spreadsheet = SpreadsheetApp.openById(FIXED_SPREADSHEET_ID);
  const dataSheet = getRequiredSheetById_(spreadsheet, FIXED_DATA_SHEET_ID);
  const config: SpeakerConfig = {
    markerTitle: DEFAULT_MARKER_TITLE,
    questionPrefix: DEFAULT_QUESTION_PREFIX,
    questionStartNumber: QUESTION_START_NUMBER,
    questionRequired: QUESTION_REQUIRED,
    removeMarker: REMOVE_MARKER,
    ratingRows: DEFAULT_RATING_ROWS,
    ratingColumns: DEFAULT_RATING_COLUMNS,
    ignoreStatuses: DEFAULT_IGNORE_STATUSES
  };

  const speakerData = readSpeakerRows_(dataSheet);
  const speakerRows = speakerData.rows;
  const filteredSpeakers = speakerRows.filter((row) => shouldIncludeSpeaker_(row, config));

  if (filteredSpeakers.length === 0) {
    throw new Error('找不到任何講者資料，請確認講者名稱與主題欄位是否有內容。');
  }

  const formTitle = getFormTitle_(filteredSpeakers);
  const templateFile = DriveApp.getFileById(TEMPLATE_FORM_ID);
  const targetFolder = getDefaultOutputFolder_(FIXED_SPREADSHEET_ID);
  const newFile = templateFile.makeCopy(formTitle, targetFolder);
  const form = FormApp.openById(newFile.getId());

  form.setTitle(formTitle);
  const acceptingResponsesWarning = setAcceptingResponsesIfPossible_(form, true);
  publishFormIfSupported_(form);

  const markerIndex = findItemIndexByTitle_(form, config.markerTitle);
  const hasMarker = markerIndex >= 0;
  let insertIndex = hasMarker ? markerIndex + 1 : null;

  filteredSpeakers.forEach((speaker, index) => {
    const title = buildQuestionTitle_(
      speaker,
      config.questionPrefix,
      index,
      config.questionStartNumber,
    );
    const item = form.addGridItem();
    item
      .setTitle(title)
      .setRows(config.ratingRows)
      .setColumns(config.ratingColumns)
      .setRequired(config.questionRequired);

    if (hasMarker && insertIndex !== null) {
      const stableItem = form.getItemById(item.getId());
      form.moveItem(stableItem, insertIndex);
      insertIndex += 1;
    }
  });

  if (hasMarker && config.removeMarker) {
    const markerItem = form.getItems()[markerIndex];
    if (markerItem) {
      form.deleteItem(markerItem);
    }
  }

  const formUrls = getFormUrls_(form);

  writeOutputRow_(spreadsheet, {
    createdFormId: newFile.getId(),
    publishedUrl: formUrls.publishedUrl,
    editUrl: formUrls.editUrl,
    createdAt: new Date()
  });

  markSpeakersCompleted_(
    dataSheet,
    filteredSpeakers,
    speakerData.statusColumnIndex,
    '完成',
  );

  SpreadsheetApp.getUi().alert(
    [
      '✅ 已完成新表單生成',
      `表單名稱：${formTitle}`,
      `講者數：${filteredSpeakers.length}`,
      '',
      hasMarker
        ? `Marker：已找到「${config.markerTitle}」，題組已插入 marker 後方`
        : `⚠️ Marker：找不到「${config.markerTitle}」，題組已直接加在表單最後（建議回模板補 marker）`,
      '',
      acceptingResponsesWarning ? `⚠️ 回應狀態：${acceptingResponsesWarning}` : null,
      formUrls.publishedUrlWarning
        ? `⚠️ 填寫連結：${formUrls.publishedUrlWarning}`
        : `填寫連結：${formUrls.publishedUrl}`,
      `編輯連結：${formUrls.editUrl}`
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n'),
  );

  return undefined;
}

/**
 * Reads speaker rows from the data sheet.
 * @param sheet Data sheet.
 * @returns Parsed speaker rows.
 */
function readSpeakerRows_(sheet: GoogleAppsScript.Spreadsheet.Sheet): {
  rows: SpeakerRow[];
  statusColumnIndex: number;
} {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) {
    return { rows: [], statusColumnIndex: 3 };
  }

  const header = sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map((cell) => (cell ?? '').toString().trim());

  const headerLower = header.map((value) => value.toLowerCase());
  const formTitleIndex = findHeaderIndex_(headerLower, COLUMN_FORM_TITLE_CANDIDATES, 0);
  const speakerNameIndex = findHeaderIndex_(headerLower, COLUMN_NAME_CANDIDATES, 1);
  const speakerTopicIndex = findHeaderIndex_(headerLower, COLUMN_TOPIC_CANDIDATES, 2);
  const statusIndex = findHeaderIndex_(headerLower, COLUMN_STATUS_CANDIDATES, 3);

  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return {
    statusColumnIndex: statusIndex,
    rows: rows.map((row, rowIndex) => ({
      formTitle: toText_(row[formTitleIndex], ''),
      speakerName: toText_(row[speakerNameIndex], ''),
      speakerTopic: toText_(row[speakerTopicIndex], ''),
      status: toText_(row[statusIndex], ''),
      rowIndex: rowIndex + 2
    }))
  };
}

/**
 * Finds the index of the first matching header label.
 * @param headerLower Normalized header row.
 * @param candidates Candidate header names.
 * @param fallback Fallback index when no match is found.
 * @returns Matching index or fallback.
 */
function findHeaderIndex_(headerLower: string[], candidates: string[], fallback: number): number {
  for (const candidate of candidates) {
    const index = headerLower.indexOf(candidate.toLowerCase());
    if (index >= 0) {
      return index;
    }
  }
  return fallback;
}

/**
 * Determines whether a speaker row should be included.
 * @param row Speaker row.
 * @param config Normalized speaker config.
 * @returns True when the row should be included.
 */
function shouldIncludeSpeaker_(row: SpeakerRow, config: SpeakerConfig): boolean {
  const name = row.speakerName.trim();
  if (!name) {
    return false;
  }

  const status = row.status.trim().toLowerCase();
  if (status && config.ignoreStatuses.includes(status)) {
    return false;
  }

  return true;
}

/**
 * Determines the form title based on speaker rows.
 * @param rows Speaker rows.
 * @returns Form title.
 */
function getFormTitle_(rows: SpeakerRow[]): string {
  const sheetTitle = rows.find((row) => row.formTitle.trim())?.formTitle ?? '';
  return sheetTitle.trim() || DEFAULT_FORM_TITLE;
}

/**
 * Builds the question title for a given speaker row.
 * @param row Speaker row.
 * @param prefix Question prefix label.
 * @param index Speaker index.
 * @param startNumber Starting question number.
 * @returns Question title.
 */
function buildQuestionTitle_(
  row: SpeakerRow,
  prefix: string,
  index: number,
  startNumber: number,
): string {
  const numberLabel = `${prefix}${startNumber + index}`;
  const topic = row.speakerTopic.trim();
  const speakerLabel = topic ? `${row.speakerName} | ${topic}` : row.speakerName;
  return `${numberLabel} 對於 ${speakerLabel}`;
}

/**
 * Finds the index of a form item by title.
 * @param form Target form.
 * @param title Item title to locate.
 * @returns Item index or -1 if not found.
 */
function findItemIndexByTitle_(form: GoogleAppsScript.Forms.Form, title: string): number {
  const items = form.getItems();
  for (const item of items) {
    if ((item.getTitle() || '') === title) {
      return item.getIndex();
    }
  }
  return -1;
}

/**
 * Loads a required sheet by ID.
 * @param spreadsheet Spreadsheet container.
 * @param sheetId Sheet gid.
 * @returns Sheet instance.
 */
function getRequiredSheetById_(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheetId: number,
): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet = spreadsheet.getSheetById(sheetId);
  if (!sheet) {
    throw new Error(`找不到工作表：${sheetId}`);
  }
  return sheet;
}

/**
 * Resolves a default output folder for generated forms.
 * @param spreadsheetId Spreadsheet id.
 * @returns Drive folder.
 */
function getDefaultOutputFolder_(spreadsheetId: string): GoogleAppsScript.Drive.Folder {
  const file = DriveApp.getFileById(spreadsheetId);
  const parents = file.getParents();
  if (parents.hasNext()) {
    return parents.next();
  }
  return DriveApp.getRootFolder();
}

/**
 * Safely resolves form URLs when the form might not be published yet.
 * @param form Target form.
 * @returns Form URLs and warning message when unpublished.
 */
function getFormUrls_(form: GoogleAppsScript.Forms.Form): FormUrls {
  let publishedUrl = '';
  let publishedUrlWarning: string | null = null;

  try {
    publishedUrl = form.getPublishedUrl();
  } catch (error) {
    if (isUnpublishedFormError_(error)) {
      publishedUrlWarning = '尚未發布表單，請先在 Google Forms 點擊一次「傳送」後再取得連結';
    } else {
      throw error;
    }
  }

  return {
    publishedUrl,
    editUrl: form.getEditUrl(),
    publishedUrlWarning
  };
}

/**
 * Detects unpublished form errors when fetching the published URL.
 * @param error Error thrown from getPublishedUrl.
 * @returns Whether the error indicates an unpublished form.
 */
function isUnpublishedFormError_(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message || '';
    return (
      message.includes('未發布') ||
      message.includes('unpublished') ||
      message.includes('not supported on an unpublished form')
    );
  }
  if (typeof error === 'string') {
    return (
      error.includes('未發布') ||
      error.includes('unpublished') ||
      error.includes('not supported on an unpublished form')
    );
  }
  return false;
}

/**
 * Publishes a form when the API supports it (type-safe guard for GAS typings).
 * @param form Target form.
 */
function publishFormIfSupported_(form: GoogleAppsScript.Forms.Form): void {
  const candidate = form as GoogleAppsScript.Forms.Form & {
    setPublished?: (enabled: boolean) => GoogleAppsScript.Forms.Form;
  };
  if (typeof candidate.setPublished === 'function') {
    candidate.setPublished(true);
  }
}

/**
 * Safely toggles accepting responses when the form might not be published yet.
 * @param form Target form.
 * @param enabled Whether responses should be accepted.
 * @returns Warning message when the form is unpublished.
 */
function setAcceptingResponsesIfPossible_(
  form: GoogleAppsScript.Forms.Form,
  enabled: boolean,
): string | null {
  try {
    form.setAcceptingResponses(enabled);
    return null;
  } catch (error) {
    if (isUnpublishedFormError_(error)) {
      return '尚未發布表單，無法切換回應狀態（請在 Google Forms 點擊一次「傳送」後再試）';
    }
    throw error;
  }
}

/**
 * Writes output metadata into a dedicated output sheet.
 * @param spreadsheet Spreadsheet container.
 * @param output Output data.
 */
function writeOutputRow_(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  output: OutputRow,
): void {
  const sheet = getOrCreateOutputSheet_(spreadsheet);
  const headers = ['created_form_id', 'published_url', 'edit_url', 'created_at'];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sheet.appendRow([output.createdFormId, output.publishedUrl, output.editUrl, output.createdAt]);
}

/**
 * Ensures the output sheet exists.
 * @param spreadsheet Spreadsheet container.
 * @returns Output sheet.
 */
function getOrCreateOutputSheet_(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
): GoogleAppsScript.Spreadsheet.Sheet {
  const existingSheet = spreadsheet.getSheetByName(OUTPUT_SHEET_NAME);
  if (existingSheet) {
    return existingSheet;
  }
  return spreadsheet.insertSheet(OUTPUT_SHEET_NAME);
}

/**
 * Marks processed speaker rows as completed.
 * @param sheet Data sheet.
 * @param rows Speaker rows to update.
 * @param statusColumnIndex Status column index (0-based).
 * @param completedLabel Status label to set.
 */
function markSpeakersCompleted_(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  rows: SpeakerRow[],
  statusColumnIndex: number,
  completedLabel: string,
): void {
  if (rows.length === 0) {
    return;
  }

  const statusColumn = statusColumnIndex + 1;
  rows.forEach((row) => {
    sheet.getRange(row.rowIndex, statusColumn).setValue(completedLabel);
  });
}

/**
 * Converts a cell value to trimmed text.
 * @param value Cell value.
 * @param fallback Fallback string.
 * @returns Trimmed text.
 */
function toText_(value: CellValue, fallback: string): string {
  if (value === null || typeof value === 'undefined') {
    return fallback;
  }
  return value.toString().trim();
}
