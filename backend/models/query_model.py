from pydantic import BaseModel
from enum import Enum


class CategoryEnum(str, Enum):
    appointment = "appointment"
    medical_query = "medical_query"
    billing = "billing"
    emergency = "emergency"
    general = "general"


class UrgencyEnum(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class PatientQuery(BaseModel):
    query: str


class SuggestedResponse(BaseModel):
    category: CategoryEnum
    urgency: UrgencyEnum
    suggested_reply: str
