/**
 * Creates a Google Form that showcases ten different question types.
 * The form includes short answer, paragraph, multiple choice, checkbox, dropdown,
 * linear scale, multiple choice grid, checkbox grid, date, and time questions.
 * @param title The title to use for the generated form. Defaults to a descriptive name.
 * @returns The newly created Form instance with all questions added.
 */
export function createQuestionTypeShowcase(
  title = 'Comprehensive Form Demo',
): GoogleAppsScript.Forms.Form {
  const form = FormApp.create(title).setDescription(
    'A ready-made sample showing ten question types you can adapt for your own surveys.',
  );

  form.addTextItem().setTitle('1) What is your name?').setRequired(true);

  form
    .addParagraphTextItem()
    .setTitle('2) Tell us about your current goals')
    .setHelpText('Share as much detail as you like.')
    .setRequired(true);

  const multipleChoiceItem = form.addMultipleChoiceItem();
  multipleChoiceItem
    .setTitle('3) Which working style do you prefer?')
    .setChoices([
      multipleChoiceItem.createChoice('Remote'),
      multipleChoiceItem.createChoice('Hybrid'),
      multipleChoiceItem.createChoice('In-office'),
    ])
    .setRequired(true);

  const checkboxItem = form.addCheckboxItem();
  checkboxItem
    .setTitle('4) Which tools do you use every day?')
    .setChoices([
      checkboxItem.createChoice('Docs'),
      checkboxItem.createChoice('Sheets'),
      checkboxItem.createChoice('Slides'),
      checkboxItem.createChoice('Forms'),
    ])
    .setRequired(true);

  form
    .addListItem()
    .setTitle('5) Choose your preferred communication channel')
    .setChoiceValues(['Email', 'Chat', 'Video calls', 'In-person']);

  form
    .addScaleItem()
    .setTitle('6) Rate your satisfaction with our tooling')
    .setBounds(1, 10)
    .setLabels('Needs improvement', 'Excellent')
    .setRequired(true);

  form
    .addGridItem()
    .setTitle('7) How confident are you in each project phase?')
    .setRows(['Planning', 'Execution', 'Testing', 'Release'])
    .setColumns(['Not confident', 'Somewhat confident', 'Confident', 'Very confident'])
    .setRequired(true);

  form
    .addCheckboxGridItem()
    .setTitle('8) Which collaboration methods suit each team?')
    .setRows(['Design', 'Engineering', 'QA', 'Marketing'])
    .setColumns(['Workshops', 'Async docs', 'Office hours', 'Standups'])
    .setRequired(true);

  form
    .addDateItem()
    .setTitle('9) What date works best for a kickoff?')
    .setIncludesYear(true)
    .setRequired(true);

  form
    .addTimeItem()
    .setTitle('10) What time of day do you prefer for meetings?')
    .setRequired(true);

  return form;
}

/**
 * Creates a Google Form in Chinese that showcases ten distinct question types and
 * logs the edit/respond URLs for quick sharing.
 * @param title The title to use for the generated form. Defaults to a Chinese showcase title.
 * @returns The newly created Form instance with all questions added.
 */
export function createTenQuestionForm(
  title = '10 種題型示範表單',
): GoogleAppsScript.Forms.Form {
  const form = FormApp.create(title)
    .setDescription('這份範本一次展示 10 種常見的 Google 表單題型，建立後可再自行調整問題與選項。')
    .setProgressBar(true)
    .setShowLinkToRespondAgain(true);

  form.addTextItem().setTitle('1) 您的姓名是？').setRequired(true);

  form
    .addParagraphTextItem()
    .setTitle('2) 請簡述目前的需求或目標')
    .setHelpText('例如專案背景、痛點或期待的成果。')
    .setRequired(true);

  const multipleChoiceItem = form.addMultipleChoiceItem();
  multipleChoiceItem
    .setTitle('3) 您偏好的工作模式？')
    .setChoices([
      multipleChoiceItem.createChoice('遠端'),
      multipleChoiceItem.createChoice('混合'),
      multipleChoiceItem.createChoice('全程在辦公室'),
    ])
    .setRequired(true);

  const checkboxItem = form.addCheckboxItem();
  checkboxItem
    .setTitle('4) 您常用的協作工具（可複選）')
    .setChoices([
      checkboxItem.createChoice('文件/簡報'),
      checkboxItem.createChoice('試算表/資料表'),
      checkboxItem.createChoice('聊天/影音會議'),
      checkboxItem.createChoice('專案管理'),
    ])
    .setRequired(true);

  form
    .addListItem()
    .setTitle('5) 偏好的溝通頻率')
    .setChoiceValues(['每日同步', '每週兩次', '每週一次', '需求時再開會']);

  form
    .addScaleItem()
    .setTitle('6) 目前對流程的滿意度')
    .setBounds(1, 5)
    .setLabels('需要大幅改善', '非常滿意')
    .setRequired(true);

  form
    .addGridItem()
    .setTitle('7) 各專案階段的自信度')
    .setRows(['需求釐清', '設計', '開發', '測試', '上線'])
    .setColumns(['不足', '普通', '充足', '非常充足'])
    .setRequired(true);

  form
    .addCheckboxGridItem()
    .setTitle('8) 各團隊適合的合作方式（可複選）')
    .setRows(['產品', '設計', '工程', 'QA', '營運'])
    .setColumns(['文件先行', '工作坊', '例行站會', '辦公室時段'])
    .setRequired(true);

  form
    .addDateItem()
    .setTitle('9) 希望的啟動日期')
    .setIncludesYear(true)
    .setRequired(true);

  form
    .addTimeItem()
    .setTitle('10) 安排討論的理想時段')
    .setRequired(true);

  Logger.log('編輯連結：%s', form.getEditUrl());
  Logger.log('填寫連結：%s', form.getPublishedUrl());

  return form;
}
