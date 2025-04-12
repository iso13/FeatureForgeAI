import { Given, Then } from '@cucumber/cucumber';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

let testResult: string;

interface TestContext {
  endpoint?: string;
  method?: string;
}

Given(
  /^I initiate a load test on the "([^"]+)" endpoint using the "(GET|POST|PUT|DELETE)" method$/,
  function (this: TestContext, endpoint: string, method: string) {
    console.log(`Load test setup for endpoint: ${endpoint} using method: ${method}`);
    this.endpoint = endpoint;
    this.method = method;
  }
);

Given(
  /^the test is configured to run with (\d+) virtual users for (\d+) seconds$/,
  async function (this: TestContext, vus: number, duration: number) {
    const jsonReportPath = 'reports/performance/loadTest.json';

    if (!fs.existsSync('reports/performance')) {
      fs.mkdirSync('reports/performance', { recursive: true });
    }

    const loadTestPath = path.resolve(
      __dirname,
      '../../support/performance/loadTest.js'
    );

    if (!this.endpoint || !this.method) {
      throw new Error('Endpoint or HTTP method is not defined in the context.');
    }

    const command = `k6 run ${loadTestPath}`;

    console.log(`Running load test on endpoint: ${this.endpoint}`);
    console.log(`Command: ${command}`);
    console.log(`Environment variables - VUS: ${vus}, DURATION: ${duration}s`);

    try {
      execSync(command, {
        env: {
          ...process.env,
          VUS: vus.toString(),
          DURATION: `${duration}s`,
          ENDPOINT: this.endpoint,
          METHOD: this.method,
        },
        stdio: 'inherit',
      });
    } catch (error) {
      const err = error as Error;
      console.error(`k6 test execution failed with error message: ${err.message}`);
      console.error(`Stack trace: ${err.stack}`);
      throw new Error('k6 test failed with an error. Check the logs for more details.');
    }

    if (fs.existsSync(jsonReportPath)) {
      console.log('Load test JSON report found, reading results.');
      testResult = fs.readFileSync(jsonReportPath, 'utf8');
    } else {
      console.error('Load test JSON report was not found.');
      throw new Error('Load test JSON report was not found.');
    }
  }
);

Then('the test should complete without errors', function (): void {
  const resultData = JSON.parse(testResult);
  const checks = resultData.metrics.checks;

  if (checks && checks.values.rate < 1) {
    throw new Error(
      `Test did not complete successfully. Success rate was ${checks.values.rate * 100}%.`
    );
  } else {
    console.log('All checks passed successfully with a 100% success rate.');
  }
});

Then(
  /^the average response time should be less than (\d+)ms$/,
  function (responseTimeThreshold: number): void {
    const resultData = JSON.parse(testResult);
    const httpReqDuration = resultData.metrics['http_req_duration'];

    if (httpReqDuration) {
      const avgResponseTime = httpReqDuration.values.avg;
      if (avgResponseTime >= responseTimeThreshold) {
        throw new Error(
          `Average response time ${avgResponseTime}ms exceeds threshold of ${responseTimeThreshold}ms.`
        );
      }
    } else {
      console.error('Average response time data not found in k6 results.');
      throw new Error('Average response time not found in k6 results.');
    }
  }
);

Then(
  /^the success rate should be (\d+)%$/,
  function (successRate: number): void {
    const resultData = JSON.parse(testResult);
    const checks = resultData.metrics.checks;

    if (checks && checks.values.rate * 100 < successRate) {
      throw new Error(
        `Success rate ${checks.values.rate * 100}% is below expected ${successRate}%.`
      );
    } else {
      console.log(
        `Success rate is ${checks.values.rate * 100}% and meets the expected ${successRate}%.`
      );
    }
  }
);