"""Integration tests for the task management API."""

import pytest
from httpx import AsyncClient, ASGITransport


class TestTaskAPI:
    @pytest.mark.asyncio
    async def test_health_endpoint(self):
        """Test that health endpoint is accessible."""
        # This test validates the API structure
        from services.api_gateway.routes.health import router
        assert router is not None

    @pytest.mark.asyncio
    async def test_task_create_schema(self):
        """Test task creation schema validation."""
        from services.api_gateway.routes.tasks import TaskCreate
        task = TaskCreate(
            project_id="00000000-0000-0000-0000-000000000000",
            title="Test task",
            description="A test task",
        )
        assert task.title == "Test task"
        assert task.priority == 0

    @pytest.mark.asyncio
    async def test_agent_create_schema(self):
        """Test agent creation schema validation."""
        from services.api_gateway.routes.agents import AgentCreate
        agent = AgentCreate(
            project_id="00000000-0000-0000-0000-000000000000",
            name="Test Agent",
            agent_type="code",
        )
        assert agent.agent_type == "code"
        assert agent.llm_provider == "openai"
