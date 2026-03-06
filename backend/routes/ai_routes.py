from fastapi import APIRouter, HTTPException
from models.query_model import PatientQuery, SuggestedResponse
from gemini_service import generate_ai_response

router = APIRouter()


@router.post("/suggest-response", response_model=SuggestedResponse)
async def suggest_response(payload: PatientQuery):
    """
    Accepts a patient query and returns an AI-generated draft response
    with category classification, urgency level, and suggested reply.
    """
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        result = await generate_ai_response(payload.query)
        return SuggestedResponse(**result)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while generating the response.",
        )
