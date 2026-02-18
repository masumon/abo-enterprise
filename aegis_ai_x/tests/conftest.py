"""Pytest configuration and shared fixtures for SUMONIX AI tests."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, AsyncIterator
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from database.models.postgres_models import (
    Agent,
    Base,
    Project,
    ProjectMember,
    Task,
    TaskStatus,
    User,
    UserRole,
)
from libs.llm.providers.base import BaseLLMProvider, LLMResponse


# ---------------------------------------------------------------------------
# Database fixtures -- SQLite async in-memory for fast, isolated tests
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture()
async def db_engine():
    """Create a fresh async SQLite engine for each test."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture()
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional database session that rolls back after each test."""
    session_factory = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        yield session
        await session.rollback()


# ---------------------------------------------------------------------------
# Auth service test client
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture()
async def auth_app(db_session: AsyncSession):
    """Return the auth FastAPI app with the DB dependency overridden."""
    from database.session import get_db
    from services.auth.main import app

    async def _override_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_db
    yield app
    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def auth_client(auth_app) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client wired to the auth service."""
    transport = ASGITransport(app=auth_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


# ---------------------------------------------------------------------------
# API gateway test client
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture()
async def gateway_app(db_session: AsyncSession):
    """Return the API gateway FastAPI app with the DB dependency overridden."""
    from database.session import get_db
    from services.api_gateway.main import app

    async def _override_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_db
    yield app
    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def gateway_client(gateway_app) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client wired to the API gateway."""
    transport = ASGITransport(app=gateway_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


# ---------------------------------------------------------------------------
# Mock LLM provider / router
# ---------------------------------------------------------------------------


class MockLLMProvider(BaseLLMProvider):
    """A deterministic LLM provider that returns canned responses for tests."""

    def __init__(self, name: str = "mock", canned_response: str = "This is a mock LLM response."):
        self._name = name
        self._canned_response = canned_response

    @property
    def provider_name(self) -> str:
        return self._name

    async def generate(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs: Any,
    ) -> LLMResponse:
        return LLMResponse(
            content=self._canned_response,
            model="mock-model-v1",
            provider=self._name,
            usage={"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
            finish_reason="stop",
        )

    async def generate_stream(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        for word in self._canned_response.split():
            yield word + " "


class FailingLLMProvider(BaseLLMProvider):
    """An LLM provider that always raises an exception -- used to test fallback."""

    def __init__(self, name: str = "failing"):
        self._name = name

    @property
    def provider_name(self) -> str:
        return self._name

    async def generate(self, messages, **kwargs) -> LLMResponse:
        raise RuntimeError(f"Provider {self._name} is down")

    async def generate_stream(self, messages, **kwargs) -> AsyncIterator[str]:
        raise RuntimeError(f"Provider {self._name} is down")
        yield  # pragma: no cover


@pytest.fixture()
def mock_llm_provider() -> MockLLMProvider:
    """Return a mock LLM provider."""
    return MockLLMProvider()


@pytest.fixture()
def failing_llm_provider() -> FailingLLMProvider:
    """Return a provider that always fails."""
    return FailingLLMProvider()


# ---------------------------------------------------------------------------
# Sample domain objects
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture()
async def sample_user(db_session: AsyncSession) -> User:
    """Create and return a persisted sample user."""
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    user = User(
        id=uuid.uuid4(),
        email="testuser@sumonix.dev",
        username="testuser",
        hashed_password=pwd_context.hash("Str0ngP@ssw0rd!"),
        full_name="Test User",
        role=UserRole.DEVELOPER,
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture()
async def sample_project(db_session: AsyncSession, sample_user: User) -> Project:
    """Create and return a persisted sample project linked to the sample user."""
    project = Project(
        id=uuid.uuid4(),
        name="Test Project",
        slug="test-project",
        description="A project created for automated tests.",
        is_active=True,
    )
    db_session.add(project)
    await db_session.flush()

    member = ProjectMember(
        id=uuid.uuid4(),
        project_id=project.id,
        user_id=sample_user.id,
        role=UserRole.ADMIN,
    )
    db_session.add(member)
    await db_session.flush()
    return project


@pytest_asyncio.fixture()
async def sample_agent(db_session: AsyncSession, sample_project: Project) -> Agent:
    """Create and return a persisted sample agent."""
    agent = Agent(
        id=uuid.uuid4(),
        project_id=sample_project.id,
        name="Code Agent",
        agent_type="code",
        description="Test code agent",
        llm_provider="mock",
        llm_model="mock-model-v1",
        is_active=True,
    )
    db_session.add(agent)
    await db_session.flush()
    return agent


@pytest_asyncio.fixture()
async def sample_task(
    db_session: AsyncSession,
    sample_project: Project,
    sample_agent: Agent,
    sample_user: User,
) -> Task:
    """Create and return a persisted sample task."""
    task = Task(
        id=uuid.uuid4(),
        project_id=sample_project.id,
        agent_id=sample_agent.id,
        created_by=sample_user.id,
        title="Implement user authentication",
        description="Build JWT-based auth with refresh tokens",
        status=TaskStatus.PENDING,
        priority=1,
        input_data={"language": "python", "framework": "fastapi"},
        output_data={},
    )
    db_session.add(task)
    await db_session.flush()
    return task


# ---------------------------------------------------------------------------
# JWT helper for authenticated requests
# ---------------------------------------------------------------------------


@pytest.fixture()
def auth_token(sample_user: User) -> str:
    """Generate a valid JWT access token for the sample user."""
    from services.auth.jwt_handler import JWTHandler

    handler = JWTHandler()
    return handler.create_access_token(
        user_id=str(sample_user.id),
        email=sample_user.email,
        role=sample_user.role.value,
    )


@pytest.fixture()
def auth_headers(auth_token: str) -> dict[str, str]:
    """Return Authorization headers for the sample user."""
    return {"Authorization": f"Bearer {auth_token}"}
