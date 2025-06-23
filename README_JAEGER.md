# 🔍 Distributed Tracing with Jaeger in Cucumber-Automation

This project integrates **OpenTelemetry** with **Jaeger** to trace test execution, capture span-level diagnostics, and monitor AI workflows in real time.

## 🚀 Overview

We use Jaeger as the tracing backend for all Cucumber-based test runs. OpenTelemetry spans are automatically created around test hooks, AI logic (e.g. Weaviate queries), and external API calls. Traces help identify bottlenecks, visualize data flow, and troubleshoot failed or flaky steps.

## 📦 Architecture

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│ Cucumber     │ --> │ Otel SDK    │ --> │ Otel Collector│
│ Test Runner  │     │ + Instrument│     │              │
└──────────────┘     └─────┬───────┘     └──────┬───────┘
                           │                    │
                           ▼                    ▼
                     Jaeger Exporter       Prometheus Exporter
                           │                    │
                           ▼                    ▼
                    Jaeger UI (http://localhost:16686)
```

## 🛠️ Setup Instructions

### 1. Start All Services

Use the Docker Compose stack provided:

```bash
npm run perf:full
# or
docker compose up --build
```

This launches:

- 🧠 `jaeger` for trace visualization (http://localhost:16686)
- 📡 `otel-collector` to receive spans from test code
- 📈 `prometheus` for metrics (http://localhost:9090)
- 📊 `grafana` dashboards (http://localhost:3000)
- 🧬 `weaviate` with OpenAI vectorization

---

### 2. Run a Traced Test

To run a test and emit spans:

```bash
ENABLE_TRACING=true npm run cucumber -- --tags '@performanceTest'
```

The trace data will be sent to the collector and viewable in Jaeger.

---

### 3. Explore Jaeger UI

- Open http://localhost:16686
- Select **`cucumber-playwright`** from the service dropdown
- Click “Find Traces”
- Inspect each span for:
  - Time taken
  - Errors
  - Parent-child flow across utilities (e.g., `weaviateClient.ts`, `traceHelper.ts`, `playwrightWorld`)

---

## ⚙️ Environment Variables

- `ENABLE_TRACING=true`: Enables OpenTelemetry hooks in `hooks.ts`
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:24318`: Sends spans via OTLP HTTP
- `OTEL_SERVICE_NAME=cucumber-playwright`: Service name shown in Jaeger
- `OPENAI_API_KEY=...`: Required for Weaviate’s OpenAI module

---

## 📂 Key Files

| File                              | Purpose                                              |
|-----------------------------------|------------------------------------------------------|
| `src/support/hooks.ts`           | Initializes OpenTelemetry spans around scenarios     |
| `src/utils/traceHelper.ts`       | Helper to create spans with context propagation     |
| `src/utils/weaviateClient.ts`    | Emits nested spans during document ingest and search|
| `otelcol-config.yaml`            | Defines pipelines for metrics, traces, and logs     |
| `docker-compose.yml`             | Brings up all tracing, logging, and AI infra        |

---

## 🧪 Trace Use Cases

- Visualize delays in AI vectorization
- Measure average duration of AI grounding
- Identify flaky scenarios that spike response time
- Troubleshoot performance test bottlenecks

---

## 📍 Troubleshooting

- ❗**Traces not showing in Jaeger?**
  - Ensure `ENABLE_TRACING=true`
  - Verify Otel Collector is reachable at `24318`
  - Confirm `OTEL_SERVICE_NAME` is set and consistent

- ❗**Spans are missing or incomplete?**
  - Ensure all async logic (e.g. `importDocuments`) is wrapped in `withSpan()`

---

## ✅ Example Trace

You should see span names like:

- `Scenario: Validate AI Summary`
- `createSchemaIfNeeded`
- `importDocuments`
- `querySimilarDocs`
- `k6 load test`
- `trace shutdown`

Each span includes tags for document count, query text, vectorization time, and more.

---

## 🙌 Credits

Built with:
- [OpenTelemetry JS SDK](https://opentelemetry.io/docs/)
- [Jaeger Tracing](https://www.jaegertracing.io/)
- [Cucumber + Playwright](https://github.com/cucumber/cucumber-js)
