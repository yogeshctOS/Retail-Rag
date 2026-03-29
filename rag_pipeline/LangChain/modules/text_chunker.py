"""
text_chunker.py — Splits long documents into smaller overlapping chunks
Uses RecursiveCharacterTextSplitter for smart splitting at natural boundaries
"""

import logging
import os
from typing import List

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)


def chunk_documents(documents: List[Document]) -> List[Document]:
    """
    Split a list of Documents into smaller chunks for embedding.

    Uses RecursiveCharacterTextSplitter which tries to split at:
    paragraphs → sentences → words → characters (in that priority order)

    Args:
        documents: List of raw Document objects (e.g., one per PDF page)

    Returns:
        List of chunked Document objects with updated metadata
    """
    chunk_size = int(os.getenv("CHUNK_SIZE", 500))
    chunk_overlap = int(os.getenv("CHUNK_OVERLAP", 50))

    logger.info(
        f"Chunking {len(documents)} documents "
        f"(chunk_size={chunk_size}, overlap={chunk_overlap})"
    )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        # Split at paragraph breaks first, then sentences, then words
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = splitter.split_documents(documents)

    # Add chunk index to metadata for traceability
    for i, chunk in enumerate(chunks):
        chunk.metadata["chunk_index"] = i
        chunk.metadata["chunk_total"] = len(chunks)

    logger.info(f"Created {len(chunks)} chunks from {len(documents)} pages")
    return chunks
