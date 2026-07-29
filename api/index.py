import io
import base64
import os
import json
import requests
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from pypdf import PdfReader

# Load local environment variables (.env)
load_dotenv(override=True)

# Updated Groq models & PDF parsing active
app = FastAPI(title="BrainBrew API Proxy")

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas for incoming request structure
class Attachment(BaseModel):
    name: str
    type: str
    base64: str

class GenerateRequest(BaseModel):
    prompt: str = ""
    type: str = "both"
    attachments: List[Attachment] = []

# System Prompt
SYSTEM_PROMPT = (
    "You are a master educational assistant and subject expert. Your goal is to generate thorough, highly detailed, and comprehensive study materials based on the user's notes, topics, or attached documents.\n"
    "CRITICAL REQUIREMENT: Your entire response MUST be ONLY a single valid JSON object starting with '{' and ending with '}'. "
    "Do NOT output any intro text, preamble, markdown formatting, document summaries, or notes before or after the JSON.\n\n"
    "JSON Schema format:\n"
    "{\n"
    "  \"flashcards\": [\n"
    "    {\n"
    "      \"front\": \"A clear, specific concept, key term, or targeted question\",\n"
    "      \"back\": \"Comprehensive, highly detailed explanation covering key mechanics, definitions, real-world context, or step-by-step concepts (3-5 rich sentences)\"\n"
    "    }\n"
    "  ],\n"
    "  \"quiz\": [\n"
    "    {\n"
    "      \"question\": \"A challenging, conceptual multiple-choice question testing understanding\",\n"
    "      \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n"
    "      \"answerIndex\": 0,\n"
    "      \"explanation\": \"Detailed breakdown explaining why the selected option is correct and why other choices are incorrect.\"\n"
    "    }\n"
    "  ]\n"
    "}\n\n"
    "Instructions:\n"
    "- Generate rich, detailed, and exhaustive study sets. Provide deep explanations rather than brief summaries.\n"
    "- Make flashcards thorough and educational with comprehensive explanations on the back.\n"
    "- If flashcards only requested, set \"quiz\": [].\n"
    "- If quiz only requested, set \"flashcards\": [].\n"
    "- Output ONLY the JSON object."
)

def extract_json_from_text(text: str) -> Optional[dict]:
    """Helper to extract a valid JSON object with flashcards or quiz from text."""
    if not text or not isinstance(text, str):
        return None
    
    # 1. Direct parse attempt
    try:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            start_idx = cleaned.find("{")
            end_idx = cleaned.rfind("}")
            if start_idx != -1 and end_idx != -1:
                cleaned = cleaned[start_idx : end_idx + 1]
        data = json.loads(cleaned)
        if isinstance(data, dict) and ("flashcards" in data or "quiz" in data):
            return data
    except Exception:
        pass

    # 2. Scanning for brace boundaries
    starts = [i for i, c in enumerate(text) if c == '{']
    for s in starts:
        ends = [j for j, c in enumerate(text[s:], s) if c == '}']
        for e in reversed(ends):
            try:
                candidate = text[s:e+1]
                data = json.loads(candidate)
                if isinstance(data, dict) and ("flashcards" in data or "quiz" in data):
                    return data
            except Exception:
                pass

    return None

