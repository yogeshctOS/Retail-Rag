"""
retriever.py — Similarity search over FAISS vector store
Retrieves the most relevant chunks for a given question
"""

import logging
import os
from typing import List, Tuple

from langchain_core.documents import Document

from .vector_store import load_vector_store

logger = logging.getLogger(__name__)


def retrieve_relevant_chunks(
    question: str,
    document_id: str,
    top_k: int = None,
) -> List[Tuple[Document, float]]:
    """
    Perform a similarity search to find the most relevant chunks for a question.

    Args:
        question: The user's question string
        document_id: Which document's FAISS index to search
        top_k: Number of top results to return (default from env var)

    Returns:
        List of (Document, score) tuples sorted by relevance (highest first)
    """
    if top_k is None:
        top_k = int(os.getenv("TOP_K_RESULTS", 4))

    logger.info(f"Retrieving top {top_k} chunks for: '{question[:80]}...'")

    # Load the FAISS index for this document
    vector_store = load_vector_store(document_id)

    # similarity_search_with_score returns (doc, distance) pairs
    # Lower L2 distance = more similar (FAISS default), so we sort ascending
    results = vector_store.similarity_search_with_score(question, k=top_k)

    logger.info(f"Retrieved {len(results)} chunks (scores: {[round(s,3) for _,s in results]})")
    return results


def build_context_string(retrieved_chunks: List[Tuple[Document, float]]) -> str:
    """
    Combine retrieved chunks into a single context string for the LLM prompt.

    Args:
        retrieved_chunks: Output from retrieve_relevant_chunks()

    Returns:
        Formatted context string
    """
    context_parts = []
    for i, (doc, score) in enumerate(retrieved_chunks, 1):
        page = doc.metadata.get("page", "?")
        snippet = doc.page_content.strip()
        context_parts.append(f"[Excerpt {i} — Page {page}]\n{snippet}")

    return "\n\n---\n\n".join(context_parts)
