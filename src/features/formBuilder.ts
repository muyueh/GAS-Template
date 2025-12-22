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
