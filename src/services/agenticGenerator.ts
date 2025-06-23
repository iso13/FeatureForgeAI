// src/services/agenticGenerator.ts

import { generateGherkinPrompt } from '../utils/gherkinPrompt';
import { generateStepDefinitions } from '../utils/stepWriter';
import { enforceDeclarativeSteps } from '../utils/enforceDeclarative';
import { writeFeatureFile, writeStepFile } from '../helpers/filewriter';
import path from 'path';

export async function generateAgenticFeature(goal: string) {
  const title = goal.trim();
  const tag = '@agent';
  const userStory = `As a user, I want to ${goal} so that I can achieve my task`;
  const scenarioCount = 1;

  const rawGherkin = await generateGherkinPrompt(tag, title, userStory, scenarioCount);
  const gherkin = enforceDeclarativeSteps(rawGherkin);
  const steps = await generateStepDefinitions(gherkin);

  // Create safe filenames
  const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const featurePath = path.resolve('src/features/Agent', `${safeName}.feature`);
  const stepPath = path.resolve('src/steps/agent', `${safeName}.steps.ts`);

  await writeFeatureFile(featurePath, gherkin);
  await writeStepFile(stepPath, steps);

  console.log(`✅ Agentic Feature written to: ${featurePath}`);
  console.log(`✅ Step Definitions written to: ${stepPath}`);

  return { featureText: gherkin, stepDefinitionsText: steps };
}