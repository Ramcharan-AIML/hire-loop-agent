# Cold Mail Service — FastAPI wrapper (architecture.md §3.3, §8).
# (The vendored repo's own Dockerfile runs the standalone Streamlit app on 8501;
#  this one runs the platform API on 8001.)
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the FastAPI wrapper and the vendored cold-mail package.
COPY app ./app
COPY cold_mail_sender ./cold_mail_sender

ENV DRY_RUN=true
EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
