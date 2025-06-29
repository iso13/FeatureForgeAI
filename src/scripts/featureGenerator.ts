// src/scripts/featureGenerator.ts
// It prompts the user for feature details, generates Gherkin content, and writes both the feature file using OpenAI
import path from 'path';
import { promptForFeatureDetails } from '../prompts/featurePrompts';
import { generateGherkinPrompt } from '../utils/gherkinPrompt';
import { enforceDeclarativeSteps } from '../utils/enforceDeclarative';
import { generateStepDefinitions } from '../utils/stepWriter';
import { validateStepCoverage } from '../utils/gherkinUtils';
import { writeFeatureFile as saveFeatureFile, writeStepFile as saveStepDefinitions } from '../helpers/filewriter';

export async function generateFeature() {
  try {
    const { featureTitle, userStory, scenarioCount } = await promptForFeatureDetails();

    const tag = `@${featureTitle.replace(/\s+/g, '').toLowerCase()}`;
    const rawGherkinContent = await generateGherkinPrompt(tag, featureTitle, userStory, scenarioCount);
    const cleanedGherkinContent = enforceDeclarativeSteps(rawGherkinContent);

    const featurePath = path.resolve('src/features', `${featureTitle.replace(/\s+/g, '')}.feature`);
    const stepPath = path.resolve('src/steps', `${featureTitle.replace(/\s+/g, '').toLowerCase()}.steps.ts`);

    await saveFeatureFile(featurePath, cleanedGherkinContent);

    const stepDefinitions = await generateStepDefinitions(cleanedGherkinContent);
    await saveStepDefinitions(stepPath, stepDefinitions);

    validateStepCoverage(cleanedGherkinContent, stepDefinitions);

    console.log('✅ Feature and step definitions successfully generated.');
  } catch (error) {
    console.error('❌ Error during feature generation:', error);
  }
}