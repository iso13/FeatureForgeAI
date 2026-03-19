// src/scripts/pdfToFeature.ts
/**
 * FeatureForge AI - PDF to Feature Generator
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */
// SPDX-License-Identifier: BSL-1.1

import fs from "fs-extra";
import path from "path";
import pdf from "pdf-parse/lib/pdf-parse.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  FEATURES_DIR: path.resolve(__dirname, "../../src/features/from-pdf"),
  INPUT_PDF_PATH: path.resolve(
    __dirname,
    "../../input-pdfs/Getting Started with Sensitive Data Intelligence.pdf",
  ),
  MAX_CHUNK_SIZE: 8000, // Tokens (roughly 6000 words)
  OPENAI_MODEL: "gpt-4o",
  TEMPERATURE: 0.4,
  MAX_TOKENS: 2048,
  DEFAULT_DOMAIN_TAG: "@securiti",
} as const;

// Types
interface FeatureGenerationResult {
  content: string;
  title: string;
  fileName: string;
}

interface PDFProcessingOptions {
  chunkSize?: number;
  overlapSize?: number;
}

// Custom error classes
class PDFProcessingError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "PDFProcessingError";
  }
}

class FeatureGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "FeatureGenerationError";
  }
}

/**
 * Validates that required environment variables are present
 */
function validateEnvironment(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
}

/**
 * Validates that the input PDF file exists and is readable
 */
