# Aegis AI X

**Enterprise AI Agent Orchestration Platform**

Aegis AI X is a full-stack platform for deploying, managing, and governing AI agents that can plan, code, and automate tasks across your organization.

## Architecture

```
aegis_ai_x/
├── services/          # Microservices
│   ├── api-gateway/   # REST API entry point
│   ├── supervisor/    # Task analysis & orchestration
│   ├── agents/        # AI agents (planner, code, automation)
│   ├── execution/     # Sandboxed code execution
│   ├── approval/      # Human-in-the-loop workflows
│   ├── auth/          # JWT + OAuth2 authentication
│   └── analytics/     # Metrics & reporting
├── libs/              # Shared libraries
│   ├── llm/           # Multi-provider LLM router
│   ├── vector_db/     # Qdrant + RAG retrieval
│   ├── security/      # Code scanning & compliance
│   └── monitoring/    # Prometheus, tracing, logging
├── database/          # PostgreSQL + MongoDB models
├── infrastructure/    # K8s, Terraform, Docker Compose
├── frontend/          # React dashboard
├── tests/             # Unit, integration, e2e tests
└── .github/workflows/ # CI/CD pipelines
```

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env    # Edit with your API keys

# 2. Start everything
make dev

# 3. Access the platform
# API:       http://localhost:8000
# Dashboard: http://localhost:3000
# Grafana:   http://localhost:3001
```

## Key Features

- **Multi-LLM Support** - OpenAI, Anthropic Claude, Google Gemini, Ollama (local)
- **Intelligent Task Routing** - Supervisor analyzes tasks and routes to specialized agents
- **Sandboxed Execution** - Code runs in isolated Docker containers
- **Human-in-the-Loop** - Approval workflows for high-risk operations
- **Enterprise Security** - Code scanning, secrets management, compliance checking
- **Full Observability** - Prometheus metrics, distributed tracing, structured logging
- **Multi-Cloud** - Terraform configs for AWS, GCP, and Azure

## Tech Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Backend        | Python 3.11, FastAPI, SQLAlchemy        |
| Frontend       | React 18, TypeScript, Tailwind CSS      |
| Databases      | PostgreSQL 16, MongoDB 7, Redis 7       |
| Vector DB      | Qdrant                                  |
| Infrastructure | Docker, Kubernetes, Terraform           |
| CI/CD          | GitHub Actions                          |
| Monitoring     | Prometheus, Grafana, OpenTelemetry      |

## Commands

```bash
make help           # Show all commands
make dev            # Start development environment
make test           # Run all tests
make lint           # Run linter
make migrate        # Run database migrations
make clean          # Stop and remove everything
```

## License

Proprietary - All rights reserved.
