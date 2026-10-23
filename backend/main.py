from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.model_service import get_model_info, model_mode, predict_depression
from backend.schemas import (
    HealthResponse,
    ModelInfoResponse,
    PredictionRequest,
    PredictionResponse,
)


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(
    title="Student Depression Prediction",
    description=(
        "Educational ML application for estimating student depression risk "
        "from survey-style inputs."
    ),
    version="1.0.0",
)

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health", response_model=HealthResponse)
def health():
    mode = model_mode()

    return {
        "status": "healthy",
        "model_loaded": mode == "model",
        "mode": mode,
    }


@app.get("/model-info", response_model=ModelInfoResponse)
def model_info():
    return get_model_info()


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    return predict_depression(request)
