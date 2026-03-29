"""
document_loader.py — Loads PDF files and extracts text
Uses PyPDFLoader from langchain_community
"""

import logging
from pathlib import Path
from typing import List

from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document

logger = logging.getLogger(__name__)


def load_pdf(file_path: str) -> List[Document]:
    """
    Load a PDF file and return a list of LangChain Document objects.
    Each page becomes one Document with metadata (page number, source).

    Args:
        file_path: Absolute path to the PDF file

    Returns:
        List of Document objects (one per page)

    Raises:
        FileNotFoundError: If the PDF doesn't exist
        ValueError: If no text could be extracted
    """
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {file_path}")

    if not path.suffix.lower() == ".pdf":
        raise ValueError(f"Expected a .pdf file, got: {path.suffix}")

    logger.info(f"Loading PDF: {file_path}")

    try:
        loader = PyPDFLoader(str(path))
        documents = loader.load()
    except Exception as e:
        logger.error(f"Failed to load PDF with PyPDFLoader: {e}")
        raise RuntimeError(f"PDF loading failed: {e}")

    if not documents:
        raise ValueError(f"No content extracted from PDF: {file_path}")

    # Add the original filename to each document's metadata
    for doc in documents:
        doc.metadata["source_file"] = path.name

    logger.info(f"Loaded {len(documents)} pages from {path.name}")
    return documents
