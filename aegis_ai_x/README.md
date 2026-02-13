# Aegis AI X

**Enterprise AI Agent Orchestration Platform**

Aegis AI X is a full-stack platform for deploying, managing, and governing AI agents that can plan, code, and automate tasks across your organization.

## Architecture

```
aegis_ai_x/
├── services/          # Microservices
│   ├── api_gateway/   # REST API entry point
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

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** (for frontend)
- **Docker & Docker Compose**
- **Git**

## Quick Start

### Linux / macOS

```bash
# 1. Run the setup script
bash scripts/setup/init.sh

# 2. Activate virtual environment
source .venv/bin/activate

# 3. Start everything
make dev

# 4. Access the platform
# API:       http://localhost:8000
# Dashboard: http://localhost:3000
# Grafana:   http://localhost:3001
```

### Windows (PowerShell)

```powershell
# 1. Run the setup script
powershell -ExecutionPolicy Bypass -File scripts\setup\init.ps1

# 2. Activate virtual environment
.\.venv\Scripts\Activate.ps1

# 3. Start everything
docker compose up --build -d

# 4. Access the platform
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
- **Cross-Platform** - Runs on Windows 11 and Linux (Ubuntu)

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

### Linux / macOS (Makefile)

```bash
make help           # Show all commands
make dev            # Start development environment
make test           # Run all tests
make lint           # Run linter
make migrate        # Run database migrations
make clean          # Stop and remove everything
```

### Windows (PowerShell)

```powershell
# Setup
powershell -ExecutionPolicy Bypass -File scripts\setup\init.ps1

# Start services
docker compose up --build -d

# Run tests
python -m pytest tests/ -v

# Run linter
ruff check .

# Run migrations
alembic upgrade head

# Stop services
docker compose down
```

## Scripts

| Script | Linux | Windows |
|--------|-------|---------|
| Setup  | `scripts/setup/init.sh` | `scripts\setup\init.ps1` |
| Migrate | `scripts/migration/run_migrations.sh` | `scripts\migration\run_migrations.ps1` |
| Deploy | `scripts/deployment/deploy.sh` | `scripts\deployment\deploy.ps1` |

## License

Proprietary - All rights reserved.
