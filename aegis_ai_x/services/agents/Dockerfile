FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir -e "."

COPY libs/ libs/
COPY database/ database/
COPY services/agents/ services/agents/

EXPOSE 8002

CMD ["uvicorn", "services.agents.main:app", "--host", "0.0.0.0", "--port", "8002"]
