# 🛒 RetailMind — Retail Document Intelligence RAG System

A fully production-ready Retrieval-Augmented Generation (RAG) system that lets you upload retail PDF documents and ask questions about them using AI.

---

## 📁 Project Structure

```
retail-rag/
├── frontend/               # React.js UI
│   ├── public/index.html
│   └── src/
│       ├── components/
│       │   ├── UploadPanel.jsx
│       │   └── ChatInterface.jsx
│       ├── services/api.js
│       ├── styles/
│       │   ├── global.css
│       │   └── App.css
│       ├── App.jsx
│       └── index.js
│
├── backend/                # Node.js + Express API
│   ├── controllers/
│   │   ├── documentController.js
│   │   └── queryController.js
│   ├── middleware/
│   │   ├── database.js
│   │   ├── logger.js
│   │   └── upload.js
│   ├── routes/
│   │   ├── documentRoutes.js
│   │   └── queryRoutes.js
│   ├── uploads/            # PDF storage (auto-created)
│   ├── logs/               # Log files (auto-created)
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── rag_pipeline/           # Python FastAPI + LangChain
│   ├── modules/
│   │   ├── __init__.py
│   │   ├── document_loader.py
│   │   ├── text_chunker.py
│   │   ├── embedding_generator.py
│   │   ├── vector_store.py
│   │   ├── retriever.py
│   │   └── llm_service.py
│   ├── vector_stores/      # FAISS indexes (auto-created)
│   ├── app.py
│   ├── requirements.txt
│   └── .env
│
└── database/
    └── schema.sql
```

---

## 🔧 Prerequisites

- **Node.js** v18+
- **Python** 3.10+
- **MySQL** 8.0+
- **pip** (Python package manager)
- ~2GB disk space for model downloads

---

## 🚀 Setup & Run Instructions

### Step 1 — MySQL Database

```bash
# Start MySQL and create the database
mysql -u root -p < database/schema.sql

# Update backend/.env with your MySQL credentials:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=yourpassword
# DB_NAME=retail_rag
```

---

### Step 2 — Python RAG Pipeline

```bash
# Navigate to the Python service
cd rag_pipeline

# Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate          # Linux/Mac
# venv\Scripts\activate           # Windows

# Install dependencies (first time takes ~5 minutes)
pip install -r requirements.txt

# Start the FastAPI server
python app.py
# ✅ Runs on http://localhost:8000
# ⚠️  First startup downloads models (~330MB total):
#     - all-MiniLM-L6-v2 (~80MB) — embeddings
#     - google/flan-t5-base (~250MB) — LLM
```

---

### Step 3 — Node.js Backend

```bash
# In a new terminal
cd backend

# Install dependencies
npm install

# Start the backend server
npm run dev           # Development (auto-restart)
# OR
npm start             # Production

# ✅ Runs on http://localhost:5000
```

---

### Step 4 — React Frontend

```bash
# In a new terminal
cd frontend

# Install dependencies
npm install

# Start the development server
npm start

# ✅ Opens http://localhost:3000 in your browser
```

---

## 🔄 How It Works

```
User uploads PDF
    │
    ▼
React Frontend (port 3000)
    │  POST /api/upload  (multipart/form-data)
    ▼
Node.js Backend (port 5000)
    │  Saves file to /uploads with UUID name
    │  Inserts record into MySQL (status: processing)
    │  POST /process  {document_id, file_path}
    ▼
Python FastAPI (port 8000)
    │  PyPDFLoader → loads pages
    │  RecursiveCharacterTextSplitter → 500-char chunks
    │  HuggingFace all-MiniLM-L6-v2 → embeddings
    │  FAISS.from_documents → builds index
    │  Saves index to /vector_stores/{document_id}/
    ▼
Node.js updates MySQL (status: ready)
    ▼
React shows "Document Ready" ✅

User asks a question
    │
    ▼
React Frontend
    │  POST /api/query  {question, document_id}
    ▼
Node.js Backend
    │  POST /query  {question, document_id}
    ▼
Python FastAPI
    │  Embeds question with all-MiniLM-L6-v2
    │  FAISS similarity search → top 4 chunks
    │  Builds context string from chunks
    │  flan-t5-base generates answer
    ▼
Node.js saves Q&A to MySQL
    ▼
React displays answer + source citations
```

---

## 🌐 API Reference

### Backend (Node.js — port 5000)

| Method | Endpoint                     | Description               |
|--------|------------------------------|---------------------------|
| POST   | /api/upload                  | Upload PDF document       |
| POST   | /api/query                   | Ask question about doc    |
| GET    | /api/documents               | List all documents        |
| GET    | /api/history/:document_id    | Get Q&A history           |
| GET    | /health                      | Health check              |

### Python Pipeline (FastAPI — port 8000)

| Method | Endpoint  | Description                     |
|--------|-----------|---------------------------------|
| POST   | /process  | Process PDF into FAISS index    |
| POST   | /query    | Retrieve + generate answer      |
| GET    | /health   | Health check                    |

---

## ⚙️ Configuration

### backend/.env
```
PORT=5000
PYTHON_API_URL=http://localhost:8000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=retail_rag
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
```

### rag_pipeline/.env
```
HOST=0.0.0.0
PORT=8000
EMBEDDING_MODEL=all-MiniLM-L6-v2
LLM_MODEL=google/flan-t5-base
VECTOR_STORE_DIR=./vector_stores
CHUNK_SIZE=500
CHUNK_OVERLAP=50
TOP_K_RESULTS=4
MAX_NEW_TOKENS=256
```

---

## 🛠️ Troubleshooting

**Python service won't start:**
- Ensure PyTorch is installed: `pip install torch --index-url https://download.pytorch.org/whl/cpu`
- Check Python version: `python --version` (needs 3.10+)

**"ECONNREFUSED" errors in backend:**
- Make sure Python service is running on port 8000
- Check `PYTHON_API_URL` in backend/.env

**MySQL connection error:**
- Verify MySQL is running: `mysql -u root -p`
- Confirm DB_PASSWORD in backend/.env is correct
- Run: `mysql -u root -p < database/schema.sql`

**First query is slow:**
- Normal! Models load into memory on first request (~30-60s)
- Subsequent queries are much faster

**Out of memory:**
- `flan-t5-base` needs ~1GB RAM
- Close other applications or use `distilgpt2` as LLM_MODEL fallback

---

## 📦 Tech Stack Summary

| Layer         | Technology                           |
|---------------|--------------------------------------|
| Frontend      | React 18, Axios                      |
| Backend       | Node.js, Express, Multer, Winston    |
| Database      | MySQL 8 + mysql2                     |
| AI Pipeline   | Python, FastAPI, LangChain           |
| Embeddings    | sentence-transformers/all-MiniLM-L6-v2 |
| LLM           | google/flan-t5-base (HuggingFace)    |
| Vector Store  | FAISS (CPU)                          |
| PDF Loading   | PyPDFLoader (langchain-community)    |
