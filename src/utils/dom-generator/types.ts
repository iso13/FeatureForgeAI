// src/utils/dom-generator/types.ts
/**
 * Type definitions for DOM Generator
 * Copyright (c) 2024–2025 David Tran
 */

/**
 * Represents an interactive element found on a webpage
 */
export interface InteractiveElement {
    /** CSS selector to locate the element */
    selector: string;
    
    /** Element type (button, input, textarea, select, a, etc.) */
    type: string;
    
    /** Visible text content or meaningful identifier */
    text: string;
    
    /** Action that can be performed (click, enter text in, select option from, etc.) */
    action: string;
    
    /** Test attribute value (data-testid, data-test, etc.) */
    testId?: string | undefined;
    
    /** ARIA role attribute value */
    role?: string | undefined;
  }
  
  /**
   * Complete analysis result from DOM scanning
   */
  export interface AnalysisResult {
    /** Page title */
    title: string;
    
    /** Array of detected interactive elements */
    elements: InteractiveElement[];
    
    /** Page URL that was analyzed */
    url: string;
    
    /** Count of button-type elements (for backward compatibility) */
    buttonCount: number;
    
    /** Count of input-type elements (for backward compatibility) */
    inputCount: number;
    
    /** Count of link-type elements (for backward compatibility) */
    linkCount: number;
    
    /** Array of human-readable action descriptions (for backward compatibility) */
    actions: string[];
  }
  
  /**
   * Scenario template for feature generation
   */
  export interface ScenarioTemplate {
    /** Human-readable scenario name */
    name: string;
    
    /** Complete Gherkin scenario content */
    content: string;
  }
  
  /**
   * Configuration for element selectors used in DOM extraction
   */
  export interface ElementSelectors {
    /** High-priority selectors (test attributes) */
    prioritySelectors: string[];
    
    /** Standard HTML element selectors */
    standardSelectors: string[];
  }
  
  /**
   * Element processing configuration
   */
  export interface ElementProcessingConfig {
    /** Maximum number of elements to process */
    maxElements: number;
    
    /** Minimum element size to consider (width/height in pixels) */
    minElementSize: number;
    
    /** Timeout for element detection (milliseconds) */
    detectionTimeout: number;
  }
  
  /**
   * Feature generation configuration
   */
  export interface FeatureGenerationConfig {
    /** Minimum number of scenarios to generate */
    minScenarios: number;
    
    /** Maximum number of scenarios to generate */
    maxScenarios: number;
    
    /** Whether to include edge case scenarios */
    includeEdgeCases: boolean;
    
    /** Whether to include performance testing scenarios */
    includePerformanceTests: boolean;
  }
  
  /**
   * Browser configuration for DOM analysis
   */
  export interface BrowserConfig {
    /** Whether to run browser in headless mode */
    headless: boolean;
    
    /** Browser launch arguments */
    args: string[];
    
    /** Page load timeout (milliseconds) */
    timeout: number;
    
    /** Time to wait for dynamic content (milliseconds) */
    dynamicContentWait: number;
  }