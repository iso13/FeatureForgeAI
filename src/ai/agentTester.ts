import { clear } from 'console';

type AgentContext = {
  investorRecordsAvailable?: boolean;
  fundDocumentsAvailable?: boolean;
  emailServiceAvailable?: boolean;
  previouslyFailedDueToMissingData?: boolean;
};

type AgentStep = {
  tool: string;
  input: string;
  output: string;
  timestamp: string;
};

type AgentLog = {
  type: 'info' | 'error';
  message: string;
  timestamp: string;
};

export class CapitalCallAgent {
  private steps: AgentStep[] = [];
  private logs: AgentLog[] = [];
  private context: AgentContext = {};
  private status: 'idle' | 'halted' | 'completed' = 'idle';

  setContext(context: AgentContext) {
    this.context = { ...this.context, ...context };
  }

  getSteps(): AgentStep[] {
    return this.steps;
  }

  getLogs(): AgentLog[] {
    return this.logs;
  }

  getStatus(): string {
    return this.status;
  }

  private logStep(tool: string, input: string, output: string) {
    const step: AgentStep = {
      tool,
      input,
      output,
      timestamp: new Date().toISOString()
    };
    this.steps.push(step);
  }

  private log(type: 'info' | 'error', message: string) {
    const entry: AgentLog = {
      type,
      message,
      timestamp: new Date().toISOString()
    };
    this.logs.push(entry);
    console.log(`[AgentLog] ${type.toUpperCase()}: ${message}`);
  }

  async runInvestorNotificationWorkflow(fundId: string): Promise<AgentStep[]> {
    this.steps = [];
    this.logs = [];
    this.status = 'idle';

    // Step 1: Check data availability
    if (!this.context.investorRecordsAvailable || !this.context.fundDocumentsAvailable) {
      this.log('error', 'Missing investor records or fund documents');
      this.log('info', 'Administrator notified');
      this.status = 'halted';
      return this.steps;
    }

    // Step 2: Generate summary
    this.logStep('LLM', `Generate summary for fund ${fundId}`, 'Summary generated');

    // Step 3: Validate compliance
    this.logStep('ComplianceChecker', 'Validate generated summary', 'Compliant');

    // Step 4: Send notifications
    if (this.context.emailServiceAvailable === false) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        this.log('info', `Retrying email delivery (attempt ${attempt})`);
        this.logStep('EmailService', 'Send email with backoff', `retry ${attempt}`);
      }
    } else {
      this.logStep('EmailService', 'Send email', 'Email sent');
    }

    this.status = 'completed';
    return this.steps;
  }

  async runPartialWorkflow(task: 'generate-summary' | 'send-notifications') {
    this.steps = [];
    this.status = 'idle';

    if (task === 'generate-summary') {
      if (!this.context.investorRecordsAvailable) {
        this.log('error', 'Missing investor records');
        this.log('info', 'Administrator notified');
        this.status = 'halted';
        return this.steps;
      }
      this.logStep('LLM', 'Generate summary', 'Summary generated');
    }

    if (task === 'send-notifications') {
      if (this.context.emailServiceAvailable === false) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          this.log('info', `Retrying email delivery (attempt ${attempt})`);
          this.logStep('EmailService', 'Send email with backoff', `retry ${attempt}`);
        }
      } else {
        this.logStep('EmailService', 'Send email', 'Email sent');
      }
    }

    this.status = 'completed';
    return this.steps;
  }

  async resumeWorkflow(): Promise<AgentStep[]> {
    this.logs.push({
      type: 'info',
      message: 'Resuming workflow after missing data resolved',
      timestamp: new Date().toISOString()
    });

    return await this.runInvestorNotificationWorkflow('fund-001');
  }
}