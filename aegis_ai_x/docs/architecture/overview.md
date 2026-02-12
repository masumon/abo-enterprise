# Aegis AI X - Architecture Overview

## System Architecture

Aegis AI X is an enterprise-grade AI agent orchestration platform built on a
microservices architecture. It enables organizations to deploy, manage, and
govern AI agents that can plan, code, and automate tasks.

## Core Components

### 1. API Gateway (`services/api-gateway/`)
- Entry point for all client requests
- JWT authentication and authorization
- Rate limiting and request throttling
- Request routing to internal services
- Prometheus metrics endpoint

### 2. Supervisor (`services/supervisor/`)
- Central intelligence of the platform
- Analyzes incoming tasks using LLM
- Creates execution plans with risk assessment
- Routes tasks to appropriate agents
- Manages task lifecycle through the Orchestrator

### 3. Agent System (`services/agents/`)
- **Planner Agent**: Architecture design, task decomposition
- **Code Agent**: Code generation, review, debugging
- **Automation Agent**: CI/CD, infrastructure, DevOps tasks
- All agents extend `BaseAgent` with common tooling

### 4. Execution Service (`services/execution/`)
- **Sandbox Executor**: Runs code in isolated Docker containers
- **Kubernetes Executor**: Runs production workloads as K8s jobs
- Resource limits and timeout enforcement

### 5. Approval Service (`services/approval/`)
- Workflow engine for human-in-the-loop governance
- Policy-based approval requirements
- Role-based reviewer authorization
- Time-based expiry for approval requests

### 6. Auth Service (`services/auth/`)
- JWT token management (access + refresh)
- OAuth2 integration (GitHub, Google)
- Role-based access control (RBAC)

### 7. Analytics Service (`services/analytics/`)
- Dashboard metrics aggregation
- Agent performance tracking
- Cost tracking and usage analytics
- Report generation (JSON, CSV)

## Shared Libraries (`libs/`)

### LLM Router (`libs/llm/`)
- Multi-provider support: OpenAI, Anthropic, Gemini, Ollama
- Automatic failover between providers
- Response caching (in-memory + Redis)
- Parallel provider querying

### Vector DB (`libs/vector_db/`)
- Qdrant integration for vector search
- Embedding generation (OpenAI)
- RAG (Retrieval Augmented Generation) retriever

### Security (`libs/security/`)
- Code security scanner (hardcoded secrets, SQL injection, etc.)
- Secrets management (env vars, HashiCorp Vault)
- Compliance checking (SOC2, GDPR, HIPAA)

### Monitoring (`libs/monitoring/`)
- Prometheus metrics collection
- OpenTelemetry distributed tracing
- Structured logging (structlog + JSON)

## Data Flow

```
Client → API Gateway → Supervisor → Agent(s) → Execution
                                        ↓
                                  Approval Service
                                        ↓
                                  Result → Client
```

## Data Stores

- **PostgreSQL**: Users, projects, agents, tasks, approvals, audit logs
- **MongoDB**: Execution logs, agent conversations, code artifacts, events
- **Redis**: Caching, rate limiting, session data
- **Qdrant**: Vector embeddings for RAG

## Deployment

- Docker Compose for local development
- Kubernetes for staging/production
- Terraform for cloud infrastructure (AWS/GCP/Azure)
- GitHub Actions for CI/CD pipelines
