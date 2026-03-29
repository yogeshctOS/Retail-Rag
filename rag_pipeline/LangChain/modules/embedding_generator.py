"""
embedding_generator.py — Creates text embeddings using HuggingFace Sentence Transformers
all-MiniLM-L6-v2 is a small, fast, high-quality embedding model (~80MB)
"""

import logging
import os

from langchain_community.embeddings import HuggingFaceEmbeddings

logger = logging.getLogger(__name__)

# Module-level singleton — load model once, reuse across requests
_embeddings_instance = None


def get_embeddings() -> HuggingFaceEmbeddings:
    """
    Returns a singleton HuggingFaceEmbeddings instance.
    The model is downloaded on first call (~80MB for all-MiniLM-L6-v2).

    Returns:
        HuggingFaceEmbeddings instance ready for use with FAISS
    """
    global _embeddings_instance

    if _embeddings_instance is None:
        model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        logger.info(f"Loading embedding model: {model_name}")

        _embeddings_instance = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={"device": "cpu"},  # Use CPU — change to 'cuda' if GPU available
            encode_kwargs={
                "normalize_embeddings": True,  # Normalize for cosine similarity
                "batch_size": 32,
            },
        )
        logger.info(f"Embedding model loaded: {model_name}")

    return _embeddings_instance
