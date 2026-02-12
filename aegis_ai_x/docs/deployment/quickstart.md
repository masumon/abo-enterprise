# Aegis AI X - Quick Start Guide

## Prerequisites

- Docker and Docker Compose
- Python 3.11+
- Node.js 20+ (for frontend)
- Git

## Local Development Setup

### 1. Clone and Configure

```bash
cd aegis_ai_x
cp .env.example .env
# Edit .env with your API keys and configuration
```

### 2. Start Infrastructure

```bash
make dev
```

This starts all services including PostgreSQL, MongoDB, Redis, Qdrant,
Prometheus, and Grafana.

### 3. Run Migrations

```bash
make migrate
```

### 4. Access the Platform

- **API Gateway**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Dashboard**: http://localhost:3000
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

## First Steps

### Register a User

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "username": "admin",
    "password": "secure-password",
    "full_name": "Admin User"
  }'
```

### Login

```bash
curl -X POST http://localhost:8000/auth/login \
  -d "username=admin@example.com&password=secure-password"
```

### Create a Project

```bash
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My AI Project",
    "slug": "my-ai-project",
    "description": "First project on Aegis AI X"
  }'
```

### Submit a Task

```bash
curl -X POST http://localhost:8000/api/v1/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "<project-id>",
    "title": "Create a REST API for user management",
    "description": "Build a FastAPI application with CRUD endpoints for users",
    "input_data": {
      "language": "python",
      "framework": "fastapi"
    }
  }'
```

## Useful Commands

```bash
make help          # Show all available commands
make dev           # Start development environment
make down          # Stop all services
make test          # Run all tests
make lint          # Run linter
make logs          # Tail all logs
make logs-agents   # Tail agent service logs
make clean         # Remove all containers and volumes
```
