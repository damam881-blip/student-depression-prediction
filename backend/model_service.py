from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from backend.schemas import PredictionRequest


BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"

MODEL_PATH = MODELS_DIR / "best_rf_model.pkl"
SLEEP_ENCODER_PATH = MODELS_DIR / "sleep_encoder.pkl"
DIETARY_ENCODER_PATH = MODELS_DIR / "dietary_encoder.pkl"
SCALER_PATH = MODELS_DIR / "robust_scaler.pkl"
FEATURE_COLUMNS_PATH = MODELS_DIR / "feature_columns.pkl"


_model: Any | None = None
_sleep_encoder: Any | None = None
_dietary_encoder: Any | None = None
_scaler: Any | None = None
_feature_columns: list[str] | None = None

_artifacts_load_attempted = False


def _load_artifacts() -> None:
    global _model
    global _sleep_encoder
    global _dietary_encoder
    global _scaler
    global _feature_columns
    global _artifacts_load_attempted

    if _artifacts_load_attempted:
        return

    _artifacts_load_attempted = True

    _model = joblib.load(MODEL_PATH)
    _sleep_encoder = joblib.load(SLEEP_ENCODER_PATH)
    _dietary_encoder = joblib.load(DIETARY_ENCODER_PATH)
    _scaler = joblib.load(SCALER_PATH)
    _feature_columns = joblib.load(FEATURE_COLUMNS_PATH)


def is_model_loaded() -> bool:
    try:
        _load_artifacts()
        return True
    except Exception:
        return False


def model_mode() -> str:
    return "model" if is_model_loaded() else "demo"


def _request_to_dataframe(data: PredictionRequest) -> pd.DataFrame:
    suicidal_thoughts = (
        1 if data.suicidal_thoughts == "Yes" else 0
    )

    family_history = (
        1 if data.family_history == "Yes" else 0
    )

    # Risk_Flag:
    # 1 only when both suicidal thoughts and family history are Yes
    risk_flag = int(
        suicidal_thoughts == 1 and family_history == 1
    )

    # Stress_Index:
    # Mean of Academic Pressure, Financial Stress, and Work/Study Hours
    stress_index = (
        data.academic_pressure
        + data.financial_stress
        + data.work_study_hours
    ) / 3

    # Pressure_per_Satisfaction:
    # Academic Pressure / (Study Satisfaction + 1)
    pressure_per_satisfaction = (
        data.academic_pressure
        / (data.study_satisfaction + 1)
    )

    row = {
        "Gender": 1 if data.gender == "Male" else 0,
        "Age": data.age,
        "Academic Pressure": data.academic_pressure,
        "CGPA": data.cgpa,
        "Study Satisfaction": data.study_satisfaction,
        "Sleep Duration": data.sleep_duration,
        "Have you ever had suicidal thoughts ?": suicidal_thoughts,
        "Work/Study Hours": data.work_study_hours,
        "Financial Stress": data.financial_stress,
        "Family History of Mental Illness": family_history,
        "Risk_Flag": risk_flag,
        "Stress_Index": stress_index,
        "Pressure_per_Satisfaction": pressure_per_satisfaction,
        "Degree_Level": data.degree_level,
        "Dietary Habits": data.dietary_habits,
    }

    return pd.DataFrame([row])


def _preprocess(data: PredictionRequest) -> pd.DataFrame:
    features = _request_to_dataframe(data)

    # ---------------------------------
    # 1. Sleep Duration - OrdinalEncoder
    # ---------------------------------

    features[["Sleep Duration"]] = _sleep_encoder.transform(
        features[["Sleep Duration"]]
    )

    # ---------------------------------
    # 2. Dietary Habits - OneHotEncoder
    # ---------------------------------

    dietary_encoded = _dietary_encoder.transform(
        features[["Dietary Habits"]]
    )

    dietary_columns = _dietary_encoder.get_feature_names_out(
        ["Dietary Habits"]
    )

    dietary_encoded = pd.DataFrame(
        dietary_encoded,
        columns=dietary_columns,
        index=features.index,
    )

    features.drop(columns=["Dietary Habits"], inplace=True)

    features = pd.concat(
        [features, dietary_encoded],
        axis=1,
    )

    # ---------------------------------
    # 3. Feature order
    # ---------------------------------

    features = features[_feature_columns]

    # ---------------------------------
    # 4. RobustScaler
    # ---------------------------------

    features_scaled = _scaler.transform(features)

    return pd.DataFrame(
        features_scaled,
        columns=_feature_columns,
        index=features.index,
    )


def predict_depression(data: PredictionRequest) -> dict:
    """
    Run inference using the trained Random Forest model.
    """

    try:
        _load_artifacts()

        features = _preprocess(data)

        prediction = int(
            _model.predict(features)[0]
        )

        if hasattr(_model, "predict_proba"):
            probability = float(
                _model.predict_proba(features)[0][1]
            )
        else:
            probability = float(prediction)

        return {
            "prediction": prediction,
            "label": (
                "Higher estimated risk"
                if prediction
                else "Lower estimated risk"
            ),
            "probability": round(probability, 4),
            "message": (
                "Prediction generated by the "
                "trained machine-learning model."
            ),
        }

    except Exception as exc:
        raise RuntimeError(
            f"Model inference failed: {exc}"
        ) from exc


def get_model_info() -> dict:
    loaded = is_model_loaded()

    return {
        "model_loaded": loaded,
        "mode": "model" if loaded else "demo",
        "model_name": (
            MODEL_PATH.name
            if loaded
            else "Demo predictor"
        ),
        "message": (
            "The saved Random Forest model and "
            "preprocessing artifacts are loaded."
            if loaded
            else (
                "The model artifacts could not be loaded."
            )
        ),
    }