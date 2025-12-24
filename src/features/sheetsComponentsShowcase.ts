import { logInfo } from '../lib/logger';

type ProjectRow = [
  string,
  string,
  boolean,
  string,
  Date,
  number,
  number,
  string,
];

/**
 * Creates a Google Sheets workbook populated with 20 distinct components
 * (formatting, data validation, charts, protections, and more) to serve as
 * a reusable showcase template.
 *
 * Components included:
 * 1) Styled and merged title banner.
 * 2) Quick-start helper link (rich text hyperlink).
 * 3) In-cell Sheets logo image.
 * 4) Highlighted instruction note.
 * 5) Pre-filled project tracker table.
 * 6) Frozen header row and first column.
 * 7) Table filter.
 * 8) Alternating row banding.
 * 9) Named range for the table.
 * 10) Checkbox column for completion.
 * 11) Dropdown validation for priority.
 * 12) Date validation for due dates.
 * 13) Number validation + percent format for progress.
 * 14) Conditional formatting when completed.
 * 15) Gradient color scale for progress.
 * 16) Sparkline summarizing overall progress.
 * 17) Bar chart for task progress.
 * 18) Warning-only protection on headers.
 * 19) Rich-text hyperlinks per row.
 * 20) Summary sheet with KPI formulas.
 * @param title The spreadsheet title. Defaults to a descriptive showcase name.
 * @returns The newly created spreadsheet containing all 20 components.
 */
