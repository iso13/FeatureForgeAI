/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

function enforceDeclarativeSteps(content: string): string {
  let transformed = content
    // Standardize quote usage
    .replace(/When I click on the '([^']+)'/gi, 'When I click on the "$1"')
    .replace(/Then I should see a '([^']+)'/gi, 'Then I should see a "$1"')
    .replace(/And I click on the '([^']+)'/gi, 'And I click on the "$1"')

    // Basic parameterization (keep it simple)
    .replace(/"John Doe"/gi, '"<test_name>"')
    .replace(/"Jane Doe"/gi, '"<test_name_2>"')
    .replace(/"john\.doe@example\.com"/gi, '"<existing_email>"')
    .replace(/"jane\.doe@example\.com"/gi, '"<test_email>"')
    .replace(/"password123"/gi, '"<test_password>"')
    
    // Parameterize common messages
    .replace(/"User has been added successfully"/gi, '"<user_creation_success>"')
    .replace(/"Email is already registered"/gi, '"<duplicate_email_error>"')
    .replace(/"Name field is required"/gi, '"<name_required_error>"')
    .replace(/"Email field is required"/gi, '"<email_required_error>"')
    .replace(/"Password field is required"/gi, '"<password_required_error>"')

    // 🎯 NEW: Handle the specific patterns from improved prompt
    .replace(/When I fill in the user details with valid data/gi, 'When I enter valid user information')
    .replace(/When I fill in the user details with invalid data/gi, 'When I enter invalid user information')
    .replace(/When I fill in the user details with an existing username/gi, 'When I enter user information with existing username')
    .replace(/When I fill in the user details(?!\s+with)/gi, 'When I enter user information')
    .replace(/When I click on the "([^"]*)" button without filling in the details/gi, 'When I submit the "$1" action without entering details')
    
    // Transform "I should see" to more generic patterns
    .replace(/Then I should see a success message/gi, 'Then a success message should be displayed')
    .replace(/Then I should see an error message/gi, 'Then an error message should be displayed')
    .replace(/Then I should see a duplicate username error message/gi, 'Then a duplicate username error should be displayed')
    .replace(/Then I should see an error message indicating that all fields are required/gi, 'Then a required fields error should be displayed')
    .replace(/Then I should be redirected back to the users list page/gi, 'Then I should return to the users list')
    
    // Transform outcome statements to be more generic
    .replace(/And the new user should be added to the system/gi, 'And the user should be created successfully')
    .replace(/And the new user should not be added to the system/gi, 'And the user should not be created')

    // REMOVED ALL CONFLICTING TRANSFORMATIONS;

  // 🧠 Fix multiple When statements to When + And (ENHANCED & RELIABLE)
  
  // First, specifically handle "When the user submits" - always make it And
  transformed = transformed.replace(/(\n\s*)When the user submits/gm, '$1And the user submits');
  
  // Then do a simple pass to fix any remaining double When statements
  const lines = transformed.split('\n');
  const fixedLines: string[] = [];
  let inScenario = false;
  let whenCount = 0;
  
  for (const line of lines) {
    if (line.trim().startsWith('Scenario:')) {
      inScenario = true;
      whenCount = 0;
    } else if (line.trim().startsWith('Background:')) {
      inScenario = false;
      whenCount = 0;
    }
    
    if (inScenario && line.trim().startsWith('When ')) {
      whenCount++;
      if (whenCount > 1) {
        // This is the second+ When, change it to And
        console.log(`🔧 Converting When to And: ${line.trim()}`);
        fixedLines.push(line.replace(/(\s*)When /, '$1And '));
      } else {
        // This is the first When, keep it
        fixedLines.push(line);
      }
    } else {
      fixedLines.push(line);
    }
  }
  
  transformed = fixedLines.join('\n');

  // 🧠 Rule enforcement: Warn on multiple When→Then chains
  const scenarioRegex = /(Scenario:.*?)(?=\nScenario:|\n*$)/gs;
  let match: RegExpExecArray | null;
  while ((match = scenarioRegex.exec(transformed)) !== null) {
    const block = match[1];
    const whenCount = (block.match(/^\s*When\b/gm) || []).length;
    const thenCount = (block.match(/^\s*Then\b/gm) || []).length;

    if (whenCount > 1) {
      console.warn(`🔧 Fixed multiple When statements in: ${block.split('\n')[0]}`);
    }
    if (whenCount > 1 && thenCount > 1) {
      console.warn(`⚠️ Detected multiple When→Then pairs in:\n  → ${block.split('\n')[0]}`);
    }
  }

  return transformed;
}

