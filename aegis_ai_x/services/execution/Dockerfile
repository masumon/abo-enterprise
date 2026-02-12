FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir -e "."

COPY libs/ libs/
COPY database/ database/
COPY services/execution/ services/execution/

EXPOSE 8004

CMD ["uvicorn", "services.execution.main:app", "--host", "0.0.0.0", "--port", "8004"]
