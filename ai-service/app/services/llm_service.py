"""
LLM Coordinator
----------------
Abstracts the choice between local Ollama and Anthropic Claude.
Controlled entirely by the AI_PROVIDER env var ("local" or "claude").

Exposes a single async `complete(messages, system_prompt)` interface
so the rest of the codebase never depends on the provider directly.
"""
from __future__ import annotations

from typing import Optional
import logging

from config import settings

logger = logging.getLogger(__name__)


async def complete(
    messages: list[dict],        # [{"role": "user"|"assistant", "content": "..."}]
    system_prompt: str = "",
    max_tokens: int = 2048,
    temperature: float = 0.3,
) -> str:
    """
    Route to the configured provider and return the assistant's reply text.
    messages must be in OpenAI-style [{"role": ..., "content": ...}] format.
    """
    if settings.AI_PROVIDER == "claude":
        return await _complete_claude(messages, system_prompt, max_tokens, temperature)
    else:
        return await _complete_ollama(messages, system_prompt, max_tokens, temperature)


# ── Anthropic Claude ──────────────────────────────────────────────────────────

async def _complete_claude(
    messages: list[dict],
    system_prompt: str,
    max_tokens: int,
    temperature: float,
) -> str:
    import anthropic

    if not settings.CLAUDE_API_KEY:
        raise ValueError("CLAUDE_API_KEY not set in environment")

    client = anthropic.AsyncAnthropic(api_key=settings.CLAUDE_API_KEY)
    response = await client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=messages,
        temperature=temperature,
    )
    return response.content[0].text


# ── Local Ollama ──────────────────────────────────────────────────────────────

async def _complete_ollama(
    messages: list[dict],
    system_prompt: str,
    max_tokens: int,
    temperature: float,
) -> str:
    import httpx

    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{settings.OLLAMA_BASE_URL}/api/chat",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["message"]["content"]