def process_attachment(att: Attachment):
    """Extract text from PDFs or text files, or return image data."""
    is_pdf = att.type == "application/pdf" or att.name.lower().endswith(".pdf")
    is_image = att.type.startswith("image/") or att.name.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".gif"))
    
    if is_pdf:
        try:
            raw_bytes = base64.b64decode(att.base64)
            reader = PdfReader(io.BytesIO(raw_bytes))
            extracted_pages = []
            for idx, page in enumerate(reader.pages):
                txt = page.extract_text()
                if txt and txt.strip():
                    extracted_pages.append(f"--- Page {idx+1} ---\n{txt.strip()}")
            
            full_text = "\n\n".join(extracted_pages)
            if full_text.strip():
                # Limit length to 40,000 chars per attachment for deeper analysis
                if len(full_text) > 40000:
                    full_text = full_text[:40000] + "\n[Document truncated for brevity]"
                return {"kind": "text", "name": att.name, "text": full_text}
        except Exception as e:
            print(f"Error parsing PDF {att.name}: {e}")
    
    if not is_image:
        try:
            decoded = base64.b64decode(att.base64).decode("utf-8", errors="ignore")
            if decoded.strip():
                if len(decoded) > 40000:
                    decoded = decoded[:40000] + "\n[Text truncated for brevity]"
                return {"kind": "text", "name": att.name, "text": decoded}
        except Exception:
            pass

    if is_image:
        return {"kind": "image", "name": att.name, "type": att.type or "image/png", "base64": att.base64}

    return {"kind": "unknown", "name": att.name, "text": f"[Attached File: {att.name}]"}

@app.get("/")
@app.get("/api")
def read_root():
    # Detect active provider based on environment variables
    groq_key = os.getenv("GROQ_API_KEY")
    use_ollama = os.getenv("USE_OLLAMA", "").lower() == "true"
    gemini_key = os.getenv("GEMINI_API_KEY")

    if groq_key and not groq_key.startswith("your_"):
        model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        active_provider = f"Groq ({model_name})"
    elif use_ollama:
        active_provider = f"Ollama Local (Model: {os.getenv('OLLAMA_MODEL', 'llama3')})"
    elif gemini_key and not gemini_key.startswith("your_"):
        active_provider = "Gemini (gemini-1.5-flash)"
    else:
        active_provider = "None (Requires configuration in .env)"

    return {
        "status": "online",
        "active_provider": active_provider,
        "message": "BrainBrew API backend is running successfully! Please open the frontend at http://localhost:5173 to study."
    }

