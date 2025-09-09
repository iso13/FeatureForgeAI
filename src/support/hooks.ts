// src/support/hooks.ts
/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

// SPDX-License-Identifier: BSL-1.1
import {
  Before,
  After,
  BeforeStep,
  AfterStep,
  Status,
  AfterAll,
  setDefaultTimeout,
} from "@cucumber/cucumber";
import type { ITestCaseHookParameter } from "@cucumber/cucumber";
import type { CustomWorld } from "./world";
import * as tracerModule from "./tracer";
import * as path from "path";
import * as fs from "fs";
import { format } from "date-fns";

setDefaultTimeout(10_000);

const { tracer, shutdownTelemetry } = tracerModule;

const isTracingEnabled = process.env.ENABLE_TRACING === "true";
const isVerbose = process.env.VERBOSE === "true";

if (isVerbose) {
  console.log(`OpenTelemetry is ${isTracingEnabled ? "enabled" : "disabled"}`);
}

Before(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  this.pickle = scenario.pickle;
  this.scenarioName = scenario.pickle.name || "Unknown Scenario";

  if (scenario.gherkinDocument?.feature?.name) {
    this.featureName = scenario.gherkinDocument.feature.name;
  } else if (scenario.pickle.uri) {
    const fileName = path.basename(scenario.pickle.uri, ".feature");
    this.featureName = fileName
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  } else {
    this.featureName = "Unknown Feature";
  }

  const hasNoBrowserTag = scenario.pickle.tags.some(
    (tag) => tag.name === "@no-browser",
  );

  this.healthAgent = {
    transcribe: async (stream: any) =>
      `Transcribed summary of stream ${stream.room}`,
    extractClinicalData: async () => ({
      symptoms: ["fatigue", "fever"],
      history: "Patient reports 3 days of flu-like symptoms",
      plan: "Rest and fluids recommended",
    }),
    tagICD10: async () => ({ codes: ["R53.83", "R50.9"] }),
  };

  try {
    if (isTracingEnabled) {
      const spanName = `Feature: ${this.featureName} - Scenario: ${this.scenarioName}`;
      this.testSpan = tracer.startSpan(spanName);
      this.testSpan.setAttribute("cucumber.feature", this.featureName);
      this.testSpan.setAttribute("cucumber.scenario", this.scenarioName);
      this.testSpan.setAttribute(
        "cucumber.tags",
        JSON.stringify(scenario.pickle.tags?.map((t) => t.name) || []),
      );
      this.testSpan.setAttribute("test.framework", "cucumber");
      this.testSpan.setAttribute(
        "browser",
        hasNoBrowserTag ? "none" : "playwright",
      );
    }

    if (hasNoBrowserTag) return;

    const contextOptions = { headless: false };
    await this.launchBrowser(contextOptions);

    if (!this.page)
      throw new Error("Page is still undefined after launching browser");
  } catch (error) {
    console.error("Browser initialization failed:", error);
    throw error;
  }
});

BeforeStep(function (this: CustomWorld, step) {
  if (isVerbose) console.log(`Starting step: ${step.pickleStep.text}`);
  try {
    if (isTracingEnabled && tracer) {
      this.stepSpan = tracer.startSpan(
        `${this.featureName} - ${step.pickleStep.text}`,
        {
          attributes: {
            "cucumber.feature": this.featureName,
            "cucumber.step": step.pickleStep.text,
            "cucumber.scenario": this.scenarioName,
            "test.framework": "cucumber",
          },
        },
      );
    }
  } catch (err) {
    console.warn("Failed to create step span:", err);
  }
});

AfterStep(function (this: CustomWorld) {
  try {
    if (isTracingEnabled && this.stepSpan) this.stepSpan.end();
  } catch (err) {
    console.warn("Failed to end step span:", err);
  }
});

After(
  { timeout: 30_000 },
  async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
    const isFailed = scenario.result?.status === Status.FAILED;
    const hasNoBrowserTag = scenario.pickle.tags.some(
      (tag) => tag.name === "@no-browser",
    );

    if (isTracingEnabled && this.testSpan) {
      this.testSpan.setAttribute(
        "test.status",
        scenario.result?.status || "unknown",
      );
      this.testSpan.end();
    }

    if (isFailed && this.page && !hasNoBrowserTag) {
      const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
      const screenshotPath = path.join(
        "reports/screenshots",
        `${this.featureName?.replace(/\s+/g, "_")}_${this.scenarioName?.replace(/\s+/g, "_")}_${timestamp}.png`,
      );

      try {
        await fs.promises.mkdir(path.dirname(screenshotPath), {
          recursive: true,
        });
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        const imageBuffer = await fs.promises.readFile(screenshotPath);
        this.attach(imageBuffer.toString("base64"), "image/png");
      } catch (err) {
        console.error("Failed to capture or attach screenshot:", err);
      }
    }

    try {
      if (this.page && !hasNoBrowserTag) await this.page.close();
      if (this.context && !hasNoBrowserTag) await this.context.close();
      if (this.browser && !hasNoBrowserTag) await this.browser.close();
    } catch (err) {
      console.warn("Failed to close browser resources:", err);
    }
  },
);

AfterAll(async function () {
  if (isVerbose)
    console.log("All tests complete, shutting down OpenTelemetry...");
  try {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await shutdownTelemetry();
    setTimeout(() => process.exit(0), 1000);
  } catch (err) {
    console.error("Error shutting down OpenTelemetry:", err);
    setTimeout(() => process.exit(1), 100);
  }
});
