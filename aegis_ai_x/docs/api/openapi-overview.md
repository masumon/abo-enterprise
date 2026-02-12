# Aegis AI X - API Reference

## Base URL

```
Development: http://localhost:8000
Production:  https://api.aegis-ai.example.com
```

## Authentication

All API requests (except `/auth/*`) require a Bearer token:

```
Authorization: Bearer <access_token>
```

## Endpoints

### Auth Service

| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| POST   | `/auth/register`      | Register new user        |
| POST   | `/auth/login`         | Login (returns JWT)      |
| POST   | `/auth/refresh`       | Refresh access token     |
| GET    | `/auth/me`            | Get current user profile |

### Projects

| Method | Endpoint                    | Description          |
|--------|-----------------------------|----------------------|
| POST   | `/api/v1/projects`          | Create project       |
| GET    | `/api/v1/projects`          | List projects        |
| GET    | `/api/v1/projects/{id}`     | Get project          |
| DELETE | `/api/v1/projects/{id}`     | Delete project       |

### Tasks

| Method | Endpoint                       | Description          |
|--------|--------------------------------|----------------------|
| POST   | `/api/v1/tasks`                | Create task          |
| GET    | `/api/v1/tasks`                | List tasks           |
| GET    | `/api/v1/tasks/{id}`           | Get task             |
| POST   | `/api/v1/tasks/{id}/cancel`    | Cancel task          |

### Agents

| Method | Endpoint                    | Description          |
|--------|-----------------------------|----------------------|
| POST   | `/api/v1/agents`            | Create agent         |
| GET    | `/api/v1/agents`            | List agents          |
| GET    | `/api/v1/agents/{id}`       | Get agent            |
| DELETE | `/api/v1/agents/{id}`       | Delete agent         |

### Supervisor

| Method | Endpoint                    | Description          |
|--------|-----------------------------|----------------------|
| POST   | `/supervisor/analyze`       | Analyze task         |
| POST   | `/supervisor/submit`        | Submit for execution |
| POST   | `/supervisor/approve`       | Approve/reject task  |

### Execution

| Method | Endpoint                          | Description          |
|--------|-----------------------------------|----------------------|
| POST   | `/execution/sandbox/run`          | Run sandboxed code   |
| POST   | `/execution/k8s/create`           | Create K8s job       |
| GET    | `/execution/k8s/status/{name}`    | Get job status       |
| DELETE | `/execution/k8s/{name}`           | Delete job           |

### Analytics

| Method | Endpoint                    | Description          |
|--------|-----------------------------|----------------------|
| GET    | `/analytics/dashboard`      | Dashboard metrics    |
| GET    | `/analytics/agents`         | Agent performance    |
| GET    | `/analytics/usage`          | Daily usage stats    |
| GET    | `/analytics/report`         | Generate report      |

### Health

| Method | Endpoint    | Description              |
|--------|-------------|--------------------------|
| GET    | `/health`   | Health check             |
| GET    | `/metrics`  | Prometheus metrics       |
