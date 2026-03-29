"""
llm_service.py — HuggingFace LLM for answer generation
Uses flan-t5-base: a lightweight instruction-following model (~250MB)
Designed for question answering tasks — much better than GPT-2 for QA
"""

import logging
import os
from typing import Optional

from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
import torch

logger = logging.getLogger(__name__)

# Module-level singleton — load model once
_qa_pipeline = None


def get_llm_pipeline():
    """
    Returns a singleton text2text-generation pipeline using flan-t5-base.
    Downloads ~250MB on first call.

    flan-t5-base is fine-tuned on instruction following tasks including QA,
    making it much better than autoregressive models like GPT-2 for RAG.
    """
    global _qa_pipeline

    if _qa_pipeline is None:
        model_name = os.getenv("LLM_MODEL", "google/flan-t5-base")
        logger.info(f"Loading LLM: {model_name} (this may take a moment on first run)...")

        # Load tokenizer and model explicitly for better control
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSeq2SeqLM.from_pretrained(
            model_name,
            torch_dtype=torch.float32,  # float32 for CPU stability
        )

        _qa_pipeline = pipeline(
            "text2text-generation",
            model=model,
            tokenizer=tokenizer,
            device=-1,  # -1 = CPU; set to 0 for GPU
            max_new_tokens=int(os.getenv("MAX_NEW_TOKENS", 256)),
        )
        logger.info(f"LLM loaded successfully: {model_name}")

    return _qa_pipeline


def generate_answer(question: str, context: str) -> str:
    """
    Generate an answer to the question using the provided context.

    Constructs a prompt in the format flan-t5 understands best:
    "Answer the question based on the context: ..."

    Args:
        question: User's question
        context: Retrieved document excerpts

    Returns:
        Generated answer string
    """
    # flan-t5 responds well to explicit instruction prompts
    prompt = f"""Answer the following question based only on the provided context.
If the answer is not found in the context, say "I could not find the answer in the document."

Context:
{context}

Question: {question}

Answer:"""

    logger.info(f"Generating answer for: '{question[:60]}...'")

    llm = get_llm_pipeline()

    try:
        outputs = llm(
            prompt,
            max_new_tokens=int(os.getenv("MAX_NEW_TOKENS", 256)),
            do_sample=False,        # Greedy decoding for consistent answers
            num_beams=4,            # Beam search for better quality
            early_stopping=True,
            no_repeat_ngram_size=3, # Prevent repetition
        )

        answer = outputs[0]["generated_text"].strip()

        # Remove the prompt echo if model accidentally includes it
        if "Answer:" in answer:
            answer = answer.split("Answer:")[-1].strip()

        logger.info(f"Generated answer ({len(answer)} chars)")
        return answer if answer else "I could not generate a clear answer from the document."

    except Exception as e:
        logger.error(f"LLM generation error: {e}")
        raise RuntimeError(f"Answer generation failed: {e}")
