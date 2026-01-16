const CONFIG_SHEET_NAME = 'Config';
const DEFAULT_MARKER_TITLE = '[[SPEAKER_BLOCKS]]';
const DEFAULT_FORM_TITLE = '講者回饋表單';
const DEFAULT_QUESTION_PREFIX = 'A';
const DEFAULT_IGNORE_STATUSES = ['skip', '忽略', '不產生', '不處理', 'x'];

const DEFAULT_RATING_ROWS = [
  '整體推薦度',
  '對我的實用性',
  '對我的啟發性',
  '業配程度'
];

const DEFAULT_RATING_COLUMNS = ['1. 非常低', '2. 低', '3. 普通', '4. 高', '5. 非常高'];

type ConfigMap = Record<string, GoogleAppsScript.Base.CellValue>;

type SpeakerRow = {
  formTitle: string;
  speakerName: string;
  speakerTopic: string;
  status: string;
};

type SpeakerConfig = {
  templateFormId: string;
  outputFolderId: string;
  markerTitle: string;
  dataSheetName?: string;
  questionPrefix: string;
  questionStartNumber: number;
  questionRequired: boolean;
  removeMarker: boolean;
  ratingRows: string[];
  ratingColumns: string[];
  ignoreStatuses: string[];
};

/**
 * Generates a new Google Form from a template and inserts speaker rating blocks.
 * It reads speaker data from the spreadsheet and writes back the created URLs.
 * @returns Nothing.
 */
export function generateSpeakerFeedbackForm(): void {
  const spreadsheet = SpreadsheetApp.getActive();
  const configSheet = getRequiredSheet_(spreadsheet, CONFIG_SHEET_NAME);
  const rawConfig = readConfig_(configSheet);
  const config = normalizeConfig_(rawConfig);

  const dataSheet = config.dataSheetName
    ? getRequiredSheet_(spreadsheet, config.dataSheetName)
    : spreadsheet.getActiveSheet();

  const speakerRows = readSpeakerRows_(dataSheet);
  const filteredSpeakers = speakerRows.filter((row) => shouldIncludeSpeaker_(row, config));

  if (filteredSpeakers.length === 0) {
    throw new Error('找不到任何講者資料，請確認講者名稱與主題欄位是否有內容。');
  }

  const formTitle = getFormTitle_(filteredSpeakers, rawConfig);
  const templateFile = DriveApp.getFileById(config.templateFormId);
  const targetFolder = DriveApp.getFolderById(config.outputFolderId);
  const newFile = templateFile.makeCopy(formTitle, targetFolder);
  const form = FormApp.openById(newFile.getId());

  form.setTitle(formTitle).setAcceptingResponses(true);

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

  upsertConfig_(configSheet, 'created_form_id', newFile.getId());
  upsertConfig_(configSheet, 'published_url', form.getPublishedUrl());
  upsertConfig_(configSheet, 'edit_url', form.getEditUrl());
  upsertConfig_(configSheet, 'created_at', new Date());

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
      `填寫連結：${form.getPublishedUrl()}`,
      `編輯連結：${form.getEditUrl()}`
    ].join('\n'),
  );

  return undefined;
}

function readConfig_(sheet: GoogleAppsScript.Spreadsheet.Sheet): ConfigMap {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return {};
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const config: ConfigMap = {};
  rows.forEach(([key, value]) => {
    if (key === '' || key === null || typeof key === 'undefined') {
      return;
    }
    config[String(key).trim()] = value;
  });

  return config;
}

function normalizeConfig_(config: ConfigMap): SpeakerConfig {
  const templateFormId = requireValue_(config.template_form_id, 'template_form_id');
  const outputFolderId = requireValue_(config.output_folder_id, 'output_folder_id');
  const markerTitle = toText_(config.marker_title, DEFAULT_MARKER_TITLE);
  const dataSheetName = toText_(config.data_sheet_name, '');
  const questionPrefix = toText_(config.question_prefix, DEFAULT_QUESTION_PREFIX);
  const questionStartNumber = toNumber_(config.question_start_number, 1);
  const questionRequired = toBoolean_(config.question_required, true);
  const removeMarker = toBoolean_(config.remove_marker, true);

  const ratingRows = parseDelimited_(config.rating_rows).filter(Boolean);
  const ratingColumns = parseDelimited_(config.rating_columns).filter(Boolean);
  const ignoreStatuses = parseDelimited_(config.ignore_statuses).filter(Boolean);

  return {
    templateFormId: templateFormId.toString().trim(),
    outputFolderId: outputFolderId.toString().trim(),
    markerTitle: markerTitle || DEFAULT_MARKER_TITLE,
    dataSheetName: dataSheetName || undefined,
    questionPrefix: questionPrefix || DEFAULT_QUESTION_PREFIX,
    questionStartNumber,
    questionRequired,
    removeMarker,
    ratingRows: ratingRows.length ? ratingRows : DEFAULT_RATING_ROWS,
    ratingColumns: ratingColumns.length ? ratingColumns : DEFAULT_RATING_COLUMNS,
    ignoreStatuses: ignoreStatuses.length ? ignoreStatuses : DEFAULT_IGNORE_STATUSES
  };
}

