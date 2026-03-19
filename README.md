# FeatureForgeAI

AI-powered BDD test generation and execution platform built on Cucumber, Playwright, and TypeScript.

## What It Does

FeatureForgeAI generates production-ready BDD feature files and step definitions through four intelligent pathways:

- **LLM Generator** - Generate features from a title and user story using OpenAI or Ollama
- **API Flow Engine** - Scan OpenAPI specs, discover endpoint chains, generate flow-aware BDD tests
- **DOM Generator** - Analyze a live web page and generate UI scenarios from real elements
- **Scaffolder** - Generate step definitions from existing feature files

## Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- OpenAI API key (for LLM generator)
- Playwright browsers: `npx playwright install`

## Quick Start

```bash
git clone <repo>
cd FeatureForgeAI
npm install
npx playwright install
cp .env.example .env
npm run cucumber
```

Add your `OPENAI_API_KEY` to `.env` before running generators.

## Project Structure

```
src/
├── core/          # Platform engine - world, hooks, pages, types, utils
├── generators/    # LLM, DOM, scaffolder, PDF, agentic generators
├── plugins/       # AI, telemetry, compliance, simulators, performance
├── tools/         # Reporting, linting, utilities
└── examples/      # Demo features, steps, data, and assets
```

## Generators

### LLM Feature Generator

```bash
npm run generate:featureOpenAI
```

Prompts for a feature title and user story, generates a `.feature` file and step definitions using OpenAI.

### DOM Generator

```bash
npm run generate:dom
```

Enter a URL and FeatureForgeAI scans the live page, analyzes interactive elements, and generates BDD scenarios.

### Step Scaffolder

```bash
npm run scaffold:steps
```

Reads existing `.feature` files and generates matching step definition stubs.

### PDF to Feature

```bash
npm run feature:from-pdf
```

Extracts requirements from a PDF document and generates BDD feature files.

## Running Tests

```bash
# Run all tests
npm run cucumber

# Run specific tag
npm run cucumber -- --tags '@ai'

# Run with environment
npm run cucumber:dev
npm run cucumber:staging

# Dry run - validate without executing
npm run cucumber -- --dry-run

# Typecheck
npm run typecheck
```

## Environment Variables

| Variable        | Description                                      |
|-----------------|--------------------------------------------------|
| `OPENAI_API_KEY`| Required for LLM generator                      |
| `ENV`           | Target environment: dev, staging, prod           |
| `TAGS`          | Cucumber tag filter                              |
| `PARALLEL`      | Number of parallel workers                       |
| `RETRY`         | Number of retries on failure                     |
| `FEATURE_PATH`  | Override default feature file path               |
| `STEP_PATH`     | Override default step definition path            |

## Example Features

The `src/examples/` directory contains ready-to-run demonstrations:

- **AI Testing** - RAG validation, fairness auditing, agentic workflows
- **Accessibility** - WCAG compliance using axe-core
- **HIPAA Compliance** - Audit trail and data access scenarios
- **Performance** - Load testing integration
- **Human-in-the-Loop** - Device simulation and monitoring
- **Stock Prediction** - ML model validation

## Architecture

### Core (`src/core/`)
The platform engine. Contains `world.ts`, `hooks.ts`, base page objects, type definitions, and shared utilities. This is loaded directly by Cucumber on every run.

### Generators (`src/generators/`)
The four test generation pathways: LLM-based, DOM-based, scaffolder, PDF extraction, and agentic generation. Each generator is an independent module.

### Plugins (`src/plugins/`)
Optional capabilities: AI/RAG integration, OpenTelemetry tracing, Prometheus metrics, device simulation, compliance regulation tags, and performance tooling.

### Tools (`src/tools/`)
Development utilities: Gherkin linter, report archiving, and path utilities.

### Examples (`src/examples/`)
Demonstration features, step definitions, test data, and ML model assets. These are not customer implementations - they demonstrate platform capabilities.

## Adding a New Customer Implementation

Create a new directory under `src/implementations/`:

```
src/implementations/
└── customer-name/
    ├── features/
    ├── steps/
    ├── pages/
    ├── data/
    └── config/
```

Point Cucumber at it using environment variables:

```bash
FEATURE_PATH=src/implementations/customer-name/features/**/*.feature \
STEP_PATH=src/implementations/customer-name/steps/**/*.steps.ts \
npm run cucumber
```

## License

Business Source License 1.1 - see `LICENSE.txt`

Non-production use permitted. Converts to MIT on January 1, 2029.

Commercial licensing: davidtran@featuregen.ai