async function validatePDFFile(filePath: string): Promise<void> {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }

    // Check file extension
    if (!filePath.toLowerCase().endsWith(".pdf")) {
      throw new Error(`File is not a PDF: ${filePath}`);
    }

    // Check file size (warn if very large)
    const fileSizeMB = stats.size / (1024 * 1024);
    if (fileSizeMB > 50) {
      console.warn(
        `⚠️  Large PDF file detected (${fileSizeMB.toFixed(1)}MB). Processing may take longer.`,
      );
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(`PDF file not found: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Extracts text content from PDF with enhanced error handling
 */
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    console.log(`📖 Extracting text from: ${path.basename(filePath)}`);

    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdf(dataBuffer); // options removed - pdf-parse only accepts buffer

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      throw new PDFProcessingError("PDF contains no extractable text content");
    }

    console.log(
      `✅ Extracted ${pdfData.text.length} characters from ${pdfData.numpages} pages`,
    );
    return pdfData.text.trim();
  } catch (error) {
    if (error instanceof PDFProcessingError) {
      throw error;
    }
    throw new PDFProcessingError(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Splits large text into manageable chunks for processing
 */
function chunkText(text: string, options: PDFProcessingOptions = {}): string[] {
  const { chunkSize = CONFIG.MAX_CHUNK_SIZE, overlapSize = 200 } = options;

  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at sentence boundaries
    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf(".", end);
      const paragraphEnd = text.lastIndexOf("\n\n", end);
      const breakPoint = Math.max(sentenceEnd, paragraphEnd);

      if (breakPoint > start + chunkSize * 0.7) {
        // Don't break too early
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlapSize; // Overlap to maintain context
  }

  console.log(`📝 Split content into ${chunks.length} chunks`);
  return chunks;
}

/**
 * Converts string to lowerCamelCase with improved handling
 */
function toLowerCamelCase(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0) // Remove empty strings
    .map((word, index) => {
      const cleaned = word.replace(/[^a-zA-Z0-9]/g, "");
      if (cleaned.length === 0) return "";

      return index === 0
        ? cleaned.toLowerCase()
        : cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    })
    .filter((word) => word.length > 0)
    .join("");
}

/**
 * Creates a safe filename from feature title
 */
function createSafeFileName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .slice(0, 100); // Limit length
}

/**
 * Enhanced prompt for better feature generation
 */
function createFeaturePrompt(
  text: string,
  chunkIndex?: number,
  totalChunks?: number,
): string {
  const chunkInfo =
    chunkIndex !== undefined && totalChunks !== undefined
      ? `\n\nNote: This is chunk ${chunkIndex + 1} of ${totalChunks} from a larger document.`
      : "";

  return `Convert the following product documentation into a clean, declarative Cucumber BDD feature file.

RULES:
- Create a clear Feature title and description
- Use separate Scenarios for different functionalities
- Each Scenario should test one specific behavior
- Use at most one 'When' step per Scenario
- Prefer declarative language over imperative
- Use Background steps for common setup when appropriate
- Include meaningful tags beyond the auto-generated ones
- Do not include markdown formatting or code blocks
- Avoid data tables unless they significantly improve readability
- Focus on user-facing behavior, not implementation details

GHERKIN BEST PRACTICES:
- Given: Sets up the initial state
- When: Describes the action being performed
- Then: Verifies the expected outcome
- And/But: Used to extend the previous step type

${chunkInfo}

CONTENT:
${text}

Generate a complete, well-structured Gherkin feature file:`;
}

/**
 * Generates BDD feature content from text using OpenAI
 */
async function generateFeatureFromText(
  text: string,
): Promise<FeatureGenerationResult> {
  try {
    console.log("🤖 Generating BDD feature with AI...");

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000, // 60 second timeout
    });

    const chunks = chunkText(text);
    let combinedFeature = "";

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      console.log(`🔄 Processing chunk ${i + 1}/${chunks.length}...`);

      const prompt = createFeaturePrompt(chunks[i], i, chunks.length);

      const response = await openai.chat.completions.create({
        model: CONFIG.OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a senior QA engineer and BDD expert. Generate high-quality Gherkin feature files that follow industry best practices. Focus on creating maintainable, readable, and comprehensive test scenarios that capture the essence of the functionality described in the documentation.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: CONFIG.TEMPERATURE,
        max_tokens: CONFIG.MAX_TOKENS,
      });

      const chunkFeature = response.choices[0].message.content?.trim() || "";

      if (!chunkFeature) {
        throw new FeatureGenerationError(
          `No content generated for chunk ${i + 1}`,
        );
      }

      // For multiple chunks, we need to merge intelligently
      if (chunks.length === 1) {
        combinedFeature = chunkFeature;
      } else {
        // For multiple chunks, extract scenarios and combine under one feature
        if (i === 0) {
          combinedFeature = chunkFeature;
        } else {
          // Extract scenarios from subsequent chunks
          const scenarioMatches = chunkFeature.match(
            /(?:^|\n)(\s*Scenario[^:]*:[\s\S]*?)(?=\n\s*Scenario|\n\s*@|\n\s*Feature:|$)/gm,
          );
          if (scenarioMatches) {
            combinedFeature += "\n\n" + scenarioMatches.join("\n\n");
          }
        }
      }
    }

    // Extract feature title
    const titleMatch = combinedFeature.match(/Feature:\s*(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : "Generated Feature";

    // Generate tags
    const featureTag = toLowerCamelCase(title);
    const domainTag = CONFIG.DEFAULT_DOMAIN_TAG;

    // Ensure we have a valid feature tag
    const finalFeatureTag = featureTag || "generatedFeature";

    // Construct final feature content
    const finalContent = `@${finalFeatureTag} ${domainTag}\n${combinedFeature.trim()}`;

    console.log(`✅ Generated feature: "${title}"`);

    return {
      content: finalContent,
      title,
      fileName: createSafeFileName(title),
    };
  } catch (error) {
    if (error instanceof FeatureGenerationError) {
      throw error;
    }

    // Handle OpenAI specific errors
    if (error && typeof error === "object" && "status" in error) {
      const status = (error as any).status;
      const message = (error as any).message || "Unknown OpenAI error";

      switch (status) {
        case 401:
          throw new FeatureGenerationError("Invalid OpenAI API key");
        case 429:
          throw new FeatureGenerationError(
            "OpenAI API rate limit exceeded. Please try again later.",
          );
        case 500:
        case 502:
        case 503:
          throw new FeatureGenerationError(
            "OpenAI service temporarily unavailable. Please try again later.",
          );
        default:
          throw new FeatureGenerationError(
            `OpenAI API error (${status}): ${message}`,
          );
      }
    }

    throw new FeatureGenerationError(
      `Failed to generate feature: ${error instanceof Error ? error.message : "Unknown error"}`,
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Writes the generated feature file to disk
 */
async function writeFeatureFile(
  result: FeatureGenerationResult,
): Promise<string> {
  try {
    await fs.ensureDir(CONFIG.FEATURES_DIR);

    // Ensure filename is valid and unique
    let fileName = result.fileName || "generated-feature";
    if (!fileName.endsWith(".feature")) {
      fileName += ".feature";
    }

    const filePath = path.join(CONFIG.FEATURES_DIR, fileName);

    // Check if file exists and create unique name if needed
    let counter = 1;
    let finalPath = filePath;
    while (await fs.pathExists(finalPath)) {
      const baseName = fileName.replace(".feature", "");
      finalPath = path.join(
        CONFIG.FEATURES_DIR,
        `${baseName}-${counter}.feature`,
      );
      counter++;
    }

    await fs.writeFile(finalPath, result.content, "utf8");
    console.log(`✅ BDD Feature written to: ${finalPath}`);

    return finalPath;
  } catch (error) {
    throw new Error(
      `Failed to write feature file: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log("🚀 Starting PDF to Feature conversion...\n");

  try {
    // Validate environment and inputs
    validateEnvironment();
    await validatePDFFile(CONFIG.INPUT_PDF_PATH);

    // Extract text from PDF
    const text = await extractTextFromPDF(CONFIG.INPUT_PDF_PATH);

    // Generate feature from text
    const result = await generateFeatureFromText(text);

    // Write feature file
    const outputPath = await writeFeatureFile(result);

    console.log("\n🎉 Conversion completed successfully!");
    console.log(`📄 Feature: "${result.title}"`);
    console.log(`📁 Output: ${outputPath}`);
  } catch (error) {
    console.error("\n❌ Error during PDF to Feature conversion:");

    if (
      error instanceof PDFProcessingError ||
      error instanceof FeatureGenerationError
    ) {
      console.error(`   ${error.message}`);
      if (error.cause) {
        console.error(`   Caused by: ${error.cause.message}`);
      }
    } else if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error("   Unknown error occurred");
    }

    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
