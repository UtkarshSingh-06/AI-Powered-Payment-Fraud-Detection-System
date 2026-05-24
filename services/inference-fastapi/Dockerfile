FROM python:3.11-slim

WORKDIR /app

COPY services/inference-fastapi/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/inference-fastapi/app ./app
COPY ml/training /tmp/training
RUN pip install --no-cache-dir xgboost joblib scikit-learn pandas numpy \
    && cd /tmp/training && python train.py \
    && mkdir -p /app/models \
    && cp artifacts/xgboost-fraud.joblib /app/models/xgboost-fraud.joblib

ENV MODEL_ARTIFACT_PATH=/app/models/xgboost-fraud.joblib

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
