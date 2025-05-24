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
  'I perform a load test on the {string} endpoint using the {string} method',
  function (this: TestContext, endpoint: string, method: string) {
    console.log(`Load test setup: ${method.toUpperCase()} ${endpoint}`);
    this.endpoint = endpoint;
    this.method = method;
  }
);

Given(
  'the test runs with {int} virtual users for a duration of {int} seconds',
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
      throw new Error('Endpoint or HTTP method is not defined.');
    }

    const command = `k6 run \
  --out experimental-prometheus-rw=http://localhost:9090/api/v1/write \
  --out json=reports/performance/loadTest.json \
  ${loadTestPath}`;

    console.log('Running k6 load test...');
    console.log(`Command: ${command}`);
    console.log(`Env - VUS: ${vus}, Duration: ${duration}s, Endpoint: ${this.endpoint}, Method: ${this.method}`);

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
      console.error('k6 execution failed:', (error as Error).message);
      throw new Error('k6 test run failed. Check logs above for details.');
    }

    if (fs.existsSync(jsonReportPath)) {
      console.log('Load test completed. Reading results...');
      testResult = fs.readFileSync(jsonReportPath, 'utf8');
    } else {
      throw new Error('Load test JSON report was not found.');
    }
  }
);

Then('the test should complete successfully', function (): void {
  const resultData = JSON.parse(testResult);
  const checks = resultData.metrics.checks;
  if (checks?.values.rate < 1) {
    throw new Error(`Test failed. Success rate was ${(checks.values.rate * 100).toFixed(2)}%.`);
  }
  console.log('All checks passed successfully with a 100% success rate.');
});

Then('the average response time should be below {int}ms', function (threshold: number): void {
  const resultData = JSON.parse(testResult);
  const avg = resultData.metrics['http_req_duration']?.values.avg;
  if (avg === undefined || avg >= threshold) {
    throw new Error(`Average response time ${avg}ms exceeds threshold ${threshold}ms.`);
  }
  console.log(`Avg response time: ${avg}ms (threshold: ${threshold}ms)`);
});

Then('the success rate should be {int}%', function (expectedRate: number): void {
  const resultData = JSON.parse(testResult);
  const rate = resultData.metrics.checks?.values.rate * 100;
  if (rate < expectedRate) {
    throw new Error(`Success rate ${rate}% is below expected ${expectedRate}%.`);
  }
  console.log(`Success rate is ${rate}% and meets the expected ${expectedRate}%.`);
});