function removeRedundantGivensFromScenarios(content: string): string {
  // Extract background Given statements
  const backgroundMatch: RegExpMatchArray | null = content.match(/Background:\s*([\s\S]*?)(?=\n\s*Scenario:)/);
  if (!backgroundMatch) return content;
  
  const backgroundGivens: string[] = backgroundMatch[1]
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.startsWith('Given ') || line.startsWith('And '))
    .map((line: string) => line.replace(/^And /, 'Given ').toLowerCase());
  
  // Remove redundant Givens from scenarios
  const scenarioRegex = /(Scenario: [^\n]+\n)([\s\S]*?)(?=\n\s*Scenario:|\n*$)/g;
  
  return content.replace(scenarioRegex, (match: string, scenarioHeader: string, scenarioBody: string) => {
    const lines: string[] = scenarioBody.trim().split('\n').map((line: string) => line.trim());
    const filteredLines: string[] = [];
    
    for (const line of lines) {
      // Skip Given/And statements that duplicate background
      if ((line.startsWith('Given ') || (line.startsWith('And ') && filteredLines.length === 0))) {
        const normalizedLine: string = line.replace(/^And /, 'Given ').toLowerCase();
        const isDuplicate: boolean = backgroundGivens.some((bgGiven: string) => {
          const bgCore: string = bgGiven.replace('given ', '');
          const lineCore: string = normalizedLine.replace('given ', '');
          return lineCore.includes(bgCore) || bgCore.includes(lineCore);
        });
        
        if (!isDuplicate) {
          filteredLines.push(line);
        } else {
          console.warn(`🔧 Removing redundant Given: "${line}" (already in Background)`);
        }
      } else {
        filteredLines.push(line);
      }
    }
    
    return scenarioHeader + '  ' + filteredLines.join('\n  ') + '\n';
  });
}

function splitMultipleWhenThenChains(content: string): string {
  const scenarioRegex = /(Scenario: [^\n]+\n)([\s\S]*?)(?=\n\s*Scenario:|\n*$)/g;
  
  return content.replace(scenarioRegex, (match: string, scenarioHeader: string, scenarioBody: string) => {
    const lines: string[] = scenarioBody.trim().split('\n').map((line: string) => line.trim());
    const scenarios: string[][] = [];
    let currentScenario: string[] = [];
    let whenCount = 0;
    
    for (const line of lines) {
      if (line.startsWith('When ')) {
        whenCount++;
        
        // If this is the second When, start a new scenario
        if (whenCount > 1 && currentScenario.length > 0) {
          scenarios.push([...currentScenario]);
          currentScenario = [];
          // Add context for the new scenario if needed
          if (scenarios.length === 1) {
            currentScenario.push('Given the previous action was completed');
          }
        }
      }
      
      currentScenario.push(line);
    }
    
    // Add the last scenario
    if (currentScenario.length > 0) {
      scenarios.push(currentScenario);
    }
    
    // If we found multiple scenarios, split them
    if (scenarios.length > 1) {
      console.warn(`🔧 Splitting scenario with multiple When statements`);
      
      return scenarios.map((scenarioLines: string[], index: number) => {
        const originalTitle: string = scenarioHeader.replace('Scenario: ', '').replace('\n', '');
        const newTitle: string = generateScenarioTitle(scenarioLines, originalTitle, index);
          
        return `Scenario: ${newTitle}\n  ${scenarioLines.join('\n  ')}\n`;
      }).join('\n');
    }
    
    return match;
  });
}

