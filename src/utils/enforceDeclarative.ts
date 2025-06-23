// src/utils/enforceDeclarative.ts
export function enforceDeclarativeSteps(content: string): string {
  return content
    .replace(/When I click on the '([^']+)'/gi, 'When I click on the "$1"')
    .replace(/Then I should see a '([^']+)'/gi, 'Then I should see a "$1"'); // ... add all other rules
}