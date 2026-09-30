# syntax=docker/dockerfile:1

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /srv

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Not root, and not writing to its own image.
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin assistant
USER assistant

EXPOSE 8000

# One worker: this process is almost entirely waiting on the model and the Node API, which asyncio
# handles inside a single loop far more cheaply than a second interpreter would.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
