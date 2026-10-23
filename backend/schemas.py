from typing import Literal

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):

    gender: Literal["Male", "Female"]

    age: float = Field(ge=10, le=100)

    academic_pressure: float = Field(ge=0, le=5)

    cgpa: float = Field(ge=0, le=10)

    study_satisfaction: float = Field(ge=0, le=5)

    sleep_duration: Literal[
        "Less than 5 hours",
        "5-6 hours",
        "7-8 hours",
        "More than 8 hours",
        "More than 8 hours by far (16 , 17 hours) in continuous",
    ]

    dietary_habits: Literal[
        "Healthy",
        "Moderate",
        "Unhealthy",
        "Others",
    ]

    suicidal_thoughts: Literal["Yes", "No"]

    work_study_hours: float = Field(ge=0, le=24)

    financial_stress: float = Field(ge=1, le=5)

    family_history: Literal["Yes", "No"]

    degree_level: int = Field(ge=0, le=4)


class PredictionResponse(BaseModel):

    prediction: int
    label: str
    probability: float = Field(ge=0, le=1)
    message: str


class HealthResponse(BaseModel):

    status: str
    model_loaded: bool
    mode: Literal["model", "demo"]


class ModelInfoResponse(BaseModel):

    model_loaded: bool
    mode: Literal["model", "demo"]
    model_name: str
    message: str