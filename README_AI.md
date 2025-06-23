# AI Validation & RAG Testing

This project validates LLM behavior including:
- Retrieval quality (Weaviate)
- Summary accuracy and hallucination detection
- End-to-end AI testing with observability

## Setup

Ensure the following `.env` variable is set:
```env
OPENAI_API_KEY=sk-...
```

## Features

- Validate RAG summaries
- Assert top-K retrievals are relevant
- Ground responses in document knowledge

## Tools

- Weaviate (vector store)
- GPT-4 or Claude for grounding
- Traced with OpenTelemetry
