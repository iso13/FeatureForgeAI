// src/steps/Performance/performance.steps.ts
/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import { Given, Then } from "@cucumber/cucumber";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getDirName } from "../../core/utils/dirname.js";

let testResult: string;

interface TestContext {
  endpoint?: string;
  method?: string;
}

function printSeparator(label?: string): void {
  console.log("\n────────────────────────────────────────────");
  if (label) {
    console.log(`📌 ${label}`);
    console.log("────────────────────────────────────────────");
  }
}

Given(
  "I perform a load test on the {string} endpoint using the {string} method",
  function (this: TestContext, endpoint: string, method: string) {
    console.log(`Load test setup: ${method.toUpperCase()} ${endpoint}`);
    this.endpoint = endpoint;
    this.method = method;
  },
);

Given(
  "the test runs with {int} virtual users for a duration of {int} seconds",
  async function (this: TestContext, vus: number, duration: number) {
    const jsonReportPath = "reports/performance/loadTest.json";
    if (!fs.existsSync("reports/performance")) {
      fs.mkdirSync("reports/performance", { recursive: true });
    }

    const __dirname = getDirName(import.meta.url);
    const loadTestPath = path.resolve(
      __dirname,
      "../../support/performance/loadTest.js",
    );

    if (!this.endpoint || !this.method) {
      throw new Error("❌ Endpoint or HTTP method is not defined.");
    }

    const command = `k6 run \
  --out experimental-prometheus-rw=http://localhost:9090/api/v1/write \
  --out json=reports/performance/loadTest.json \
  ${loadTestPath}`;

    printSeparator("Running k6 Load Test");
    console.log(`Command: ${command}`);
    console.log(`Env - VUS: ${vus}, Duration: ${duration}s`);
    console.log(`Endpoint: ${this.endpoint}, Method: ${this.method}`);

    try {
      execSync(command, {
        env: {
          ...process.env,
          VUS: vus.toString(),
          DURATION: `${duration}s`,
          ENDPOINT: this.endpoint,
          METHOD: this.method,
        },
        stdio: "inherit",
      });
    } catch (error) {
      console.error("❌ k6 execution failed:", (error as Error).message);
      throw new Error("k6 test run failed. Check logs above for details.");
    }

    if (fs.existsSync(jsonReportPath)) {
      printSeparator("Reading k6 Test Results");
      testResult = fs.readFileSync(jsonReportPath, "utf8");
    } else {
      throw new Error("❌ Load test JSON report was not found.");
    }
  },
);

Then("the test should complete successfully", function (): void {
  const resultData = JSON.parse(testResult);
  const checks = resultData.metrics.checks;

  const successRate = checks?.values.rate ?? 0;
  const passed = successRate === 1;

  printSeparator("Success Rate Summary");
  console.log(`✅ Success Rate: ${(successRate * 100).toFixed(2)}%`);
  if (!passed) {
    throw new Error(
      `❌ Test failed. Success rate was ${(successRate * 100).toFixed(2)}%.`,
    );
  }
});

Then(
  "the average response time should be below {int}ms",
  function (threshold: number): void {
    const resultData = JSON.parse(testResult);
    const avg = resultData.metrics["http_req_duration"]?.values.avg;

    printSeparator("Average Response Time");
    console.log(
      `ℹ️ Average response time: ${avg}ms (threshold: ${threshold}ms)`,
    );

    if (avg === undefined || avg >= threshold) {
      throw new Error(
        `❌ Avg response time ${avg}ms exceeds threshold ${threshold}ms.`,
      );
    }
  },
);

Then(
  "the 95th percentile should be below {int}ms",
  function (threshold: number): void {
    const resultData = JSON.parse(testResult);
    const p95 = resultData.metrics["http_req_duration"]?.values["p(95)"];

    printSeparator("95th Percentile Response Time");
    console.log(`ℹ️ 95th percentile: ${p95}ms (threshold: ${threshold}ms)`);

    if (p95 === undefined || p95 >= threshold) {
      throw new Error(
        `❌ 95th percentile ${p95}ms exceeds threshold ${threshold}ms.`,
      );
    }
  },
);

Then(
  "the success rate should be {int}%",
  function (expectedRate: number): void {
    const resultData = JSON.parse(testResult);
    const actualRate = resultData.metrics.checks?.values.rate * 100;

    printSeparator("Success Rate Validation");
    console.log(`ℹ️ Success Rate: ${actualRate}% (expected: ${expectedRate}%)`);

    if (actualRate < expectedRate) {
      throw new Error(
        `❌ Success rate ${actualRate}% is below expected ${expectedRate}%.`,
      );
    }
  },
);

Then(
  "the 95th percentile response time should be below {int}ms",
  function (threshold: number): void {
    const resultData = JSON.parse(testResult);
    const p95 = resultData.metrics["http_req_duration"]?.values["p(95)"];

    printSeparator("95th Percentile Response Time");
    console.log(`ℹ️ 95th percentile: ${p95}ms (threshold: ${threshold}ms)`);

    if (p95 === undefined || p95 >= threshold) {
      throw new Error(
        `❌ 95th percentile ${p95}ms exceeds threshold ${threshold}ms.`,
      );
    }
  },
);

Then("print the k6 performance thresholds summary", function (): void {
  const resultData = JSON.parse(testResult);
  const metrics = resultData.metrics;

  printSeparator("📊 k6 Performance Summary");
  for (const [metric, data] of Object.entries(metrics)) {
    const values = (data as any).values;
    if (!values) continue;

    console.log(`\n📈 ${metric}`);
    for (const [stat, val] of Object.entries(values)) {
      console.log(`  • ${stat}: ${val}`);
    }
  }
});
