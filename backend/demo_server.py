from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models.query_model import PatientQuery, SuggestedResponse
import asyncio

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

async def mock_response(query: str):
    """Mock AI response generator for demonstration purposes"""
    await asyncio.sleep(1)  # Simulate API delay
    query_lower = query.lower()
    
    if 'headache' in query_lower:
        return {
            'category': 'medical_query',
            'urgency': 'medium',
            'suggested_reply': 'Thank you for reaching out about your headache. While I cannot provide a medical diagnosis, persistent headaches should be evaluated by a healthcare professional. Please consider scheduling an appointment with your primary care physician.'
        }
    elif 'chest pain' in query_lower or 'emergency' in query_lower:
        return {
            'category': 'emergency',
            'urgency': 'high',
            'suggested_reply': 'This sounds like it may require immediate medical attention. Please call emergency services (911) or go to the nearest emergency room right away.'
        }
    elif 'appointment' in query_lower:
        return {
            'category': 'appointment',
            'urgency': 'low',
            'suggested_reply': 'Thank you for contacting us about your appointment. To schedule or reschedule, please call our appointment desk during business hours (Monday-Friday, 8 AM-6 PM).'
        }
    elif 'bill' in query_lower:
        return {
            'category': 'billing',
            'urgency': 'medium',
            'suggested_reply': 'Thank you for your inquiry about your bill. Our billing department would be happy to explain any charges and help with payment options. Please call our billing office for assistance.'
        }
    else:
        return {
            'category': 'general',
            'urgency': 'low',
            'suggested_reply': 'Thank you for contacting us. We have received your message and a member of our healthcare team will review it and get back to you shortly.'
        }

@app.post("/suggest-response", response_model=SuggestedResponse)
async def suggest_response(payload: PatientQuery):
    """
    Accepts a patient query and returns an AI-generated draft response
    with category classification, urgency level, and suggested reply.
    """
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    
    result = await mock_response(payload.query)
    return SuggestedResponse(**result)

@app.get("/")
async def root():
    return {"message": "Hospital Response Suggestion System is running."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
