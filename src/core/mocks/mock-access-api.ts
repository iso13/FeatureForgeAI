// src/mocks/mock-access-api.ts
/**
 * Mock Access Control API for Physical Access Audit
 * Used by HIPAA and audit compliance features in FeatureForge AI
 */

import type { AccessAPI } from "../types/access-api";

export class MockAccessAPI implements AccessAPI {
  private accessLog: Record<string, any> = {};
  private anomalies: Record<string, number> = {};
  private alerts: any[] = [];
  private decisions: Record<string, boolean> = {};

  async simulateBadgeScan({
    userId,
    location,
    success,
  }: {
    userId: string;
    location: string;
    success: boolean;
  }): Promise<void> {
    if (!this.anomalies[userId]) this.anomalies[userId] = 0;

    if (success) {
      this.decisions[userId] = true;
      this.accessLog[userId] = {
        userId,
        timestamp: new Date().toISOString(),
        location,
      };
    } else {
      this.anomalies[userId] += 1;
      this.decisions[userId] = false;

      if (this.anomalies[userId] >= 3) {
        this.alerts.push({
          type: "unauthorized-access",
          userId,
          severity: "critical",
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  async getAccessDecision(userId: string): Promise<{ granted: boolean }> {
    return { granted: this.decisions[userId] ?? false };
  }

  async getAccessLog(userId: string): Promise<any> {
    return this.accessLog[userId];
  }

  async checkAccessAnomalies(userId: string): Promise<{ status: string }> {
    const flagged = this.anomalies[userId] >= 3;
    return { status: flagged ? "flagged" : "clear" };
  }

  async getSecurityAlerts(): Promise<any[]> {
    return this.alerts;
  }
}
