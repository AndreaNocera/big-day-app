FROM public.ecr.aws/docker/library/python:3.11-slim

WORKDIR /app

# Install dependencies needed for moto and tests
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY local_server/requirements.txt /app/local_server/requirements.txt
RUN pip install --no-cache-dir -r local_server/requirements.txt

ENV PYTHONPATH=/app/lambda

CMD ["uvicorn", "local_server.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/app/lambda", "--reload-dir", "/app/local_server"]
