export function validateStepCoverage(gherkinContent: string, stepDefinitions: string): void {
  const stepRegex = /^\s*(Given|When|Then|And|But)\s+(.+)$/gm;
  const gherkinSteps: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = stepRegex.exec(gherkinContent)) !== null) {
    const stepText = match[2].trim();
    gherkinSteps.push(stepText);
  }

  const stepDefRegex = /(Given|When|Then)\('([^']+)'/g;
  const generatedSteps: string[] = [];

  while ((match = stepDefRegex.exec(stepDefinitions)) !== null) {
    generatedSteps.push(match[2]);
  }

  const missingSteps = gherkinSteps.filter(gherkinStep =>
    !generatedSteps.some(genStep =>
      gherkinStep.toLowerCase().includes(genStep.toLowerCase()) ||
      genStep.toLowerCase().includes(gherkinStep.toLowerCase())
    )
  );

  if (missingSteps.length > 0) {
    console.warn('⚠️ Missing step definitions for:');
    missingSteps.forEach(step => console.warn(`   - ${step}`));
    console.warn('Consider adding these manually or regenerating.');
  } else {
    console.log('✅ All steps have corresponding step definitions');
  }
}