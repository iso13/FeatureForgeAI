import * as fs from 'fs';
import * as path from 'path';

const featureDir: string = './src/features/';
const tagRegex: RegExp = /^@[a-z][a-zA-Z0-9]*$/;
const placeholderRegex: RegExp = /<([^>]+)>/g;

function checkFeatureFile(filePath: string): boolean {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines: string[] = content.split('\n');
    let hasErrors = false;

    lines.forEach((line, index) => {
        // Check camelCase tag convention
        const tagMatches = line.match(/@\w+/g);
        if (tagMatches) {
            tagMatches.forEach(tag => {
                if (!tagRegex.test(tag)) {
                    console.error(`[${filePath}:${index + 1}] Invalid tag: ${tag}. Use camelCase.`);
                    hasErrors = true;
                }
            });
        }

        // Check missing placeholders in Scenario Outlines
        if (line.includes('Scenario Outline')) {
            const exampleLines = lines.slice(index).filter(l => l.trim().startsWith('|'));
            const placeholders = [...line.matchAll(placeholderRegex)].map(match => match[1]);

            placeholders.forEach(placeholder => {
                const found = exampleLines.some(l => l.includes(`| ${placeholder} |`));
                if (!found) {
                    console.error(`[${filePath}:${index + 1}] Missing placeholder value for: <${placeholder}>`);
                    hasErrors = true;
                }
            });
        }
    });

    return hasErrors;
}

function lintFeatureFiles(): void {
    let errorCount = 0;
    fs.readdirSync(featureDir).forEach(file => {
        if (file.endsWith('.feature')) {
            const hasErrors = checkFeatureFile(path.join(featureDir, file));
            if (hasErrors) errorCount++;
        }
    });

    if (errorCount > 0) {
        console.error(`Found ${errorCount} issue(s). Please fix them before committing.`);
        process.exit(1);
    } else {
        console.log('All Gherkin files passed custom linting.');
    }
}

lintFeatureFiles();