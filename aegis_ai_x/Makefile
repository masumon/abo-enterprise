.PHONY: help dev up down build test lint migrate clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Development ─────────────────────────────
dev: ## Start all services in development mode
	docker compose up --build -d
	@echo "SUMONIX AI is running at http://localhost:8000"
	@echo "Dashboard at http://localhost:3000"
	@echo "Grafana at http://localhost:3001"

up: ## Start services (no rebuild)
	docker compose up -d

down: ## Stop all services
	docker compose down

build: ## Build all service images
	docker compose build

logs: ## Tail logs for all services
	docker compose logs -f

logs-%: ## Tail logs for a specific service (e.g. make logs-api-gateway)
	docker compose logs -f $*

restart-%: ## Restart a specific service
	docker compose restart $*

# ─── Testing ─────────────────────────────────
test: ## Run all tests
	python -m pytest tests/ -v --cov=sumonix_ai_x --cov-report=term-missing

test-unit: ## Run unit tests
	python -m pytest tests/unit/ -v

test-integration: ## Run integration tests
	python -m pytest tests/integration/ -v

test-e2e: ## Run end-to-end tests
	python -m pytest tests/e2e/ -v

# ─── Code Quality ────────────────────────────
lint: ## Run linter
	ruff check sumonix_ai_x/ tests/

format: ## Format code
	ruff format sumonix_ai_x/ tests/

typecheck: ## Run type checker
	mypy sumonix_ai_x/

# ─── Database ────────────────────────────────
migrate: ## Run database migrations
	alembic upgrade head

migrate-create: ## Create a new migration (usage: make migrate-create MSG="add users table")
	alembic revision --autogenerate -m "$(MSG)"

migrate-down: ## Rollback last migration
	alembic downgrade -1

# ─── Infrastructure ──────────────────────────
infra-dev: ## Deploy development infrastructure
	docker compose -f infrastructure/docker-compose/development.yml up -d

infra-staging: ## Deploy staging infrastructure
	docker compose -f infrastructure/docker-compose/staging.yml up -d

# ─── Cleanup ─────────────────────────────────
clean: ## Remove all containers, volumes, and build artifacts
	docker compose down -v --remove-orphans
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf .coverage htmlcov/ dist/ build/ *.egg-info/

# ─── Setup ───────────────────────────────────
setup: ## Initial project setup
	cp -n .env.example .env 2>/dev/null || true
	pip install -e ".[dev]"
	pre-commit install
	@echo "Setup complete. Edit .env with your configuration."
