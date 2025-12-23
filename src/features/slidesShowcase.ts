/**
 * Creates a Google Slides presentation that showcases ten distinct Slides features.
 * The presentation demonstrates: a custom background with a formatted title slide,
 * bulleted list, numbered list, table, styled shape, arrow line, image insertion,
 * hyperlink, speaker notes, and an embedded YouTube video.
 * @param title The presentation title to use. Defaults to a descriptive showcase title.
 * @returns The newly created Slides presentation containing all demonstration slides.
 */
export function createSlidesFeatureShowcase(
  title = 'Google Slides 10 項功能示範',
): GoogleAppsScript.Slides.Presentation {
  const presentation = SlidesApp.create(title);

  // Feature 1: Custom background color with a formatted title slide.
  const introSlide = presentation.getSlides()[0];
  introSlide.getBackground().setSolidFill('#f4b400');
  const introBox = introSlide.insertTextBox('Google Slides 功能示範');
  introBox.setTop(80).setLeft(60).setWidth(520).setHeight(120);
  const introText = introBox.getText();
  introText.getTextStyle().setFontSize(36).setBold(true).setForegroundColor('#202124');
  introText.appendParagraph('本投影片展示 10 種常用技巧，包含自訂背景與標題樣式。');
  introText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Feature 2: Bulleted list styling.
  const bulletSlide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const bulletBox = bulletSlide.insertTextBox('2) 項目符號清單');
  bulletBox.setTop(60).setLeft(60).setWidth(520).setHeight(200);
  const bulletText = bulletBox.getText();
  bulletText.appendParagraph('• 條列專案重點');
  bulletText.appendParagraph('• 專注行動項目');
  bulletText.appendParagraph('• 快速報告進度');
  bulletText.getListStyle().applyListPreset(SlidesApp.ListPreset.DISC_CIRCLE_SQUARE);

  // Feature 3: Numbered list styling.
  const numberedSlide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const numberedBox = numberedSlide.insertTextBox('3) 編號清單');
  numberedBox.setTop(60).setLeft(60).setWidth(520).setHeight(200);
  const numberedText = numberedBox.getText();
  numberedText.appendParagraph('1. 需求確認');
  numberedText.appendParagraph('2. 設計與規劃');
  numberedText.appendParagraph('3. 上線驗收');
  numberedText.getListStyle().applyListPreset(SlidesApp.ListPreset.DIGIT_ALPHA_ROMAN);

  // Feature 4: Insert a table.
  const tableSlide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const tableTitle = tableSlide.insertTextBox('4) 表格展示');
  tableTitle.setTop(40).setLeft(60).setWidth(520).setHeight(40);
  const table = tableSlide.insertTable(4, 3);
  table.setLeft(60).setTop(100).setWidth(520);
  table.getCell(0, 0).getText().setText('項目');
  table.getCell(0, 1).getText().setText('狀態');
  table.getCell(0, 2).getText().setText('負責人');
  table.getCell(1, 0).getText().setText('需求彙整');
  table.getCell(1, 1).getText().setText('完成');
  table.getCell(1, 2).getText().setText('Alex');
  table.getCell(2, 0).getText().setText('設計提案');
  table.getCell(2, 1).getText().setText('進行中');
  table.getCell(2, 2).getText().setText('Casey');
  table.getCell(3, 0).getText().setText('測試計畫');
  table.getCell(3, 1).getText().setText('未開始');
  table.getCell(3, 2).getText().setText('River');
  table.getCell(0, 0).getText().getTextStyle().setBold(true);
  table.getCell(0, 1).getText().getTextStyle().setBold(true);
  table.getCell(0, 2).getText().getTextStyle().setBold(true);

  // Feature 5: Styled shape with custom fill and border.
  const shapeSlide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const shapeTitle = shapeSlide.insertTextBox('5) 自訂形狀與顏色');
  shapeTitle.setTop(40).setLeft(60).setWidth(520).setHeight(40);
  const shape = shapeSlide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 80, 120, 440, 120);
  shape.getFill().setSolidFill('#1a73e8');
  shape.getBorder().setDashStyle(SlidesApp.DashStyle.SOLID);
  shape.getBorder().setWeight(3);
  shape.getBorder().getLineFill().setSolidFill('#174ea6');
  const shapeText = shape.getText();
  shapeText.setText('亮點：變更填色、邊框與圓角形狀');
  shapeText.getTextStyle().setFontSize(18).setBold(true).setForegroundColor('#ffffff');
  shapeText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Feature 6: Arrow line to emphasize flow.
  const lineSlide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const lineTitle = lineSlide.insertTextBox('6) 箭頭連接線');
  lineTitle.setTop(40).setLeft(60).setWidth(520).setHeight(40);
  lineSlide.insertShape(SlidesApp.ShapeType.RECTANGLE, 80, 150, 160, 80).getText().setText('起點');
  lineSlide.insertShape(SlidesApp.ShapeType.RECTANGLE, 380, 150, 160, 80).getText().setText('終點');
  const arrow = lineSlide.insertLine(SlidesApp.LineCategory.STRAIGHT, 240, 190, 380, 190);
  arrow.setEndArrow(SlidesApp.ArrowStyle.FILL_ARROW);

  // Feature 7: Insert an image from a URL.
  const imageSlide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const imageTitle = imageSlide.insertTextBox('7) 插入圖片');
  imageTitle.setTop(40).setLeft(60).setWidth(520).setHeight(40);
  const image = imageSlide.insertImage(
    'https://www.gstatic.com/images/branding/product/2x/slides_96dp.png',
  );
  image.setLeft(180).setTop(120).setWidth(240);

  // Feature 8: Hyperlink on text.
  const linkSlide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const linkTitle = linkSlide.insertTextBox('8) 文字超連結');
  linkTitle.setTop(40).setLeft(60).setWidth(520).setHeight(40);
  const linkBox = linkSlide.insertTextBox('前往 Slides 說明文件');
  linkBox.setTop(140).setLeft(120).setWidth(440).setHeight(80);
  const linkText = linkBox.getText();
  linkText
    .getTextStyle()
    .setLinkUrl('https://workspace.google.com/intl/zh-TW/products/slides/')
    .setFontSize(18)
    .setForegroundColor('#0b57d0')
    .setBold(true)
    .setUnderline(true);

  // Feature 9: Speaker notes for presenter hints.
  const notesSlide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const notesTitle = notesSlide.insertTextBox('9) 講者備忘錄');
  notesTitle.setTop(40).setLeft(60).setWidth(520).setHeight(40);
  notesSlide.getNotesPage().getSpeakerNotesShape().getText().setText(
    '提醒：講解此頁時示範如何使用備忘錄記錄重點與下一步。' +
      '備忘錄只會顯示給講者，不會出現在投影片中。',
  );

  // Feature 10: Embedded YouTube video.
  const videoSlide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const videoTitle = videoSlide.insertTextBox('10) 內嵌影片');
  videoTitle.setTop(40).setLeft(60).setWidth(520).setHeight(40);
  videoSlide
    .insertVideo('https://www.youtube.com/watch?v=Qto4uR3viiY', 80, 140, 480, 270)
    .select();

  return presentation;
}
