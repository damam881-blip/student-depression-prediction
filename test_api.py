from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


VALID_PAYLOAD = {
    "gender": "Male",
    "age": 21,
    "city": "Mumbai",
    "academic_pressure": 4,
    "cgpa": 8.25,
    "study_satisfaction": 2,
    "sleep_duration": "5-6 hours",
    "dietary_habits": "Moderate",
    "suicidal_thoughts": "No",
    "work_study_hours": 8,
    "financial_stress": 3,
    "family_history": "No",
    "degree_level": 1,
}


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_model_info():
    response = client.get("/model-info")
    assert response.status_code == 200
    assert response.json()["mode"] in {"model", "demo"}


def test_prediction():
    response = client.post("/predict", json=VALID_PAYLOAD)
    assert response.status_code == 200
    body = response.json()
    assert body["prediction"] in {0, 1}
    assert 0 <= body["probability"] <= 1


def test_validation_rejects_invalid_gender():
    payload = {**VALID_PAYLOAD, "gender": "Unknown"}
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
