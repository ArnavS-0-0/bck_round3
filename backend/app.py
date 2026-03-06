from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.ai_routes import router as ai_router

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

# Include AI routes
app.include_router(ai_router)


@app.get("/")
async def root():
    return {"message": "Hospital Response Suggestion System is running."}
