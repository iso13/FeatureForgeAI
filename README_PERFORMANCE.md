# 📈 Performance Testing with k6 + Prometheus + Grafana

This project supports performance testing with real-time metrics tracking and visualization using:

- 🧪 **k6** for load testing
- 📥 **Prometheus** to collect metrics
- 📊 **Grafana** to visualize results

---

## 🛠️ Setup

Make sure Docker is running, then use the following command to start containers and run the test:

```bash
npm run docker:up
npm run perf:full
```

This will:
1. Restart all Docker containers (Grafana, Prometheus, Jaeger, etc.)
2. Wait for Prometheus to be ready
3. Run the Cucumber `@performanceTest` tagged feature using k6

---

## 🧪 How It Works

The following Cucumber scenario triggers a k6 test and exports metrics automatically:

```gherkin
@performanceTest @no-browser
Scenario: Perform load test on GET /posts endpoint
  Given I perform a load test on the "/posts" endpoint using the "GET" method
  And the test runs with 2 virtual users for a duration of 5 seconds
  Then the test should complete successfully
  And the average response time should be below 200ms
  And the success rate should be 100%
```

Metrics are exported to:
- 📄 `reports/performance/loadTest.json`
- 📡 Prometheus endpoint (`localhost:9090`)

---

## 📍 View Metrics in Grafana

Grafana is accessible at:

```
http://localhost:3000
```

Login:
- **Username**: `admin`
- **Password**: `admin`

Navigate to:
- `Dashboards > k6 Prometheus`

You’ll see:
- HTTP latency stats
- Success rates
- Request/response breakdowns
- Test durations

> ⚠️ No manual queries are required in Prometheus. Grafana dashboards are pre-configured.

---

## 🧪 Example k6 Output

```
Avg response time: 34.06ms (threshold: 200ms)
Success rate is 100% and meets the expected 100%.
```

---

TO DO: auto-open Grafana after the run or export results to CI dashboards.