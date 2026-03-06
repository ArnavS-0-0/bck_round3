import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

_client = None


def _get_client():
    """Lazily initialise the Gemini client so the server can start
    even when the API key is not yet configured."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY environment variable is not set. "
                "Please set it before making requests."
            )
        _client = genai.Client(api_key=api_key)
    return _client


async def generate_ai_response(query: str) -> dict:
    """
    Sends a structured prompt to Google Gemini and returns a parsed JSON
    response containing category, urgency, and a suggested reply.
    """

    prompt = f"""You are part of an internal hospital communication system used to respond to patient queries. The system automatically generates responses that are sent to patients, while hospital staff monitor the system in real time and can intervene if necessary.

System Context:
- You are operating within a supervised hospital system where staff oversight is always present
- Focus on providing clear, helpful, and professional responses
- Do NOT include generic disclaimers such as "I am not a doctor" or similar statements
- Assume your responses are being reviewed by trained hospital staff

Patient Query:
"{query}"

Your Requirements:
1. Respond in a professional and empathetic hospital communication tone
2. Provide practical guidance (scheduling appointments, contacting hospital, visiting emergency department)
3. If symptoms indicate urgency (chest pain, breathing issues, severe bleeding), classify as "high" and recommend immediate attention
4. Keep responses concise and clear (60-120 words)
5. Generate confident, professional responses suitable for direct patient communication

Classification Rules:
- appointment: scheduling, rescheduling, cancellations
- medical_query: health questions, symptoms (provide guidance, not diagnosis)
- billing: payment, insurance, invoices
- emergency: urgent medical situations requiring immediate attention
- general: other inquiries

Respond ONLY with valid JSON in this format:
{{
  "category": "<appointment|medical_query|billing|emergency|general>",
  "urgency": "<low|medium|high>",
  "suggested_reply": "<clear professional response suitable for hospital communication>"
}}"""

    try:
        response = _get_client().models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        raw_text = response.text.strip()

        # Strip markdown code fences if Gemini wraps the JSON
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`")
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        result = json.loads(raw_text)

        # Validate expected keys
        valid_categories = ["appointment", "medical_query", "billing", "emergency", "general"]
        valid_urgencies = ["low", "medium", "high"]

        if result.get("category") not in valid_categories:
            result["category"] = "general"
        if result.get("urgency") not in valid_urgencies:
            result["urgency"] = "medium"
        if "suggested_reply" not in result:
            result["suggested_reply"] = "Thank you for reaching out. A member of our team will get back to you shortly."

        return result

    except json.JSONDecodeError:
        return {
            "category": "general",
            "urgency": "medium",
            "suggested_reply": "Thank you for reaching out. We received your message and a member of our team will respond shortly.",
        }
    except Exception as e:
        raise RuntimeError(f"Gemini API error: {str(e)}")
