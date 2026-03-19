/**
 * FeatureForgeAI - API Spec Scanner
 * Parses OpenAPI/Swagger specifications and builds an internal model
 * of endpoints, schemas, relationships, and dependencies.
 *
 * Copyright (c) 2024-2026 David Tran
 * Licensed under the Business Source License 1.1
 */

// SPDX-License-Identifier: BSL-1.1

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ApiEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: ApiParameter[];
  requestBody: ApiRequestBody | null;
  responses: Record<string, ApiResponse>;
  requiredFields: string[];
  optionalFields: string[];
  pathDependencies: string[]; // e.g., jobId in /jobs/{jobId}/quote
}

export interface ApiParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  type: string;
  description: string;
  enum?: string[];
}

export interface ApiRequestBody {
  required: boolean;
  contentType: string;
  schema: SchemaDefinition;
  requiredFields: string[];
  optionalFields: string[];
}

export interface ApiResponse {
  statusCode: string;
  description: string;
  schema: SchemaDefinition | null;
  outputFields: string[];
}

export interface SchemaDefinition {
  name: string;
  type: string;
  properties: Record<string, SchemaProperty>;
  required: string[];
  enums: Record<string, string[]>;
}

export interface SchemaProperty {
  name: string;
  type: string;
  format?: string;
  description: string;
  required: boolean;
  enum?: string[];
  ref?: string;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
}

export interface ApiSpec {
  title: string;
  version: string;
  basePath: string;
  baseUrl: string;
  endpoints: ApiEndpoint[];
  schemas: Record<string, SchemaDefinition>;
  tags: ApiTag[];
  securitySchemes: Record<string, any>;
}

export interface ApiTag {
  name: string;
  description: string;
  endpoints: string[]; // operationIds
}

export interface ScanResult {
  specs: ApiSpec[];
  totalEndpoints: number;
  totalSchemas: number;
  centers: string[]; // e.g., ['PolicyCenter', 'BillingCenter', 'ClaimCenter']
  scanTimestamp: string;
}

// ============================================================================
// API Spec Scanner
// ============================================================================

export class ApiSpecScanner {
  private specs: ApiSpec[] = [];
  private rawSpecs: Map<string, any> = new Map();

