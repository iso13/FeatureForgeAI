#!/usr/bin/env bash
# FeatureForgeAI dependency update plan — run batches separately, test between each.
set -e

echo "=============================================="
echo "BATCH 1: Safe minor/patch bumps (low risk)"
echo "=============================================="
npm install --save-exact \
  @playwright/test@1.62.1 \
  playwright@1.62.1

npm install --save-dev \
  @typescript-eslint/eslint-plugin@8.67.0 \
  @typescript-eslint/parser@8.67.0 \
  @types/node@latest \
  @types/fs-extra@latest \
  @types/inquirer@latest \
  @types/js-yaml@latest \
  @types/jsonfile@latest \
  @types/lodash@latest \
  @types/pixelmatch@latest \
  @types/pngjs@latest \
  @types/prettier@latest \
  @types/chai@latest \
  @types/csv-parse@latest \
  dotenv@latest \
  axios@latest \
  fs-extra@latest \
  prettier@latest \
  eslint@latest \
  eslint-config-prettier@latest \
  eslint-plugin-import@latest \
  eslint-plugin-prettier@latest

echo ""
echo "Batch 1 complete. Run: npm run typecheck && npm run lint && npm run cucumber:dev"
echo "Confirm everything passes before moving to Batch 2."
echo ""

# -----------------------------------------------------------------
# BATCH 2: @cucumber/cucumber major (12 -> 13) — contained but breaking
# -----------------------------------------------------------------
# DO NOT run this until Batch 1 is verified green.
#
# Before running, review:
#   https://github.com/cucumber/cucumber-js/blob/main/UPGRADING.md
# Known breaking changes in v13:
#   - Drops support for Node.js 20.x and 25.x (you're on >=22, so fine)
#   - Removes the deprecated `Cli` export — check for direct imports
#   - Removes deprecated handling of ambiguous formats — check cucumber.mjs
#
# npm install --save-exact @cucumber/cucumber@13.2.1
#
# After installing:
#   npm run lint:gherkin
#   npm run cucumber:dev
#   Check custom formatter/reporter code in src/tools/reporting/ for anything
#   referencing the removed Cli export.

# -----------------------------------------------------------------
# BATCH 3: openai major jump (4 -> 7) — plan and test separately
# -----------------------------------------------------------------
# DO NOT bundle with routine updates. This touches
# src/generators/llm/featureGeneratorOpenAI.ts directly.
#
# npm install --save-exact openai@7.4.0
#
# Then manually verify:
#   - Any direct calls to the Chat Completions API still work as expected,
#     or migrate to the Responses API (now the SDK's primary interface)
#   - Run: npm run generate:featureOpenAI against a known test story and
#     diff the generated .feature output against a known-good baseline

# -----------------------------------------------------------------
# BATCH 4: weaviate-ts-client -> weaviate-client (deprecated package swap)
# -----------------------------------------------------------------
# This is NOT a version bump — v2 (weaviate-ts-client) is deprecated.
# The v3 client is a renamed package with a different, collections-first API.
#
# npm uninstall weaviate-ts-client
# npm install weaviate-client@3.13.1
#
# Then rewrite client init and queries in:
#   src/plugins/ai/seed-weaviate.ts
#   any other file importing weaviate-ts-client
# per the migration guide:
#   https://docs.weaviate.io/weaviate/client-libraries/typescript
