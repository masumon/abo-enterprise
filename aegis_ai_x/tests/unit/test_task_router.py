"""Unit tests for the task router."""

from services.supervisor.router import TaskRouter


class TestTaskRouter:
    def setup_method(self):
        self.router = TaskRouter()

    def test_routes_code_task_to_code_agent(self):
        result = self.router.route_task(
            "Implement user authentication",
            "Build a login system with JWT tokens",
        )
        assert result == "code"

    def test_routes_planning_task_to_planner(self):
        result = self.router.route_task(
            "Design system architecture",
            "Plan the microservices architecture for the new platform",
        )
        assert result == "planner"

    def test_routes_deployment_to_automation(self):
        result = self.router.route_task(
            "Deploy to production",
            "Create CI/CD pipeline and deploy the application",
        )
        assert result == "automation"

    def test_routes_debugging_to_code(self):
        result = self.router.route_task(
            "Fix login bug",
            "Debug the authentication error in the login endpoint",
        )
        assert result == "code"

    def test_route_from_plan(self):
        plan = {
            "steps": [
                {"agent_type": "planner", "action": "Design API", "requires_approval": False, "execution_env": "local"},
                {"agent_type": "code", "action": "Implement API", "requires_approval": False, "execution_env": "sandbox"},
                {"agent_type": "automation", "action": "Deploy", "requires_approval": True, "execution_env": "kubernetes"},
            ]
        }
        routed = self.router.route_from_plan(plan)
        assert len(routed) == 3
        assert routed[0]["agent_type"] == "planner"
        assert routed[1]["agent_type"] == "code"
        assert routed[2]["agent_type"] == "automation"
        assert routed[2]["requires_approval"] is True
