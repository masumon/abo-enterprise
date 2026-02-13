FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir -e "."

COPY libs/ libs/
COPY database/ database/
COPY services/auth/ services/auth/
COPY services/api_gateway/ services/api_gateway/

EXPOSE 8000

CMD ["uvicorn", "services.api_gateway.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
