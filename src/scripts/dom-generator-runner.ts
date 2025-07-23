#!/usr/bin/env tsx
// src/scripts/dom-generator-runner.ts
/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import { DOMGenerator } from '../utils/dom-generator.js';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname fix
const __filename = fileURLToPath(new URL(import.meta.url));
const __dirname = path.dirname(__filename);
const FEATURES_DIR = path.resolve(__dirname, '../../src/features');
const STEPS_DIR = path.resolve(__dirname, '../../src/steps');

// Define the analysis type to match your CURRENT DOMGenerator return type
interface AnalysisResult {
  title: string;
  buttonCount: number;
  inputCount: number;
  linkCount: number;
  actions: string[];
  // Optional properties for enhanced version
  elements?: Array<{
    selector: string;
    type: string;
    text: string;
    action: string;
    testId?: string;
    role?: string;
  }>;
  url?: string;
}

// Smart feature name inference
function inferFeatureName(analysis: AnalysisResult): string {
  const { title, elements } = analysis;
  
  if (!elements || elements.length === 0) {
    return title.replace(/[^a-zA-Z0-9\s]/g, '').trim() || "Page Interaction";
  }
  
  // Detect login pages
  const hasLoginButton = elements.some(el => 
    el.text.toLowerCase().includes('login') || 
    el.text.toLowerCase().includes('sign in')
  );
  const hasUsernamePassword = elements.some(el => 
    el.type === 'input' && 
    (el.text.toLowerCase().includes('username') || 
     el.text.toLowerCase().includes('password') || 
     el.text.toLowerCase().includes('email') ||
     el.testId?.toLowerCase().includes('username') ||
     el.testId?.toLowerCase().includes('password'))
  );
  
  if (hasLoginButton && hasUsernamePassword) {
    return "User Authentication";
  }
  
  // Detect shopping/ecommerce
  if (title.toLowerCase().includes('shop') || 
      title.toLowerCase().includes('store') || 
      title.toLowerCase().includes('cart')) {
    return "Product Shopping";
  }
  
  // Detect form-heavy pages
  const inputCount = elements.filter(el => el.type === 'input' || el.type === 'textarea').length;
  if (inputCount >= 3) {
    return "Form Submission";
  }
  
  // Detect dashboard/admin pages
  if (title.toLowerCase().includes('dashboard') || 
      title.toLowerCase().includes('admin') ||
      title.toLowerCase().includes('panel')) {
    return "Dashboard Management";
  }
  
  // Fallback to cleaned page title
  return title.replace(/[^a-zA-Z0-9\s]/g, '').trim() || "Page Interaction";
}

