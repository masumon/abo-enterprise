FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir -e "."

COPY libs/ libs/
COPY database/ database/
COPY services/auth/ services/auth/

EXPOSE 8003

CMD ["uvicorn", "services.auth.main:app", "--host", "0.0.0.0", "--port", "8003"]