@app.post("/api/generate")
@app.post("/generate")
async def generate_endpoint(data: GenerateRequest):
    groq_key = os.getenv("GROQ_API_KEY")
    use_ollama = os.getenv("USE_OLLAMA", "").lower() == "true"
    gemini_key = os.getenv("GEMINI_API_KEY")

    processed_attachments = [process_attachment(att) for att in data.attachments]
    doc_texts = [f"\n--- Reference Document ({item['name']}) ---\n{item['text']}\n" for item in processed_attachments if item["kind"] == "text"]
    image_items = [item for item in processed_attachments if item["kind"] == "image"]

    base_prompt = data.prompt if data.prompt.strip() else "Attached Notes"
    user_instructions = (
        f"Create an extensive, highly detailed study set for prompt: \"{base_prompt}\".\n"
        f"Generate: {'both flashcards and quiz' if data.type == 'both' else data.type}.\n"
        "Quantity and Quality requirements:\n"
        "- If generating flashcards: Generate 15 to 20 comprehensive, in-depth flashcards.\n"
        "- If generating quiz: Generate 15 to 20 challenging, conceptual multiple-choice questions with detailed explanations.\n"
        "- Ensure every quiz question features 4 realistic options, a clear correct answerIndex, and a thorough explanation.\n"
        "- Ensure every flashcard back provides a deep, multi-sentence educational breakdown.\n"
        "Output ONLY valid JSON starting with '{'."
    )

    if doc_texts:
        user_instructions += "\n\nReference Material:\n" + "\n".join(doc_texts)

    raw_response_text = ""
    parsed_data = None

    # ==========================================
    # PROVIDER 1: Groq API
    # ==========================================
    if groq_key and not groq_key.startswith("your_"):
        headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json"
        }
        
        default_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        vision_model = os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.6-27b")

        if image_items:
            model_name = vision_model
            content_list = [{"type": "text", "text": user_instructions}]
            for img in image_items:
                content_list.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{img['type']};base64,{img['base64']}"
                    }
                })
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content_list}
            ]
        else:
            model_name = default_model
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_instructions}
            ]

        payload = {
            "model": model_name,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }

        try:
            r = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers, timeout=35.0)
            
            # Fallback to default model with text instructions if vision model fails
            if not r.ok and image_items and model_name != default_model:
                fallback_payload = {
                    "model": default_model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_instructions}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2
                }
                r = requests.post("https://api.groq.com/openai/v1/chat/completions", json=fallback_payload, headers=headers, timeout=35.0)

            if r.ok:
                response_json = r.json()
                raw_response_text = response_json["choices"][0]["message"]["content"]
            else:
                err_text = r.text
                recovered = None
                try:
                    err_json = r.json().get("error", {})
                    failed_gen = err_json.get("failed_generation", "")
                    if failed_gen:
                        recovered = extract_json_from_text(failed_gen)
                except Exception:
                    pass

                if not recovered:
                    recovered = extract_json_from_text(err_text)

                if recovered:
                    parsed_data = recovered
                else:
                    raise HTTPException(status_code=r.status_code, detail=f"Groq API Error: {err_text}")

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to communicate with Groq: {str(e)}")

    # ==========================================
    # PROVIDER 2: Ollama Local API
    # ==========================================
    elif use_ollama or (not gemini_key or gemini_key.startswith("your_")):
        ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        ollama_model = os.getenv("OLLAMA_MODEL", "llama3")

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]

        user_message = {"role": "user", "content": user_instructions}
        if image_items:
            user_message["images"] = [img["base64"] for img in image_items]
        messages.append(user_message)

        payload = {
            "model": ollama_model,
            "messages": messages,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.2
            }
        }

        try:
            r = requests.post(f"{ollama_host}/api/chat", json=payload, timeout=40.0)
            if not r.ok:
                raise HTTPException(status_code=r.status_code, detail=f"Ollama local error: {r.text}")
            response_json = r.json()
            raw_response_text = response_json["message"]["content"]
        except requests.exceptions.ConnectionError:
            raise HTTPException(
                status_code=503,
                detail=f"Cannot connect to local Ollama. Please check if Ollama is running on your machine at {ollama_host} and you have pulled the model '{ollama_model}'."
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ollama processing error: {str(e)}")

    # ==========================================
    # PROVIDER 3: Gemini API
    # ==========================================
    else:
        parts = [{"text": user_instructions}]
        for att in data.attachments:
            parts.append({
                "inlineData": {
                    "mimeType": att.type,
                    "data": att.base64
                }
            })

        payload = {
            "contents": [{"parts": parts}],
            "systemInstruction": {
                "parts": [{"text": SYSTEM_PROMPT}]
            },
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.3,
                "maxOutputTokens": 2500
            }
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
        
        try:
            r = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=25.0)
            if not r.ok:
                error_msg = r.text
                try:
                    error_msg = r.json().get("error", {}).get("message", r.text)
                except:
                    pass
                raise HTTPException(status_code=r.status_code, detail=f"Gemini API Error: {error_msg}")
            
            response_json = r.json()
            candidates = response_json.get("candidates", [])
            if not candidates:
                raise HTTPException(status_code=502, detail="No content returned from Gemini model.")
            
            raw_response_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gemini connection error: {str(e)}")

    # ==========================================
    # Response Sanitization & Parsing
    # ==========================================
    if parsed_data is None:
        if not raw_response_text:
            raise HTTPException(status_code=502, detail="Empty response returned from AI model.")

        extracted = extract_json_from_text(raw_response_text)
        if extracted:
            parsed_data = extracted
        else:
            raise HTTPException(
                status_code=502,
                detail="The AI model generated invalid JSON format. Please try again."
            )

    # Inject empty array fallbacks if missing
    if "flashcards" not in parsed_data:
        parsed_data["flashcards"] = []
    if "quiz" not in parsed_data:
        parsed_data["quiz"] = []

    return parsed_data

