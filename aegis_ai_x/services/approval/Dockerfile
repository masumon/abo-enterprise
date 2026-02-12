FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir -e "."

COPY libs/ libs/
COPY database/ database/
COPY services/approval/ services/approval/

EXPOSE 8005

CMD ["uvicorn", "services.approval.main:app", "--host", "0.0.0.0", "--port", "8005"]