async function run() {
  const [, , argUrl, argFeature] = process.argv;

  let url: string;
  let featureName: string;
  let generateSteps: boolean;
  let requiresLogin: boolean;

  if (argUrl) {
    // URL provided via command line - bypass prompts and use intelligent naming
    url = argUrl;
    generateSteps = true;
    requiresLogin = false;
    
    console.log(`🎯 Using URL: ${url}`);
    console.log('🤖 Feature name will be auto-generated based on page analysis...');
    
    // We'll set featureName after DOM analysis
    featureName = argFeature || ''; // Will be overridden
  } else {
    // No URL provided - use interactive prompts
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'url',
        message: 'Enter the full URL of the page to scan:',
        validate: (input) => input.startsWith('http') ? true : 'Enter a valid URL',
      },
      {
        type: 'input',
        name: 'featureName',
        message: 'Enter the Feature title (or press Enter for auto-generation):',
        default: '',
      },
      {
        type: 'confirm',
        name: 'generateSteps',
        message: 'Generate step definitions file?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'requiresLogin',
        message: 'Does this page require login?',
        default: false,
      }
    ]);
    
    ({ url, featureName, generateSteps, requiresLogin } = answers);
  }

  console.log('🚀 Starting DOM analysis...');
  const generator = new DOMGenerator();

  try {
    if (requiresLogin) {
      console.log('⚠️  Login automation not yet implemented.');
      console.log('💡 Try accessing a public page or add authentication manually.');
      await generator.cleanup();
      return;
    }

    console.log(`🔍 Analyzing page: ${url}`);
    const analysis: AnalysisResult = await generator.analyzePage(url);
    
    // 🚨 DEBUG: Let's see what we got
    console.log('\n🔍 DEBUG Analysis Results:');
    console.log('   Title:', analysis.title);
    console.log('   Elements found:', analysis.elements?.length || 0);
    console.log('   Elements exist:', !!analysis.elements);
    
    if (analysis.elements && analysis.elements.length > 0) {
      console.log('   First 3 elements:');
      analysis.elements.slice(0, 3).forEach((el, i) => {
        console.log(`     ${i + 1}. ${el.type}: "${el.text}" (${el.action})`);
      });
    }
    
    // Auto-generate feature name if not provided
    if (!featureName || featureName.trim() === '') {
      featureName = inferFeatureName(analysis);
      console.log(`🤖 Auto-generated feature name: "${featureName}"`);
    }
    
    console.log('📝 Generating feature file...');
    const feature = generator.generateFeature(analysis, featureName);

    // Ensure directories exist
    await Promise.all([
      fs.ensureDir(FEATURES_DIR),
      generateSteps ? fs.ensureDir(STEPS_DIR) : Promise.resolve()
    ]);

    // Generate file names
    const sanitizedName = featureName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
    const featureFileName = `${sanitizedName}.feature`;
    const stepsFileName = `${sanitizedName.toLowerCase()}.steps.ts`;

    // Write feature file
    const featurePath = path.join(FEATURES_DIR, featureFileName);
    await fs.writeFile(featurePath, feature, 'utf8');
    console.log(`Feature file saved: src/features/${featureFileName}`);

    // Generate and write step definitions if requested
    if (generateSteps) {
      console.log('🔧 Generating step definitions...');
      try {
        const generatorWithSteps = generator as any;
        if (typeof generatorWithSteps.generateStepDefinitions === 'function') {
          const stepDefinitions = generatorWithSteps.generateStepDefinitions(analysis, featureName);
          const stepsPath = path.join(STEPS_DIR, stepsFileName);
          await fs.writeFile(stepsPath, stepDefinitions, 'utf8');
          console.log(`Step definitions saved: src/steps/${stepsFileName}`);
        } else {
          console.log('Step definitions generation not available in current DOMGenerator');
        }
      } catch (error) {
        console.log('Could not generate step definitions:', error);
      }
    }

    // Display summary
    console.log('\n📊 Analysis Summary:');
    console.log(`   🎯 Page Title: ${analysis.title}`);
    console.log(`   🤖 Generated Feature: ${featureName}`);
    console.log(`   🔗 URL: ${analysis.url || url}`);
    console.log(`   ⚡ Interactive Elements: ${analysis.elements?.length || 0}`);
    
    // Show detailed elements from enhanced analysis
    if (analysis.elements && analysis.elements.length > 0) {
      console.log('\n🎮 Found Elements:');
      analysis.elements.slice(0, 5).forEach((el, i) => {
        const name = el.testId || el.text?.slice(0, 30) || `${el.type} element`;
        console.log(`   ${i + 1}. ${el.type?.toUpperCase()}: ${name} (${el.action})`);
      });
      if (analysis.elements.length > 5) {
        console.log(`   ... and ${analysis.elements.length - 5} more elements`);
      }
    } else {
      // Fallback to old format if elements array is empty
      const totalElements = analysis.buttonCount + analysis.inputCount + analysis.linkCount;
      console.log(`   ⚡ Interactive Elements: ${totalElements}`);
      console.log(`   🔲 Buttons: ${analysis.buttonCount}`);
      console.log(`   📝 Inputs: ${analysis.inputCount}`);
      console.log(`   🔗 Links: ${analysis.linkCount}`);
    }

    // Show preview
    console.log('\n📋 Feature Preview:');
    console.log('─'.repeat(60));
    const previewLines = feature.split('\n').slice(0, 15);
    console.log(previewLines.join('\n'));
    if (feature.split('\n').length > 15) {
      console.log('... (see full file for complete content)');
    }

    console.log('\n🏃‍♂️ Next Steps:');
    console.log('   1. Review generated scenarios for business accuracy');
    console.log('   2. Update selectors to match your application');
    console.log('   3. Add proper test data in CustomWorld');
    console.log('   4. Run: npx cucumber-js to execute tests');

  } catch (error) {
    console.error('❌ Failed to generate feature from DOM:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
        console.log('💡 Check if the URL is correct and accessible');
      } else if (error.message.includes('Timeout')) {
        console.log('💡 The page might be taking too long to load. Try a simpler page or increase timeout');
      } else if (error.message.includes('Navigation failed')) {
        console.log('💡 The page might require authentication or have restrictions');
      }
    }
  } finally {
    await generator.cleanup();
  }
}

// Handle process cleanup - ONLY ONCE!
process.on('SIGINT', async () => {
  console.log('\n🛑 Interrupted. Cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Terminated. Cleaning up...');
  process.exit(0);
});

// Run the script - ONLY ONCE!
run().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});