import os
os.environ['GEMINI_API_KEY'] = 'AIzaSyBqWfJmaAfemfLKmTIZFLkabR58CFlUvGI'

from app import app
import uvicorn

if __name__ == "__main__":
    print("Starting AI Hospital Response System...")
    print("API Key loaded successfully")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