function generateScenarioTitle(scenarioLines: string[], originalTitle: string, index: number): string {
  const whenLine: string | undefined = scenarioLines.find((line: string) => line.startsWith('When '));
  if (!whenLine) return `${originalTitle} - Part ${index + 1}`;
  
  // Extract meaningful action from When statement
  if (whenLine.includes('request user details') || whenLine.includes('search')) {
    return 'Find existing user';
  }
  if (whenLine.includes('request deletion') && !whenLine.includes('bulk')) {
    return 'Remove single user from system';
  }
  if (whenLine.includes('bulk') || whenLine.includes('multiple')) {
    return 'Remove multiple users from system';
  }
  if (whenLine.includes('cancel')) {
    return 'Cancel user removal process';
  }
  if (whenLine.includes('attempt') || whenLine.includes('non-existent')) {
    return 'Handle deletion of non-existent user';
  }
  
  return `${originalTitle} - ${index === 0 ? 'Setup' : 'Action'}`;
}

function addSpecificTestData(content: string): string {
  return content
    // Add specific usernames where missing
    .replace(/(?:user|users)(?!\s*")/gi, (match: string) => {
      if (match.toLowerCase() === 'user') return 'user "testuser123"';
      if (match.toLowerCase() === 'users') return 'users "user1, user2"';
      return match;
    })
    
    // Add specific error messages where missing
    .replace(/error message(?!\s*")/gi, 'error message "Operation failed"')
    .replace(/confirmation message(?!\s*")/gi, 'success notification "Operation completed"')
    
    // Ensure consistent quote usage
    .replace(/'/g, '"');
}

function validateGherkinQuality(content: string): string[] {
  const warnings: string[] = [];
  
  // Check for vague language
  if (/should see a(?!\s+")|should see an(?!\s+")/gi.test(content)) {
    warnings.push("❌ Vague assertions found - specify exactly what should be seen");
  }
  
  // Check for remaining UI-coupled language
  if (/click|button|field(?!\s+in)|page(?!\s+is)/gi.test(content)) {
    warnings.push("⚠️ UI-coupled language detected - consider more declarative approach");
  }
  
  // Check for missing specific test data
  if (/(?:user|users)(?!\s*")/gi.test(content)) {
    warnings.push("📝 Missing specific test data - add concrete examples");
  }
  
  // Check for multiple When statements
  const scenarioMatches = content.match(/Scenario:[\s\S]*?(?=\nScenario:|\n*$)/g);
  const scenarios: string[] = scenarioMatches || [];
  
  scenarios.forEach((scenario: string, index: number) => {
    const whenMatches = scenario.match(/^\s*When\s/gm);
    const whenCount: number = whenMatches ? whenMatches.length : 0;
    
    if (whenCount > 1) {
      warnings.push(`🔄 Scenario ${index + 1} has ${whenCount} When statements - should be split`);
    }
    
    // Check scenario length
    const stepLines: string[] = scenario.split('\n').filter((line: string) => 
      /^\s*(Given|When|Then|And|But)\s/.test(line)
    );
    if (stepLines.length > 6) {
      warnings.push(`📏 Scenario ${index + 1} too long (${stepLines.length} steps) - consider splitting`);
    }
  });
  
  // Check for proper background usage
  const backgroundMatch: RegExpMatchArray | null = content.match(/Background:/);
  const scenarioGivensMatch = content.match(/Scenario:[\s\S]*?^\s*Given\s/gm);
  
  if (backgroundMatch && scenarioGivensMatch && scenarioGivensMatch.length > 0) {
    warnings.push("🔄 Found Given statements in scenarios despite Background - may be redundant");
  }
  
  return warnings;
}

// Export the main function and utilities
export {
  enforceDeclarativeSteps,
  removeRedundantGivensFromScenarios,
  splitMultipleWhenThenChains,
  validateGherkinQuality
};