"""
vector_store.py — FAISS vector store management
Handles creating, saving, and loading FAISS indexes per document
"""

import logging
import os
from pathlib import Path
from typing import List

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

from .embedding_generator import get_embeddings

logger = logging.getLogger(__name__)

VECTOR_STORE_DIR = os.getenv("VECTOR_STORE_DIR", "./vector_stores")


def _get_store_path(document_id: str) -> str:
    """Returns the filesystem path for a document's FAISS index."""
    store_dir = Path(VECTOR_STORE_DIR)
    store_dir.mkdir(parents=True, exist_ok=True)
    return str(store_dir / document_id)


def create_vector_store(document_id: str, chunks: List[Document]) -> FAISS:
    """
    Create a new FAISS vector store from document chunks and persist it to disk.

    Args:
        document_id: Unique ID used as the folder name for this document's index
        chunks: List of text chunks to embed and store

    Returns:
        FAISS vector store instance
    """
    if not chunks:
        raise ValueError("Cannot create vector store from empty chunks list")

    logger.info(f"Creating FAISS index for document {document_id} with {len(chunks)} chunks")

    embeddings = get_embeddings()

    # FAISS.from_documents embeds all chunks and builds the index
    vector_store = FAISS.from_documents(chunks, embeddings)

    # Persist to disk so we can reload without re-embedding
    store_path = _get_store_path(document_id)
    vector_store.save_local(store_path)
    logger.info(f"FAISS index saved to: {store_path}")

    return vector_store


def load_vector_store(document_id: str) -> FAISS:
    """
    Load an existing FAISS index from disk for a given document.

    Args:
        document_id: The document whose index to load

    Returns:
        Loaded FAISS vector store

    Raises:
        FileNotFoundError: If no index exists for this document_id
    """
    store_path = _get_store_path(document_id)

    if not Path(store_path).exists():
        raise FileNotFoundError(
            f"No vector store found for document: {document_id}. "
            "Upload and process the document first."
        )

    logger.info(f"Loading FAISS index from: {store_path}")
    embeddings = get_embeddings()

    # allow_dangerous_deserialization=True is required for loading local FAISS indexes
    vector_store = FAISS.load_local(
        store_path,
        embeddings,
        allow_dangerous_deserialization=True,
    )
    logger.info(f"FAISS index loaded for document: {document_id}")
    return vector_store


def vector_store_exists(document_id: str) -> bool:
    """Check if a FAISS index already exists for a document."""
    store_path = _get_store_path(document_id)
    return Path(store_path).exists()