function readSpeakerRows_(sheet: GoogleAppsScript.Spreadsheet.Sheet): SpeakerRow[] {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) {
    return [];
  }

  const header = sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map((cell) => (cell ?? '').toString().trim());

  const headerLower = header.map((value) => value.toLowerCase());
  const formTitleIndex = findHeaderIndex_(headerLower, ['表單名稱', 'form title', 'form_name'], 0);
  const speakerNameIndex = findHeaderIndex_(headerLower, ['講者名稱', 'speaker', 'speaker name'], 1);
  const speakerTopicIndex = findHeaderIndex_(headerLower, ['講者主題', 'topic', 'title'], 2);
  const statusIndex = findHeaderIndex_(headerLower, ['狀態', 'status'], 3);

  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return rows.map((row) => ({
    formTitle: toText_(row[formTitleIndex], ''),
    speakerName: toText_(row[speakerNameIndex], ''),
    speakerTopic: toText_(row[speakerTopicIndex], ''),
    status: toText_(row[statusIndex], '')
  }));
}

function findHeaderIndex_(headerLower: string[], candidates: string[], fallback: number): number {
  for (const candidate of candidates) {
    const index = headerLower.indexOf(candidate.toLowerCase());
    if (index >= 0) {
      return index;
    }
  }
  return fallback;
}

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

function getFormTitle_(rows: SpeakerRow[], config: ConfigMap): string {
  const explicitTitle = toText_(config.form_title, '').trim();
  if (explicitTitle) {
    return explicitTitle;
  }

  const sheetTitle = rows.find((row) => row.formTitle.trim())?.formTitle ?? '';
  return sheetTitle.trim() || DEFAULT_FORM_TITLE;
}

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

function findItemIndexByTitle_(form: GoogleAppsScript.Forms.Form, title: string): number {
  const items = form.getItems();
  for (const item of items) {
    if ((item.getTitle() || '') === title) {
      return item.getIndex();
    }
  }
  return -1;
}

function upsertConfig_(sheet: GoogleAppsScript.Spreadsheet.Sheet, key: string, value: unknown): void {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    sheet.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
  }

  const data = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 2).getValues();
  for (let i = 0; i < data.length; i += 1) {
    const existingKey = (data[i][0] ?? '').toString().trim();
    if (existingKey === key) {
      sheet.getRange(i + 2, 2).setValue(value);
      return;
    }
  }

  sheet.appendRow([key, value]);
}

function getRequiredSheet_(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  name: string,
): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    throw new Error(`找不到工作表：${name}`);
  }
  return sheet;
}

function requireValue_(value: GoogleAppsScript.Base.CellValue, keyName: string) {
  if (value === '' || value === null || typeof value === 'undefined') {
    throw new Error(`Config 缺少必填欄位：${keyName}`);
  }
  return value;
}

function toText_(value: GoogleAppsScript.Base.CellValue, fallback: string): string {
  if (value === null || typeof value === 'undefined') {
    return fallback;
  }
  return value.toString().trim();
}

function toBoolean_(value: GoogleAppsScript.Base.CellValue, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === null || typeof value === 'undefined' || value === '') {
    return fallback;
  }
  const normalized = value.toString().trim().toUpperCase();
  return ['TRUE', 'T', 'YES', 'Y', '1'].includes(normalized);
}

function toNumber_(value: GoogleAppsScript.Base.CellValue, fallback: number): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (value === null || typeof value === 'undefined' || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDelimited_(value: GoogleAppsScript.Base.CellValue): string[] {
  if (value === null || typeof value === 'undefined' || value === '') {
    return [];
  }
  return value
    .toString()
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}
