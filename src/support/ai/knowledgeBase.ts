import fs from 'fs';
import path from 'path';
import * as knowledgeBase from './knowledgeBase';
console.log(knowledgeBase);

const KNOWLEDGE_BASE_PATH = path.resolve(__dirname, 'knowledgeBase.json');


/**
 * Loads the knowledge base from a JSON file.
 */
export function loadKnowledgeBase(): Record<string, string> {
    if (!fs.existsSync(KNOWLEDGE_BASE_PATH)) {
        return {};
    }
    try {
        const data = fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading knowledge base:', error);
        return {};
    }
}

/**
 * Saves the knowledge base to a JSON file.
 */
export function saveKnowledgeBase(knowledgeBase: Record<string, string>): void {
    try {
        fs.writeFileSync(KNOWLEDGE_BASE_PATH, JSON.stringify(knowledgeBase, null, 2), 'utf8');
        console.log('Knowledge base updated successfully.');
    } catch (error) {
        console.error('Error saving knowledge base:', error);
    }
}

/**
 * Adds a new step to the knowledge base.
 */
export function addStepToKnowledgeBase(step: string, definition: string): void {
    const knowledgeBase = loadKnowledgeBase();
    if (!knowledgeBase[step]) {
        knowledgeBase[step] = definition;
        saveKnowledgeBase(knowledgeBase);
    }
}