export function createSheetsComponentShowcase(
  title = 'Google Sheets 20 項元件示範',
): GoogleAppsScript.Spreadsheet.Spreadsheet {
  logInfo('createSheetsComponentShowcase()', { title });

  const spreadsheet = SpreadsheetApp.create(title);
  const sheet = spreadsheet.getActiveSheet();
  sheet.setName('Showcase');

  const components: string[] = [];

  // Keep merged ranges out of column A to avoid conflicts with the frozen first column.
  // 1) Styled and merged title banner.
  const titleRange = sheet.getRange('B1:H1');
  titleRange.merge();
  titleRange
    .setValue(title)
    .setBackground('#e8f0fe')
    .setFontSize(18)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  components.push('Merged title banner with styling');

  // 2) Quick-start helper link (rich text hyperlink).
  const helperRange = sheet.getRange('B2:H2');
  helperRange.merge();
  const helperText = SpreadsheetApp.newRichTextValue()
    .setText('開啟 Sheets 說明文件與最佳實務')
    .setLinkUrl('https://support.google.com/docs/answer/6000292')
    .build();
  helperRange.setRichTextValue(helperText).setFontColor('#0b57d0');
  components.push('Helper hyperlink to Sheets documentation');

  // 3) In-cell Sheets logo image.
  sheet
    .getRange('I1')
    .setValue('=IMAGE("https://www.gstatic.com/images/branding/product/2x/sheets_64dp.png")');
  components.push('In-cell Sheets logo image');

  // 4) Highlighted instruction note.
  const instructionRange = sheet.getRange('B3:E3');
  instructionRange
    .merge()
    .setValue('這張表展示 20 種元件，勾選完成或調整數值可觸發不同效果。')
    .setBackground('#fff7d6')
    .setNote('表頭鎖定、包含範例資料、圖表、條件格式、驗證、命名範圍與保護。');
  components.push('Highlighted instruction note');

  // 5) Pre-filled project tracker table.
  const headers = [
    '任務',
    '負責人',
    '完成',
    '優先權',
    '截止日',
    '進度 %',
    '預算',
    '資源連結',
  ];
  const rows: ProjectRow[] = [
    ['導入 CRM', 'Alex', true, '高', new Date('2025-03-15'), 0.92, 12000, 'https://workspace.google.com/'],
    ['資料治理', 'Jamie', false, '中', new Date('2025-04-02'), 0.55, 8000, 'https://cloud.google.com/security'],
    ['自動報表', 'River', false, '高', new Date('2025-03-28'), 0.35, 6000, 'https://lookerstudio.google.com/'],
    ['佈署 Chatbot', 'Casey', true, '中', new Date('2025-03-10'), 0.76, 5000, 'https://cloud.google.com/dialogflow'],
    ['教育訓練', 'Mia', false, '低', new Date('2025-04-12'), 0.4, 3500, 'https://skillshop.exceedlms.com/student/catalog'],
    ['整合 GA4', 'Taylor', false, '高', new Date('2025-03-20'), 0.62, 7000, 'https://analytics.google.com/analytics/web/'],
  ];

  const dataRange = sheet.getRange(4, 1, rows.length + 1, headers.length);
  dataRange.setValues([headers, ...rows]);
  sheet.getRange(4, 1, 1, headers.length).setFontWeight('bold').setBackground('#e4eaed');
  sheet.autoResizeColumns(1, headers.length);
  components.push('Project tracker table with sample data');

  // 6) Frozen header row and first column.
  sheet.setFrozenRows(4);
  sheet.setFrozenColumns(1);
  components.push('Frozen header row and first column');

  // 7) Table filter.
  dataRange.createFilter();
  components.push('Filter applied to the data table');

  // 8) Alternating row banding.
  const banding = dataRange.applyRowBanding(SpreadsheetApp.BandingTheme.GREEN, true, false);
  banding.setFirstRowColor('#d9ead3');
  components.push('Alternating row banding');

  // 9) Named range for the table.
  spreadsheet.setNamedRange('Project_Table', dataRange);
  components.push('Named range for table');

  // 10) Checkbox column for completion.
  const statusRange = sheet.getRange(5, 3, rows.length, 1);
  statusRange.insertCheckboxes();
  components.push('Completion checkbox column');

  // 11) Dropdown validation for priority.
  const priorityValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['高', '中', '低'])
    .setAllowInvalid(false)
    .build();
  sheet.getRange(5, 4, rows.length, 1).setDataValidation(priorityValidation);
  components.push('Priority dropdown validation');

  // 12) Date validation for due dates.
  const dateValidation = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build();
  sheet.getRange(5, 5, rows.length, 1).setDataValidation(dateValidation);
  sheet.getRange(5, 5, rows.length, 1).setNumberFormat('yyyy-mm-dd');
  components.push('Due date validation');

  // 13) Number validation + percent format for progress.
  const progressValidation = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0, 1)
    .setAllowInvalid(false)
    .build();
  const progressRange = sheet.getRange(5, 6, rows.length, 1);
  progressRange.setDataValidation(progressValidation).setNumberFormat('0%');
  components.push('Progress validation with percent formatting');

  // Budget formatting to align with other validations.
  sheet.getRange(5, 7, rows.length, 1).setNumberFormat('"$"#,##0');

  // 14) Conditional formatting when completed.
  const bodyRange = sheet.getRange(5, 1, rows.length, headers.length);
  const completionRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$C5=TRUE')
    .setBackground('#e6f4ea')
    .setFontColor('#137333')
    .setRanges([bodyRange])
    .build();

  // 15) Gradient color scale for progress.
  const progressRule = SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpointWithValue('#e53935', SpreadsheetApp.InterpolationType.NUMBER, '0')
    .setGradientMidpointWithValue('#fbbc04', SpreadsheetApp.InterpolationType.NUMBER, '0.5')
    .setGradientMaxpointWithValue('#34a853', SpreadsheetApp.InterpolationType.NUMBER, '1')
    .setRanges([progressRange])
    .build();

  sheet.setConditionalFormatRules([completionRule, progressRule]);
  components.push('Completion-based conditional formatting');
  components.push('Gradient color scale for progress');

  // 16) Sparkline summarizing overall progress.
  sheet.getRange('I4').setValue('進度趨勢 Sparkline');
  sheet
    .getRange('I5')
    .setFormula(
      `=SPARKLINE(F5:F${rows.length + 4},{"charttype","column";"max",1;"color1","#0b57d0"})`,
    );
  components.push('Sparkline for progress trend');

  // 17) Bar chart for task progress (helper range for clean categories).
  const chartHelperRange = sheet.getRange(4, 10, rows.length + 1, 2);
  chartHelperRange.setValues([
    ['任務', '進度 %'],
    ...rows.map((row) => [row[0], row[5]]),
  ]);

  const chart = sheet
    .newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(chartHelperRange)
    .setOption('title', '任務進度條形圖')
    .setOption('legend', { position: 'none' })
    .setOption('hAxis', { minValue: 0, maxValue: 1, format: '0%' })
    .setPosition(2, 10, 0, 0)
    .build();
  sheet.insertChart(chart);
  components.push('Bar chart summarizing task progress');

  // 18) Warning-only protection on headers.
  const headerProtection = sheet.getRange('A4:H4').protect().setDescription('表頭保護：修改前請確認');
  headerProtection.setWarningOnly(true);
  components.push('Header protection (warning only)');

  // 19) Rich-text hyperlinks per row.
  const resourceLinks = rows.map((row) => [
    SpreadsheetApp.newRichTextValue().setText('開啟資源').setLinkUrl(row[7]).build(),
  ]);
  sheet.getRange(5, 8, rows.length, 1).setRichTextValues(resourceLinks);
  components.push('Row-level resource hyperlinks');

  // 20) Summary sheet with KPI formulas.
  const summarySheet = spreadsheet.insertSheet('Summary');
  summarySheet.getRange('A1').setValue('摘要與 KPI').setFontSize(14).setFontWeight('bold');
  summarySheet
    .getRange('A3:B7')
    .setValues([
      ['任務總數', '=COUNTA(Showcase!A5:A)'],
      ['已完成任務', '=COUNTIF(Showcase!C5:C, TRUE)'],
      ['平均進度', '=AVERAGE(Showcase!F5:F)'],
      ['總預算', '=SUM(Showcase!G5:G)'],
      ['最近截止日', '=MIN(Showcase!E5:E)'],
    ]);
  summarySheet.getRange('B5').setNumberFormat('0%');
  summarySheet.getRange('B6').setNumberFormat('"$"#,##0');
  summarySheet.getRange('B7').setNumberFormat('yyyy-mm-dd');
  summarySheet.autoResizeColumns(1, 2);
  components.push('Summary sheet with KPIs and formulas');

  logInfo('createSheetsComponentShowcase completed', {
    spreadsheetUrl: spreadsheet.getUrl(),
    componentsCount: components.length,
    components,
  });

  return spreadsheet;
}
