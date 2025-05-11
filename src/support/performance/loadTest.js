import http from "k6/http";
import { check, sleep } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

// 🌍 Environment-configurable parameters
const vus = parseInt(__ENV.VUS || "1");
const duration = __ENV.DURATION || "5s";
const endpoint = __ENV.ENDPOINT || "/posts";
const method = (__ENV.METHOD || "GET").toUpperCase();
const reportPath = __ENV.REPORT_PATH || "reports/performance/";

// 🛠️ k6 options
export const options = {
  vus,
  duration,
  thresholds: {
    http_req_duration: ["avg<200", "p(95)<300"], // latency thresholds
    checks: ["rate>0.99"], // success rate threshold
  },
};

// 🧪 Load test logic
export default function () {
  const url = `https://jsonplaceholder.typicode.com${endpoint}`;
  let res;

  if (method === "GET") {
    res = http.get(url);
  } else {
    console.error(`❌ Unsupported HTTP method: ${method}`);
    return;
  }

  check(res, {
    "✅ status is 200": (r) => r.status === 200,
    "⏱️ response time < 1000ms": (r) => r.timings.duration < 1000,
  });

  sleep(1);
}

// 📊 Handle summary output (JSON + HTML)
export function handleSummary(data) {
  return {
    [`${reportPath}loadTest.json`]: JSON.stringify(data, null, 2),
    [`${reportPath}loadTest.html`]: htmlReport(data),
  };
}