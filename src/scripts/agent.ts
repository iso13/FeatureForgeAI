// src/scripts/agent.ts

import { execSync } from 'child_process';
import { generateAgenticFeature } from '../services/agenticGenerator'; 
import fs from 'fs';
import path from 'path';

/**
 * Accepts a user goal and executes the agentic test loop:
 * 1. Generate feature and step definition
 * 2. Save files to cucumber structure
 * 3. Run tests and capture result
 * 4. Suggest regeneration or fix if failed
 */

async function agenticTest(goal: string) {
  console.log(`🚀 Starting agentic test for: "${goal}"`);

  // Step 1: Auto-generate feature from goal
  await generateAgenticFeature(goal);

  // Step 2: Run cucumber test tagged @agent
  let output = '';
  try {
    console.log(`🧪 Running Cucumber test for @agent`);
    output = execSync(`npx cucumber-js --tags @agent`, { encoding: 'utf8' });
    console.log(output);
  } catch (err: any) {
    output = err.stdout?.toString() || err.message;
  }

  // Step 3: Analyze results
  if (output.includes('0 scenarios (0 passed)')) {
    console.error('❌ No scenarios found. Regenerating...');
  } else if (output.includes('failed')) {
    console.warn('⚠️ Test failed. Consider refining steps or regenerating.');
  } else {
    console.log('✅ Agentic test passed!');
  }
}

// Entry point
const prompt = process.argv[2];
if (!prompt) {
  console.error('❌ Please pass a test goal, e.g.: `node agent.ts "Check password reset flow"`');
  process.exit(1);
}

agenticTest(prompt);