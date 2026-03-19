// src/types/access-api.ts
/**
 * AccessAPI interface for physical access audit control
 * Used in HIPAA and compliance testing in FeatureForge AI
 */
export interface AccessAPI {
  simulateBadgeScan(input: {
    userId: string;
    location: string;
    success: boolean;
  }): Promise<void>;
  getAccessDecision(userId: string): Promise<{ granted: boolean }>;
  getAccessLog(userId: string): Promise<any>;
  checkAccessAnomalies(userId: string): Promise<{ status: string }>;
  getSecurityAlerts(): Promise<any[]>;
}
