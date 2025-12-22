import { logInfo } from '../lib/logger';

/**
 * Creates a Google Form event survey template with ten distinct question types.
 * The form captures attendee details and preferences using short answer, paragraph,
 * multiple choice, checkbox, dropdown, linear scale, grid, checkbox grid, date,
 * and time items.
 * @returns The created Form instance for further customization if needed.
 */
export function createEventSurveyForm(): GoogleAppsScript.Forms.Form {
  logInfo('Creating event survey form template');

  const form = FormApp.create('活動問卷範本')
    .setDescription(
      '用來蒐集活動參與者的資訊、偏好與時間安排，已涵蓋 10 種常見題型。'
    )
    .setCollectEmail(true)
    .setProgressBar(true)
    .setAllowResponseEdits(true);

  form
    .addTextItem()
    .setTitle('您的姓名')
    .setRequired(true);

  form
    .addParagraphTextItem()
    .setTitle('請描述您想從本次活動獲得的收穫或期待')
    .setRequired(true);

  const awarenessQuestion = form
    .addMultipleChoiceItem()
    .setTitle('您是從哪裡得知這場活動的？')
    .setRequired(true);

  awarenessQuestion.setChoices([
    awarenessQuestion.createChoice('官方網站'),
    awarenessQuestion.createChoice('社群媒體'),
    awarenessQuestion.createChoice('朋友或同事推薦'),
    awarenessQuestion.createChoice('電子報或簡訊'),
    awarenessQuestion.createChoice('其他'),
  ]);

  const interestsQuestion = form
    .addCheckboxItem()
    .setTitle('您對哪些活動主題感興趣？（可複選）')
    .setRequired(true);

  interestsQuestion.setChoices([
    interestsQuestion.createChoice('主題演講'),
    interestsQuestion.createChoice('工作坊或體驗'),
    interestsQuestion.createChoice('產品展示'),
    interestsQuestion.createChoice('交流與聯誼'),
    interestsQuestion.createChoice('QA 或討論環節'),
  ]);

  form
    .addListItem()
    .setTitle('您偏好的參與方式')
    .setChoiceValues(['親自到場', '線上參與', '線上線下皆可']);

  form
    .addScaleItem()
    .setTitle('請評估您對活動整體期待的程度（1-5 分）')
    .setBounds(1, 5)
    .setLabels('期待不高', '非常期待');

  form
    .addGridItem()
    .setTitle('請評估以下要素的重要性')
    .setRows(['講者品質', '議程安排', '交流時間', '場地與交通'])
    .setColumns(['不重要', '普通', '重要', '非常重要'])
    .setRequired(true);

  form
    .addCheckboxGridItem()
    .setTitle('請勾選您方便參與的時間與地點組合')
    .setRows(['週一至週五上午', '週一至週五晚間', '週末白天'])
    .setColumns(['台北場', '台中場', '高雄場', '線上'])
    .setRequired(true);

  form
    .addDateItem()
    .setTitle('您偏好的活動日期')
    .setHelpText('選擇最方便參與的一天，便於主辦方排程。')
    .setRequired(true);

  form
    .addTimeItem()
    .setTitle('理想的開始時間')
    .setHelpText('請提供最適合的開始時間區間。')
    .setRequired(true);

  logInfo('Event survey form created', {
    formId: form.getId(),
    editUrl: form.getEditUrl(),
    publishedUrl: form.getPublishedUrl(),
    summaryUrl: form.getSummaryUrl(),
  });

  return form;
}
