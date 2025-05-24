import OpenAI from 'openai';
import dotenv from 'dotenv';
import { loadKnowledgeBase, saveKnowledgeBase } from '../ai/knowledgeBase';

// Load environment variables from the .env file
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Ensure API key is set
});

/**
 * Generates Gherkin content using OpenAI's API based on a given prompt.
 */
export async function generateGherkinPrompt(prompt: string): Promise<string> {
    try {
        console.log('🔄 Sending request to OpenAI...');
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 1500
        });

        let content = response.choices[0]?.message?.content || '';

        // Cleanup formatting issues
        content = content.replace(/```gherkin|```/g, '').trim();
        content = content.replace(/Feature: .+\n/g, '').trim();

        console.log('Gherkin content successfully generated.');
        return content;
    } catch (error) {
        console.error('Error generating Gherkin content:', error);
        throw new Error('Failed to generate content from OpenAI.');
    }
}

/**
 * Generates TypeScript Cucumber step definitions based on provided Gherkin content.
 */
export async function generateStepDefinitions(gherkinContent: string): Promise<string> {
    try {
        console.log('🔄 Generating step definitions from AI...');
        
        const knowledgeBase = loadKnowledgeBase();  // ✅ Load existing steps
        const existingSteps = Object.keys(knowledgeBase).map(step => `- ${step}`).join('\n');
        
        const aiPrompt = `Convert the following Gherkin scenarios into TypeScript Cucumber step definitions:
        
        ${gherkinContent}

        Ensure that the generated step definitions reuse the following existing steps when applicable:
        ${existingSteps}

        If an existing step is relevant, use its definition instead of creating a new one.
        Use Playwright for UI interactions where applicable.
        Ensure that the generated step definitions use 'this.page' instead of importing 'page' from Playwright.
        Format the output correctly, and do not include any additional comments, explanations, or instructions.
        Ensure that a step that has an 'And' in the step will take the previous step keyword ('Given', 'When', or 'Then') and replace 'And' with the correct keyword in step definitions for compatibility with Cucumber TypeScript.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: aiPrompt }],
            temperature: 0.2,
            max_tokens: 2000
        });

        let stepDefinitions = response.choices[0]?.message?.content || '';

        // Cleanup formatting issues
        stepDefinitions = stepDefinitions.replace(/```typescript|```/g, '').trim();

        console.log('Step definitions successfully generated.');

        // ✅ Save new steps to the knowledge base
        stepDefinitions.split('\n').forEach(stepDef => {
            const match = stepDef.match(/(Given|When|Then)\('([^']+)'\,/);
            if (match) {
                const [, keyword, step] = match;
                if (!knowledgeBase[step]) {
                    knowledgeBase[step] = stepDef;
                }
            }
        });

        saveKnowledgeBase(knowledgeBase);

        return stepDefinitions;
    } catch (error) {
        console.error('Error generating step definitions:', error);
        throw new Error('Failed to generate step definitions from OpenAI.');
    }
}