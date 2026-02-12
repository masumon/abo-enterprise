FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir -e "."

COPY libs/ libs/
COPY database/ database/
COPY services/supervisor/ services/supervisor/

EXPOSE 8001

CMD ["uvicorn", "services.supervisor.main:app", "--host", "0.0.0.0", "--port", "8001"]
