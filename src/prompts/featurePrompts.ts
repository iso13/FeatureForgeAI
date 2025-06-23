import inquirer from 'inquirer';

export async function promptForFeatureDetails(): Promise<{ featureTitle: string; userStory: string; scenarioCount: number }> {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'featureTitle',
      message: 'Enter the feature title:',
      validate: (input: string) => input.trim() ? true : 'Feature title cannot be empty.',
    },
    {
      type: 'input',
      name: 'userStory',
      message: 'Enter the user story (e.g., "As a user, I want to log in so that I can access my account"):',
      validate: (input: string) => input.trim().startsWith('As ') ? true : 'User story must start with "As a...".',
    },
    {
      type: 'input',
      name: 'scenarioCount',
      message: 'Enter the number of scenarios (default 1, max 6):',
      default: '1',
      validate: (input: string) => {
        const num = parseInt(input, 10);
        return (num >= 1 && num <= 6) ? true : 'Please enter a number between 1 and 6.';
      }
    }
  ]);
}