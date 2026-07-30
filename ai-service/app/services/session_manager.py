"""
Session Manager
----------------
In-process multi-turn conversation memory.
Each session is keyed by a UUID conversation_id.
Stores last N message pairs per session (configurable via SESSION_HISTORY_TURNS).
No Redis dependency — simple dict for MVP, easy to swap later.
"""
from __future__ import annotations

import uuid
from typing import Optional
from config import settings


class SessionManager:
    def __init__(self):
        # { conversation_id: { "user_id": int, "messages": [...] } }
        self._sessions: dict[str, dict] = {}

    def create_or_get(self, user_id: int, conversation_id: Optional[str] = None) -> str:
        """
        Return existing conversation_id or create a new one.
        Validates that the existing conversation belongs to this user.
        """
        if conversation_id and conversation_id in self._sessions:
            if self._sessions[conversation_id]["user_id"] != user_id:
                raise PermissionError("Conversation does not belong to this user")
            return conversation_id

        cid = conversation_id or str(uuid.uuid4())
        self._sessions[cid] = {"user_id": user_id, "messages": []}
        return cid

    def add_turn(self, conversation_id: str, user_message: str, assistant_reply: str):
        """Append a user+assistant turn, keeping only the last N turns."""
        session = self._sessions.get(conversation_id)
        if not session:
            return
        session["messages"].append({"role": "user", "content": user_message})
        session["messages"].append({"role": "assistant", "content": assistant_reply})

        max_messages = settings.SESSION_HISTORY_TURNS * 2
        if len(session["messages"]) > max_messages:
            session["messages"] = session["messages"][-max_messages:]

    def get_history(self, conversation_id: str) -> list[dict]:
        """Return message history in [{"role": ..., "content": ...}] format."""
        session = self._sessions.get(conversation_id, {})
        return session.get("messages", [])

    def get_all(self, conversation_id: str, user_id: int) -> dict:
        """For the history endpoint — returns full session data."""
        session = self._sessions.get(conversation_id)
        if not session or session["user_id"] != user_id:
            return {"conversation_id": conversation_id, "messages": []}
        return {
            "conversation_id": conversation_id,
            "messages": session["messages"],
        }


# Module-level singleton
session_manager = SessionManager()
