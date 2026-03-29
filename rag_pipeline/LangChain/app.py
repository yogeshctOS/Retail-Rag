"""
app.py — FastAPI application entry point for the RAG pipeline
Exposes two endpoints:
  POST /process  — Load PDF, chunk, embed, store in FAISS
  POST /query    — Retrieve + Generate answer
"""

import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load .env before importing modules that read env vars
load_dotenv()

from modules.document_loader import load_pdf
from modules.text_chunker import chunk_documents
from modules.vector_store import create_vector_store, vector_store_exists
from modules.retriever import retrieve_relevant_chunks, build_context_string
from modules.llm_service import generate_answer, get_llm_pipeline
from modules.embedding_generator import get_embeddings

# ── Logging Configuration ─────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Startup: pre-load models so first request isn't slow ─────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 RAG Pipeline starting up — pre-loading models...")
    try:
        get_embeddings()          # Load embedding model (~80MB)
        get_llm_pipeline()        # Load flan-t5-base (~250MB)
        logger.info("✅ All models loaded and ready")
    except Exception as e:
        logger.error(f"Model preload failed: {e}. Models will load on first request.")
    yield
    logger.info("RAG Pipeline shutting down")


# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Retail RAG Pipeline",
    description="Document Intelligence API using LangChain + FAISS + HuggingFace",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Schemas ────────────────────────────────────────────────
class ProcessRequest(BaseModel):
    document_id: str
    file_path: str
    original_name: str = ""


class ProcessResponse(BaseModel):
    success: bool
    document_id: str
    chunks_created: int
    pages_loaded: int
    message: str


class QueryRequest(BaseModel):
    question: str
    document_id: str


class QueryResponse(BaseModel):
    success: bool
    question: str
    answer: str
    context_chunks: int
    source_snippets: list
    processing_time_ms: int


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "rag-pipeline"}


@app.post("/process", response_model=ProcessResponse)
def process_document(request: ProcessRequest):
    """
    Load a PDF, split into chunks, generate embeddings, and save FAISS index.

    Called by the Node.js backend after a user uploads a PDF.
    """
    logger.info(f"Processing document: {request.document_id} — {request.file_path}")

    # Skip re-processing if index already exists (idempotent)
    if vector_store_exists(request.document_id):
        logger.info(f"Vector store already exists for {request.document_id}, skipping")
        return ProcessResponse(
            success=True,
            document_id=request.document_id,
            chunks_created=0,
            pages_loaded=0,
            message="Document already processed (index exists)",
        )

    try:
        # Step 1: Load PDF pages
        documents = load_pdf(request.file_path)

        # Step 2: Split into chunks
        chunks = chunk_documents(documents)

        # Step 3: Embed chunks and store in FAISS
        create_vector_store(request.document_id, chunks)

        logger.info(
            f"Document {request.document_id} processed: "
            f"{len(documents)} pages → {len(chunks)} chunks"
        )

        return ProcessResponse(
            success=True,
            document_id=request.document_id,
            chunks_created=len(chunks),
            pages_loaded=len(documents),
            message=f"Successfully processed {len(documents)} pages into {len(chunks)} chunks",
        )

    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        logger.error(f"Processing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@app.post("/query", response_model=QueryResponse)
def query_document(request: QueryRequest):
    """
    Retrieve relevant chunks and generate an answer using the LLM.

    Steps:
    1. Embed the question
    2. Search FAISS for similar chunks
    3. Build context string
    4. Feed context + question to flan-t5 LLM
    5. Return answer + source snippets
    """
    logger.info(f"Query for document {request.document_id}: '{request.question[:80]}'")
    start_time = time.time()

    try:
        # Step 1 & 2: Retrieve top-k relevant chunks
        retrieved = retrieve_relevant_chunks(request.question, request.document_id)

        if not retrieved:
            return QueryResponse(
                success=True,
                question=request.question,
                answer="No relevant content found in the document for this question.",
                context_chunks=0,
                source_snippets=[],
                processing_time_ms=int((time.time() - start_time) * 1000),
            )

        # Step 3: Build context string from retrieved chunks
        context = build_context_string(retrieved)

        # Step 4: Generate answer using LLM
        answer = generate_answer(request.question, context)

        # Step 5: Build source snippets for frontend display
        source_snippets = [
            {
                "text": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                "page": doc.metadata.get("page", "?"),
                "score": round(float(score), 4),
            }
            for doc, score in retrieved
        ]

        processing_time = int((time.time() - start_time) * 1000)
        logger.info(f"Query answered in {processing_time}ms")

        return QueryResponse(
            success=True,
            question=request.question,
            answer=answer,
            context_chunks=len(retrieved),
            source_snippets=source_snippets,
            processing_time_ms=processing_time,
        )

    except FileNotFoundError as e:
        logger.error(f"Vector store not found: {e}")
        raise HTTPException(
            status_code=404,
            detail="Document not found. Please upload and process the document first.",
        )

    except Exception as e:
        logger.error(f"Query error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


# ── Run directly with: python app.py ─────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=False,
        log_level="info",
    )
