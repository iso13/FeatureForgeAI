// src/utils/dom-generator/element-extractor.ts
/**
 * Handles DOM element extraction and analysis
 * Copyright (c) 2024–2025 David Tran
 */

import type { Page } from "playwright";
import type { InteractiveElement } from "./types.js";

export class ElementExtractor {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async extractInteractiveElements(): Promise<InteractiveElement[]> {
    // First, take a screenshot for debugging
    console.log("📸 Taking page screenshot...");
    try {
      await this.page.screenshot({
        path: "debug-screenshot.png",
        fullPage: true,
      });
      console.log("   Screenshot saved as debug-screenshot.png");
    } catch (error) {
      console.log("   Screenshot failed:", error);
    }

    // Extract interactive elements using comprehensive selectors
    const elementsData = await this.page.evaluate(() => {
      const elements: InteractiveElement[] = [];

      // Priority selectors - most specific first
      const prioritySelectors = [
        // Test attributes (highest priority)
        "[data-testid]",
        "[data-test]",
        "[data-cy]",
        "[test-id]",
        "[data-qa]",
      ];

      const standardSelectors = [
        // Semantic HTML
        "button",
        'input[type="text"]',
        'input[type="email"]',
        'input[type="password"]',
        'input[type="search"]',
        'input[type="submit"]',
        'input[type="button"]',
        "textarea",
        "select",
        "a[href]",
      ];

      const processedTestIds = new Set<string>();
      const processedElements = new Set<string>();

      // Process priority selectors first (test attributes)
      prioritySelectors.forEach((selector) => {
        try {
          const elements_found = document.querySelectorAll(selector);

          elements_found.forEach((el) => {
            const element = el as HTMLElement;

            // Skip hidden or tiny elements
            const rect = element.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) return;

            const style = window.getComputedStyle(element);
            if (
              style.display === "none" ||
              style.visibility === "hidden" ||
              style.opacity === "0"
            )
              return;

            // Get test ID
            const testId =
              element.getAttribute("data-testid") ||
              element.getAttribute("data-test") ||
              element.getAttribute("data-cy") ||
              element.getAttribute("test-id") ||
              element.getAttribute("data-qa") ||
              undefined;

            // Skip if we already processed this test ID
            if (testId && processedTestIds.has(testId)) return;
            if (testId) processedTestIds.add(testId);

            // Get element properties
            const tagName = element.tagName.toLowerCase();
            const inputType = (element as HTMLInputElement).type || "";

            // Determine correct type
            let elementType = tagName;
            if (tagName === "input" && inputType) {
              elementType =
                inputType === "submit" || inputType === "button"
                  ? "button"
                  : "input";
            }

            // Get meaningful text with multiple fallbacks
            let text =
              element.getAttribute("aria-label") ||
              element.getAttribute("title") ||
              element.getAttribute("alt") ||
              element.getAttribute("placeholder") ||
              (element as HTMLInputElement).value ||
              element.textContent?.trim() ||
              "" ||
              testId ||
              "";

            // Clean text
            text = (text || "").replace(/\s+/g, " ").slice(0, 60).trim();

            // Generate selector
            const attr = element.hasAttribute("data-testid")
              ? "data-testid"
              : element.hasAttribute("data-test")
                ? "data-test"
                : element.hasAttribute("data-cy")
                  ? "data-cy"
                  : element.hasAttribute("test-id")
                    ? "test-id"
                    : "data-qa";
            const selector_final = `[${attr}="${testId}"]`;

            // Determine action type based on element characteristics
            let action = "interact with";

            if (
              tagName === "button" ||
              inputType === "submit" ||
              inputType === "button"
            ) {
              action = "click";
              elementType = "button"; // Force correct type
            } else if (tagName === "a" && element.hasAttribute("href")) {
              action = "click";
            } else if (
              tagName === "input" &&
              ["text", "email", "password", "search"].includes(inputType)
            ) {
              action = "enter text in";
              elementType = "input"; // Force correct type
            } else if (tagName === "textarea") {
              action = "enter text in";
            } else if (tagName === "select") {
              action = "select option from";
            } else if (inputType === "checkbox" || inputType === "radio") {
              action = "select";
            }

            // Special handling for SauceDemo elements
            if (testId === "login-button") {
              elementType = "button";
              action = "click";
              text = text || "Login";
            } else if (testId === "username") {
              elementType = "input";
              action = "enter text in";
              text = text || "Username";
            } else if (testId === "password") {
              elementType = "input";
              action = "enter text in";
              text = text || "Password";
            }

            elements.push({
              selector: selector_final,
              type: elementType,
              text: text || testId || `${elementType} element`,
              action,
              testId,
              role: element.getAttribute("role") || undefined,
            });
          });
        } catch (e) {
          console.warn(`Selector "${selector}" caused error:`, e);
        }
      });

      // Process standard selectors for elements without test IDs
      standardSelectors.forEach((selector) => {
        try {
          const elements_found = document.querySelectorAll(selector);

          elements_found.forEach((el) => {
            const element = el as HTMLElement;

            // Skip if element already has a test ID (already processed)
            const hasTestId =
              element.hasAttribute("data-testid") ||
              element.hasAttribute("data-test") ||
              element.hasAttribute("data-cy") ||
              element.hasAttribute("test-id") ||
              element.hasAttribute("data-qa");
            if (hasTestId) return;

            // Skip hidden or tiny elements
            const rect = element.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) return;

            const style = window.getComputedStyle(element);
            if (
              style.display === "none" ||
              style.visibility === "hidden" ||
              style.opacity === "0"
            )
              return;

            // Create unique identifier for deduplication
            const uniqueId = `${selector}-${rect.top.toFixed(0)}-${rect.left.toFixed(0)}`;
            if (processedElements.has(uniqueId)) return;
            processedElements.add(uniqueId);

            // Get element properties
            const tagName = element.tagName.toLowerCase();
            const inputType = (element as HTMLInputElement).type || "";
            const id = element.id;

            // Determine correct type
            let elementType = tagName;
            if (tagName === "input" && inputType) {
              elementType =
                inputType === "submit" || inputType === "button"
                  ? "button"
                  : "input";
            }

            // Get meaningful text
            let text =
              element.getAttribute("aria-label") ||
              element.getAttribute("title") ||
              element.getAttribute("placeholder") ||
              (element as HTMLInputElement).value ||
              element.textContent?.trim() ||
              "" ||
              id ||
              "";

            text = (text || "").replace(/\s+/g, " ").slice(0, 60).trim();

            // Generate selector
            let selector_final = "";
            if (id) {
              selector_final = `#${id}`;
            } else {
              selector_final = selector;
            }

            // Determine action
            let action = "interact with";
            if (
              tagName === "button" ||
              inputType === "submit" ||
              inputType === "button"
            ) {
              action = "click";
              elementType = "button";
            } else if (tagName === "a") {
              action = "click";
            } else if (
              tagName === "input" &&
              ["text", "email", "password", "search"].includes(inputType)
            ) {
              action = "enter text in";
            } else if (tagName === "textarea") {
              action = "enter text in";
            } else if (tagName === "select") {
              action = "select option from";
            }

            if (text) {
              elements.push({
                selector: selector_final,
                type: elementType,
                text: text,
                action,
                testId: undefined,
                role: element.getAttribute("role") || undefined,
              });
            }
          });
        } catch (e) {
          console.warn(`Selector "${selector}" caused error:`, e);
        }
      });

      return elements;
    });

    // Remove duplicates and sort by priority
    const uniqueElements = elementsData
      .filter(
        (el, index, arr) =>
          arr.findIndex(
            (e) => e.testId === el.testId && e.selector === el.selector,
          ) === index,
      )
      .sort((a, b) => {
        // Priority: testId > button > input > others
        if (a.testId && !b.testId) return -1;
        if (!a.testId && b.testId) return 1;
        if (a.type === "button" && b.type !== "button") return -1;
        if (a.type !== "button" && b.type === "button") return 1;
        if (a.action === "click" && b.action !== "click") return -1;
        if (a.action !== "click" && b.action === "click") return 1;
        return 0;
      })
      .slice(0, 10); // Reasonable limit

    console.log("🎯 Element extraction details:");
    uniqueElements.forEach((el, i) => {
      console.log(
        `   ${i + 1}. ${el.type.toUpperCase()}: "${el.text}" (${el.action}) - ${el.selector}`,
      );
    });

    return uniqueElements;
  }
}
