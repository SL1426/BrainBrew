# BrainBrew 🧠 | Interactive AI Study Assistant

**Live Production Link:** [https://brain-brew-9l8d2379h-sl1426s-projects.vercel.app/](https://brain-brew-9l8d2379h-sl1426s-projects.vercel.app/)

BrainBrew is a full-stack study assistant that transforms notes, PDFs, or screenshots into highly interactive study tools: **3D Flashcards** and **Multiple-Choice Quizzes**. 

This repository features a **React/TypeScript frontend** and a serverless-compatible **FastAPI Python backend**, styled with a premium **Ocean Breeze 🌊** theme matching the interface design of ChatGPT and Claude.

---

## 📋 Feature Breakdown

### 1. Core Assignment Features (Standard Requirements)
* **AI Study Generator**: Generates interactive study decks from free-form user text prompts.
* **3D Flashcards**: A card component that allows students to flip cards to reveal terms and definitions.
* **Interactive Quiz**: Standard multiple-choice quiz interface with options, score tracking, progress bar, and detailed explanations for each question.
* **Re-test Wrong Answers**: When a quiz is completed, the app reviews incorrect choices and allows the student to instantly take a focused quiz containing *only* the questions they missed.
* **Structured Response Enforcement**: Implements rigid JSON schema prompts to force the AI model to return valid structured data.
* **Self-Repair & Offline Mode**: 
  - Filters out raw markdown wrappers (e.g. ` ```json `) if the model returns them.
  - Automatically injects empty array fallbacks if sections are missing.
  - Graceful error states with a **"Practice Offline (Mock Study Set)"** option if the API fails or is unavailable.

### 2. Custom Added Features (User Requests)
* **Python FastAPI Migration**: Refactored the backend architecture from Node.js/Express to Python FastAPI (`api/index.py`) for clean, data-centric development.
* **Multi-LLM Support**: Engineered the FastAPI backend to dynamically support three model providers based on your `.env` configuration:
  - **Groq API** (`llama-3.3-70b-versatile` & `llama-3.2-11b-vision-preview`).
  - **Ollama Local** (fully offline local model execution, e.g. `llama3` or `qwen2.5`).
  - **Gemini API** (using the stable `gemini-1.5-flash` model).
* **Multimodal Uploads**: Added support for uploading files (**PDFs** and **Screenshot images**) alongside prompts. The frontend parses them to Base64, and the backend forwards them directly to the AI model.
* **D-Drive Virtual Environment**: Built a self-contained local Python virtual environment (`.venv`) on the **D drive** (`d:\Sujal\FLAM\.venv`) to bypass C drive storage constraints.
* **Claude / ChatGPT Layout**: Redesigned the user interface to feature a professional dark-slate sidebar for session history and a floating, centered prompt bar at the bottom.
* **Custom Toggle Pills**: Replaced standard browser dropdown select menus with a custom pill toggle selector (Both / Cards / Quiz) next to the attachment clip.
* **Clean Landing State**: The app is configured to always initialize on the clean "New Study Deck" prompt screen on page reload rather than automatically loading the last active session.
* **Vercel Deployable**: Pre-configured serverless rewrites (`vercel.json`) to map frontend static assets and backend FastAPI functions seamlessly on Vercel.

---

## 🚀 Quick Start (Local Setup)

### 1. Install Frontend Dependencies
```bash
npm install
```

### 2. Install Python Backend Dependencies
Install the required packages into your Python environment:
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy the `.env.example` file to `.env` and fill in the provider of your choice:
```env
# 1. GROQ PROVIDER
GROQ_API_KEY=gsk_yourGroqKeyHere

# 2. OLLAMA PROVIDER (Set to true to run fully local/offline)
USE_OLLAMA=false
OLLAMA_MODEL=llama3
OLLAMA_HOST=http://localhost:11434

# 3. GEMINI PROVIDER
GEMINI_API_KEY=AIzaSyYourGeminiKeyHere
```

> [!WARNING]
> **Security Notice**: Your API keys are sensitive. Do **NOT** commit your `.env` file or push actual API keys to GitHub. 
> The project's `.gitignore` file is configured to ignore `.env` files automatically to keep your credentials safe.


### 4. Run the Application
Start the backend and frontend concurrently:
* **Start the Python Backend Server** (runs FastAPI via Uvicorn on port 5000):
  ```bash
  npm run server
  ```
* **Start the Frontend Development Server** (runs Vite on port 5173):
  ```bash
  npm run dev
  ```

Open your browser and navigate to [http://localhost:5173](http://localhost:5173).

---

## ☁️ Deploying to Vercel

BrainBrew is configured to deploy to Vercel as a single full-stack monorepo:

1. Push your code to a GitHub repository.
2. Link your repository to [Vercel](https://vercel.com/).
3. Vercel will automatically read the `vercel.json` routing configurations and deploy the React frontend and the Python FastAPI endpoint.
4. Add your preferred API key (e.g. `GROQ_API_KEY` or `GEMINI_API_KEY`) as an Environment Variable in the Vercel Dashboard.
5. Click **Deploy**.