  /**
   * Scan an OpenAPI spec from a URL (e.g., /rest/apis/openapi.json)
   */
  async scanFromUrl(url: string, centerName?: string): Promise<ApiSpec> {
    console.log(`📡 Scanning API spec from: ${url}`);

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch API spec: ${response.status} ${response.statusText}`);
    }

    const rawSpec = await response.json();
    return this.parseSpec(rawSpec, centerName);
  }

  /**
   * Scan an OpenAPI spec from a local file
   */
  async scanFromFile(filePath: string, centerName?: string): Promise<ApiSpec> {
    console.log(`📂 Scanning API spec from file: ${filePath}`);

    const content = fs.readFileSync(filePath, "utf-8");
    const rawSpec = JSON.parse(content);
    return this.parseSpec(rawSpec, centerName);
  }

  /**
   * Scan multiple specs from a directory (e.g., docs/api/*.json)
   */
  async scanDirectory(dirPath: string): Promise<ScanResult> {
    console.log(`📁 Scanning API specs from directory: ${dirPath}`);

    const files = fs.readdirSync(dirPath).filter(
      (f) => f.endsWith(".json") || f.endsWith(".yaml") || f.endsWith(".yml"),
    );

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const centerName = this.inferCenterName(file);

      try {
        const spec = await this.scanFromFile(fullPath, centerName);
        this.specs.push(spec);
        console.log(`  ✅ ${centerName}: ${spec.endpoints.length} endpoints, ${Object.keys(spec.schemas).length} schemas`);
      } catch (error) {
        console.warn(`  ⚠️  Failed to parse ${file}: ${error}`);
      }
    }

    return this.buildScanResult();
  }

  /**
   * Scan from Guidewire's API discovery endpoint
   * GET /rest/apis returns a list of available APIs
   */
  async scanGuidewireEnvironment(baseUrl: string, auth?: { username: string; password: string }): Promise<ScanResult> {
    console.log(`🔍 Discovering APIs from Guidewire environment: ${baseUrl}`);

    const headers: Record<string, string> = { Accept: "application/json" };
    if (auth) {
      headers["Authorization"] = "Basic " + Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
    }

    // Step 1: Discover available APIs
    const discoveryUrl = `${baseUrl}/rest/apis`;
    const response = await fetch(discoveryUrl, { headers });

    if (!response.ok) {
      throw new Error(`Failed to discover APIs: ${response.status}`);
    }

    const apiList = await response.json();
    console.log(`  Found ${Object.keys(apiList).length} APIs`);

    // Step 2: Fetch each API's OpenAPI spec
    for (const [apiName, apiInfo] of Object.entries(apiList) as [string, any][]) {
      try {
        const specUrl = `${baseUrl}${apiInfo.basePath}/openapi.json`;
        const spec = await this.scanFromUrl(specUrl, apiInfo.title || apiName);
        this.specs.push(spec);
      } catch (error) {
        console.warn(`  ⚠️  Failed to scan ${apiName}: ${error}`);
      }
    }

    return this.buildScanResult();
  }

  // ============================================================================
  // Core Parsing Logic
  // ============================================================================

  private parseSpec(rawSpec: any, centerName?: string): ApiSpec {
    const isV3 = rawSpec.openapi?.startsWith("3.");
    const isV2 = rawSpec.swagger?.startsWith("2.");

    if (!isV3 && !isV2) {
      throw new Error("Unsupported spec format. Expected OpenAPI 3.x or Swagger 2.x");
    }

    const title = centerName || rawSpec.info?.title || "Unknown API";
    this.rawSpecs.set(title, rawSpec);

    const spec: ApiSpec = {
      title,
      version: rawSpec.info?.version || "unknown",
      basePath: isV3
        ? (rawSpec.servers?.[0]?.url || "")
        : (rawSpec.basePath || ""),
      baseUrl: isV3
        ? (rawSpec.servers?.[0]?.url || "")
        : `${rawSpec.host || ""}${rawSpec.basePath || ""}`,
      endpoints: [],
      schemas: {},
      tags: [],
      securitySchemes: isV3
        ? (rawSpec.components?.securitySchemes || {})
        : (rawSpec.securityDefinitions || {}),
    };

    // Parse schemas/definitions
    const schemaSource = isV3
      ? rawSpec.components?.schemas
      : rawSpec.definitions;

    if (schemaSource) {
      spec.schemas = this.parseSchemas(schemaSource);
    }

    // Parse endpoints
    if (rawSpec.paths) {
      spec.endpoints = this.parsePaths(rawSpec.paths, spec.schemas, isV3);
    }

    // Parse tags
    if (rawSpec.tags) {
      spec.tags = rawSpec.tags.map((tag: any) => ({
        name: tag.name,
        description: tag.description || "",
        endpoints: spec.endpoints
          .filter((e) => e.tags.includes(tag.name))
          .map((e) => e.operationId),
      }));
    }

    return spec;
  }

  private parseSchemas(schemaSource: Record<string, any>): Record<string, SchemaDefinition> {
    const schemas: Record<string, SchemaDefinition> = {};

    for (const [name, rawSchema] of Object.entries(schemaSource)) {
      schemas[name] = this.parseSchemaDefinition(name, rawSchema);
    }

    return schemas;
  }

  private parseSchemaDefinition(name: string, raw: any): SchemaDefinition {
    const properties: Record<string, SchemaProperty> = {};
    const enums: Record<string, string[]> = {};
    const required = raw.required || [];

    if (raw.properties) {
      for (const [propName, propRaw] of Object.entries(raw.properties) as [string, any][]) {
        properties[propName] = this.parseSchemaProperty(propName, propRaw, required.includes(propName));

        // Collect enums
        if (propRaw.enum) {
          enums[propName] = propRaw.enum;
        }
        if (propRaw["x-gw-extensions"]?.typelist) {
          enums[propName] = [propRaw["x-gw-extensions"].typelist];
        }
      }
    }

    return {
      name,
      type: raw.type || "object",
      properties,
      required,
      enums,
    };
  }

  private parseSchemaProperty(name: string, raw: any, isRequired: boolean): SchemaProperty {
    const prop: SchemaProperty = {
      name,
      type: raw.type || "string",
      description: raw.description || "",
      required: isRequired,
    };

    if (raw.format) prop.format = raw.format;
    if (raw.enum) prop.enum = raw.enum;
    if (raw.$ref) prop.ref = this.resolveRefName(raw.$ref);
    if (raw.items) {
      prop.items = this.parseSchemaProperty("items", raw.items, false);
    }

    return prop;
  }

  private parsePaths(
    paths: Record<string, any>,
    schemas: Record<string, SchemaDefinition>,
    isV3: boolean,
  ): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = [];
    const methods = ["get", "post", "put", "patch", "delete"];

    for (const [pathStr, pathItem] of Object.entries(paths)) {
      // Collect path-level parameters
      const pathParams = (pathItem.parameters || []).map((p: any) =>
        this.parseParameter(p),
      );

      for (const method of methods) {
        const operation = pathItem[method];
        if (!operation) continue;

        const endpoint = this.parseEndpoint(
          pathStr,
          method.toUpperCase(),
          operation,
          pathParams,
          schemas,
          isV3,
        );

        endpoints.push(endpoint);
      }
    }

    return endpoints;
  }

  private parseEndpoint(
    pathStr: string,
    method: string,
    operation: any,
    pathParams: ApiParameter[],
    schemas: Record<string, SchemaDefinition>,
    isV3: boolean,
  ): ApiEndpoint {
    // Parse parameters
    const operationParams = (operation.parameters || []).map((p: any) =>
      this.parseParameter(p),
    );
    const allParams = [...pathParams, ...operationParams];

    // Parse request body
    let requestBody: ApiRequestBody | null = null;
    if (isV3 && operation.requestBody) {
      requestBody = this.parseRequestBodyV3(operation.requestBody, schemas);
    } else if (!isV3) {
      const bodyParam = allParams.find((p) => p.in === "body" as any);
      if (bodyParam) {
        requestBody = this.parseRequestBodyV2(bodyParam, schemas);
      }
    }

    // Parse responses
    const responses: Record<string, ApiResponse> = {};
    if (operation.responses) {
      for (const [statusCode, responseRaw] of Object.entries(operation.responses) as [string, any][]) {
        responses[statusCode] = this.parseResponse(statusCode, responseRaw, schemas, isV3);
      }
    }

    // Extract path dependencies (e.g., {jobId} from /jobs/{jobId}/quote)
    const pathDependencies = (pathStr.match(/\{(\w+)\}/g) || []).map(
      (match) => match.replace(/[{}]/g, ""),
    );

    return {
      path: pathStr,
      method,
      operationId: operation.operationId || `${method}_${pathStr.replace(/[/{}]/g, "_")}`,
      summary: operation.summary || "",
      description: operation.description || "",
      tags: operation.tags || [],
      parameters: allParams.filter((p) => p.in !== "body" as any),
      requestBody,
      responses,
      requiredFields: requestBody?.requiredFields || [],
      optionalFields: requestBody?.optionalFields || [],
      pathDependencies,
    };
  }

  private parseParameter(raw: any): ApiParameter {
    return {
      name: raw.name,
      in: raw.in,
      required: raw.required || false,
      type: raw.schema?.type || raw.type || "string",
      description: raw.description || "",
      enum: raw.schema?.enum || raw.enum,
    };
  }

  private parseRequestBodyV3(
    raw: any,
    schemas: Record<string, SchemaDefinition>,
  ): ApiRequestBody {
    const contentType = Object.keys(raw.content || {})[0] || "application/json";
    const mediaType = raw.content?.[contentType] || {};
    const schema = this.resolveSchema(mediaType.schema, schemas);

    return {
      required: raw.required || false,
      contentType,
      schema,
      requiredFields: schema.required || [],
      optionalFields: Object.keys(schema.properties).filter(
        (k) => !schema.required.includes(k),
      ),
    };
  }

  private parseRequestBodyV2(
    bodyParam: any,
    schemas: Record<string, SchemaDefinition>,
  ): ApiRequestBody {
    const schema = this.resolveSchema(bodyParam, schemas);

    return {
      required: true,
      contentType: "application/json",
      schema,
      requiredFields: schema.required || [],
      optionalFields: Object.keys(schema.properties).filter(
        (k) => !schema.required.includes(k),
      ),
    };
  }

  private parseResponse(
    statusCode: string,
    raw: any,
    schemas: Record<string, SchemaDefinition>,
    isV3: boolean,
  ): ApiResponse {
    let schema: SchemaDefinition | null = null;
    let outputFields: string[] = [];

    if (isV3 && raw.content) {
      const contentType = Object.keys(raw.content)[0];
      if (contentType && raw.content[contentType].schema) {
        schema = this.resolveSchema(raw.content[contentType].schema, schemas);
        outputFields = Object.keys(schema.properties);
      }
    } else if (!isV3 && raw.schema) {
      schema = this.resolveSchema(raw.schema, schemas);
      outputFields = Object.keys(schema.properties);
    }

    return {
      statusCode,
      description: raw.description || "",
      schema,
      outputFields,
    };
  }

  // ============================================================================
  // Schema Resolution Helpers
  // ============================================================================

  private resolveSchema(
    raw: any,
    schemas: Record<string, SchemaDefinition>,
  ): SchemaDefinition {
    if (!raw) {
      return { name: "empty", type: "object", properties: {}, required: [], enums: {} };
    }

    // Handle $ref
    if (raw.$ref) {
      const refName = this.resolveRefName(raw.$ref);
      return schemas[refName] || { name: refName, type: "object", properties: {}, required: [], enums: {} };
    }

    // Handle inline schema
    return this.parseSchemaDefinition("inline", raw);
  }

  private resolveRefName(ref: string): string {
    // #/components/schemas/Foo → Foo
    // #/definitions/Foo → Foo
    return ref.split("/").pop() || ref;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private inferCenterName(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.includes("policy") || lower.includes("pc-")) return "PolicyCenter";
    if (lower.includes("billing") || lower.includes("bc-")) return "BillingCenter";
    if (lower.includes("claim") || lower.includes("cc-")) return "ClaimCenter";
    if (lower.includes("contact") || lower.includes("ab-")) return "ContactManager";
    if (lower.includes("producer") || lower.includes("pe-")) return "ProducerEngage";
    if (lower.includes("admin")) return "Admin";
    return path.basename(filename, path.extname(filename));
  }

  private buildScanResult(): ScanResult {
    return {
      specs: this.specs,
      totalEndpoints: this.specs.reduce((sum, s) => sum + s.endpoints.length, 0),
      totalSchemas: this.specs.reduce((sum, s) => sum + Object.keys(s.schemas).length, 0),
      centers: this.specs.map((s) => s.title),
      scanTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Get all parsed specs
   */
  getSpecs(): ApiSpec[] {
    return this.specs;
  }

  /**
   * Get a specific spec by center name
   */
  getSpec(centerName: string): ApiSpec | undefined {
    return this.specs.find(
      (s) => s.title.toLowerCase().includes(centerName.toLowerCase()),
    );
  }

  /**
   * Find endpoints matching a keyword (e.g., "submission", "cancel", "bind")
   */
  findEndpoints(keyword: string): ApiEndpoint[] {
    const lower = keyword.toLowerCase();
    return this.specs.flatMap((s) =>
      s.endpoints.filter(
        (e) =>
          e.path.toLowerCase().includes(lower) ||
          e.summary.toLowerCase().includes(lower) ||
          e.operationId.toLowerCase().includes(lower) ||
          e.tags.some((t) => t.toLowerCase().includes(lower)),
      ),
    );
  }

  /**
   * Get all enum values for a specific field across all schemas
   */
  findEnumValues(fieldName: string): string[] {
    const values: Set<string> = new Set();

    for (const spec of this.specs) {
      for (const schema of Object.values(spec.schemas)) {
        if (schema.enums[fieldName]) {
          schema.enums[fieldName].forEach((v) => values.add(v));
        }
      }
    }

    return [...values];
  }

  /**
   * Export scan results to JSON for caching
   */
  exportToJson(outputPath: string): void {
    const result = this.buildScanResult();
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`💾 Scan results exported to: ${outputPath}`);
  }
}
