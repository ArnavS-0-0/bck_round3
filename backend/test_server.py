from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from gemini_service_mock import generate_ai_response

app = FastAPI(
    title="Hospital Response Suggestion System",
    description="AI-powered backend that helps hospital staff draft responses to patient queries.",
    version="1.0.0",
)

# Enable CORS for all origins (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import the existing models
from models.query_model import PatientQuery, SuggestedResponse

@app.post("/suggest-response", response_model=SuggestedResponse)
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Hospital Response Suggestion System is running."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
