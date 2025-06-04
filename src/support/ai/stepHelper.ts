import fs from 'fs';
import path from 'path';
import * as knowledgeBase from './knowledgeBase';

const { loadKnowledgeBase, saveKnowledgeBase, addStepToKnowledgeBase } = knowledgeBase;

// Define the steps directory
const STEPS_DIR = path.resolve(__dirname, '../../steps');

/**
 * Extracts step definitions from existing step files and stores them in the knowledge base.
 */
export function extractStepsFromFiles(): void {
    console.log('Extracting steps from existing step definition files...');

    const knowledgeBase = loadKnowledgeBase();

    if (!fs.existsSync(STEPS_DIR)) {
        console.warn(`Steps directory not found at: ${STEPS_DIR}`);
        return;
    }

    const stepFiles = fs.readdirSync(STEPS_DIR).filter(file => file.endsWith('.steps.ts'));

    if (stepFiles.length === 0) {
        console.warn(`No step definition files found in: ${STEPS_DIR}`);
        return;
    }

    console.log(`Found ${stepFiles.length} step definition files.`);

    let extractedSteps = 0;
    stepFiles.forEach(file => {
        const filePath = path.join(STEPS_DIR, file);
        console.log(`Processing file: ${filePath}`);

        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`Read file content (${content.length} characters)`);

        // Extract step definitions
        const stepRegex = /(Given|When|Then)\('([^']+)'/g;
        let match;
        while ((match = stepRegex.exec(content)) !== null) {
            const [, keyword, step] = match;
            if (!knowledgeBase[step]) {
                const stepDefinition = `${keyword}('${step}', async function () { /* Existing step logic */ });`;

                // **Call `addStepToKnowledgeBase` to store the step**
                addStepToKnowledgeBase(step, stepDefinition);

                console.log(`Added step to knowledge base: ${keyword}('${step}')`);
                extractedSteps++;
            }
        }
    });

    if (extractedSteps > 0) {
        saveKnowledgeBase(knowledgeBase);
        console.log(`Extracted ${extractedSteps} steps and saved them to the knowledge base.`);
    } else {
        console.log('ℹNo new steps were found.');
    }
}

// Run the extraction when executing this file directly
if (require.main === module) {
    extractStepsFromFiles();
}