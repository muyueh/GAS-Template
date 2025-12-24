/**
 * Creates a Google Docs document that demonstrates twenty distinct components.
 * The document includes headings, formatted paragraphs, multiple list types,
 * tables, links, highlights, code styling, images, bookmark navigation,
 * alignment and spacing examples, separators, pagination, and header/footer text.
 * @param title The document title. Defaults to a descriptive showcase title.
 * @returns The newly created Google Docs document containing all components.
 */
export function createDocsComponentShowcase(
  title = 'Google Docs 20 項元件示範',
): GoogleAppsScript.Document.Document {
  const doc = DocumentApp.create(title);
  const body = doc.getBody();

  body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.TITLE);
  body
    .appendParagraph('這份文件示範 20 個常見元件，方便快速複製到專案中。')
    .setHeading(DocumentApp.ParagraphHeading.SUBTITLE);

  let componentIndex = 1;
  const addComponentHeading = (
    label: string,
    heading: GoogleAppsScript.Document.ParagraphHeading = DocumentApp.ParagraphHeading.HEADING2,
  ): GoogleAppsScript.Document.Paragraph => {
    const paragraph = body.appendParagraph(`${componentIndex}. ${label}`);
    paragraph.setHeading(heading);
    componentIndex += 1;

    return paragraph;
  };

  addComponentHeading('Heading 1 標題', DocumentApp.ParagraphHeading.HEADING1);
  addComponentHeading('Heading 2 標題');

  addComponentHeading('混合樣式段落');
  const styledParagraph = body.appendParagraph('此段落包含粗體、斜體與底線文字，以凸顯不同重點。');
  const styledText = styledParagraph.editAsText();
  styledText.setBold(5, 6, true);
  styledText.setItalic(8, 9, true);
  styledText.setUnderline(11, 12, true);
  styledText.setForegroundColor(11, 12, '#c5221f');

  addComponentHeading('引用段落');
  const quoteParagraph = body.appendParagraph('縮排顯示引用內容，適合貼上重點或引述。');
  quoteParagraph.setIndentStart(36);
  quoteParagraph.setIndentFirstLine(36);
  const quoteText = quoteParagraph.editAsText();
  quoteText.setItalic(0, quoteText.getText().length - 1, true);
  quoteText.setForegroundColor('#5f6368');

  addComponentHeading('項目符號清單');
  body.appendListItem('以圓點組織想法').setGlyphType(DocumentApp.GlyphType.BULLET);
  body.appendListItem('適合整理待辦事項').setGlyphType(DocumentApp.GlyphType.BULLET);
  body.appendListItem('支援多層級排版').setGlyphType(DocumentApp.GlyphType.BULLET);

  addComponentHeading('編號清單');
  body.appendListItem('步驟一：蒐集需求').setGlyphType(DocumentApp.GlyphType.NUMBER);
  body.appendListItem('步驟二：規劃解法').setGlyphType(DocumentApp.GlyphType.NUMBER);
  body.appendListItem('步驟三：驗收成果').setGlyphType(DocumentApp.GlyphType.NUMBER);

  addComponentHeading('核取方塊清單');
  body.appendListItem('☐ 設定專案目標').setGlyphType(DocumentApp.GlyphType.SQUARE_BULLET);
  body.appendListItem('☑ 確認驗收標準').setGlyphType(DocumentApp.GlyphType.SQUARE_BULLET);
  body.appendListItem('☐ 安排發佈時程').setGlyphType(DocumentApp.GlyphType.SQUARE_BULLET);

  addComponentHeading('表格');
  const table = body.appendTable([
    ['項目', '狀態', '負責人'],
    ['草稿內容', '完成', 'Alex'],
    ['稿件審核', '進行中', 'River'],
    ['排版設計', '排程中', 'Casey'],
  ]);
  const headerRow = table.getRow(0);
  for (let cellIndex = 0; cellIndex < headerRow.getNumCells(); cellIndex += 1) {
    headerRow.getCell(cellIndex).editAsText().setBold(true);
  }

  addComponentHeading('文字超連結');
  const linkParagraph = body.appendParagraph('點擊開啟 Apps Script 文件');
  linkParagraph.editAsText().setLinkUrl(4, 18, 'https://developers.google.com/apps-script');

  addComponentHeading('重點標記');
  const highlightParagraph = body.appendParagraph('以底色標記提醒讀者留意重要提示。');
  const highlightText = highlightParagraph.editAsText();
  highlightText.setBackgroundColor(0, highlightText.getText().length - 1, '#fff3cd');

  addComponentHeading('程式碼片段');
  const codeParagraph = body.appendParagraph('const docName = DocumentApp.getActiveDocument().getName();');
  const codeText = codeParagraph.editAsText();
  codeText.setFontFamily('Courier New');
  codeText.setBackgroundColor(0, codeText.getText().length - 1, '#f1f3f4');

  addComponentHeading('插入圖片');
  const imageResponse = UrlFetchApp.fetch(
    'https://www.gstatic.com/images/branding/product/1x/docs_48dp.png',
  );
  const inlineImage = body.appendImage(imageResponse.getBlob());
  inlineImage.setAltDescription('Google Docs 圖示');
  inlineImage.setWidth(64);

  addComponentHeading('書籤錨點');
  const bookmarkTarget = body.appendParagraph('這裡是書籤的位置。');
  const bookmarkPosition = doc.newPosition(bookmarkTarget, 0);
  const bookmark = doc.addBookmark(bookmarkPosition);

  addComponentHeading('書籤連結');
  const bookmarkLink = body.appendParagraph('使用內部連結快速跳到書籤。');
  bookmarkLink.appendText('跳到書籤').setLinkUrl(`#bookmark=${bookmark.getId()}`);

  addComponentHeading('置中段落');
  body.appendParagraph('此段落置中，以示範對齊方式。').setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  addComponentHeading('行距設定');
  body.appendParagraph('這段文字將行距放大，讓內容更易讀。').setLineSpacing(1.5);

  addComponentHeading('水平線');
  body.appendHorizontalRule();

  addComponentHeading('分頁符號');
  body.appendParagraph('分頁符號前的段落。');
  body.appendPageBreak();
  body.appendParagraph('新的頁面內容開始。');

  addComponentHeading('頁首文字');
  const header = doc.getHeader() ?? doc.addHeader();
  header.clear();
  header.appendParagraph('Google Docs 元件示範 - 頁首');

  addComponentHeading('頁尾文字');
  const footer = doc.getFooter() ?? doc.addFooter();
  footer.clear();
  footer.appendParagraph('頁尾：可放置聯絡資訊或頁碼');

  Logger.log(`Docs showcase created: ${doc.getUrl()}`);

  return doc;
}

/**
 * Apps Script entrypoint that builds the 20-component Docs showcase and logs the document URL.
 * Exposed to Apps Script as `createDocsComponentShowcase` via the bundler bootstrap.
 * @param title The document title. Defaults to a descriptive showcase title.
 * @returns The newly created Google Docs document containing all components.
 */
export function createDocsComponentShowcaseEntrypoint(
  title = 'Google Docs 20 項元件示範',
): GoogleAppsScript.Document.Document {
  return createDocsComponentShowcase(title);
}
