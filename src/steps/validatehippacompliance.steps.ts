import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';

Given('the user is logged in as a QA Auditor', async function (this: CustomWorld) {
  try {
    await this.page.goto('https://app.example.com/login');
    await this.page.fill('[data-testid="username-input"]', 'qa_auditor');
    await this.page.fill('[data-testid="password-input"]', 'password');
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForLoadState('networkidle');
  } catch (error) {
    throw new Error(`Failed to log in as QA Auditor: ${error}`);
  }
});

Given('the user is on the HIPAA compliance audit page', async function (this: CustomWorld) {
  try {
    await this.page.goto('https://app.example.com/hipaa-compliance');
    await this.page.waitForLoadState('networkidle');
  } catch (error) {
    throw new Error(`Failed to navigate to HIPAA compliance audit page: ${error}`);
  }
});

When('the user checks the encryption status of PHI', async function (this: CustomWorld) {
  try {
    await this.page.click('[data-testid="encryption-check-button"]');
  } catch (error) {
    throw new Error(`Failed to check encryption status of PHI: ${error}`);
  }
});

Then('the system should show that all PHI is encrypted', async function (this: CustomWorld) {
  try {
    const encryptionStatus = await this.page.textContent('[data-testid="encryption-status"]');
    expect(encryptionStatus).toBe('All PHI is encrypted');
  } catch (error) {
    throw new Error(`Failed to validate encryption status of PHI: ${error}`);
  }
});

When('the user checks the access control settings for PHI', async function (this: CustomWorld) {
  try {
    await this.page.click('[data-testid="access-control-check-button"]');
  } catch (error) {
    throw new Error(`Failed to check access control settings for PHI: ${error}`);
  }
});

Then('the system should show that only authorized personnel have access to PHI', async function (this: CustomWorld) {
  try {
    const accessControlStatus = await this.page.textContent('[data-testid="access-control-status"]');
    expect(accessControlStatus).toBe('Only authorized personnel have access to PHI');
  } catch (error) {
    throw new Error(`Failed to validate access control to PHI: ${error}`);
  }
});

When('the user checks the audit logs for PHI access', async function (this: CustomWorld) {
  try {
    await this.page.click('[data-testid="audit-logs-check-button"]');
  } catch (error) {
    throw new Error(`Failed to check audit logs for PHI access: ${error}`);
  }
});

Then('the system should show all access logs with date, time, and user details', async function (this: CustomWorld) {
  try {
    const logsExist = await this.page.isVisible('[data-testid="access-log"]');
    expect(logsExist).toBe(true);
  } catch (error) {
    throw new Error(`Failed to validate audit logs for PHI access: ${error}`);
  }
});

When('the user checks the emergency access procedure', async function (this: CustomWorld) {
  try {
    await this.page.click('[data-testid="emergency-access-check-button"]');
  } catch (error) {
    throw new Error(`Failed to check emergency access procedure: ${error}`);
  }
});

Then('the system should show a compliant emergency access procedure is in place', async function (this: CustomWorld) {
  try {
    const procedureStatus = await this.page.textContent('[data-testid="emergency-access-status"]');
    expect(procedureStatus).toBe('A compliant emergency access procedure is in place');
  } catch (error) {
    throw new Error(`Failed to validate emergency access procedure: ${error}`);
  }
});

When('the user checks the data backup and storage settings', async function (this: CustomWorld) {
  try {
    await this.page.click('[data-testid="data-backup-check-button"]');
  } catch (error) {
    throw new Error(`Failed to check data backup and storage settings: ${error}`);
  }
});

Then('the system should show that all PHI data is backed up and stored securely', async function (this: CustomWorld) {
  try {
    const backupStatus = await this.page.textContent('[data-testid="data-backup-status"]');
    expect(backupStatus).toBe('All PHI data is backed up and stored securely');
  } catch (error) {
    throw new Error(`Failed to validate data backup and storage: ${error}`);
  }
});