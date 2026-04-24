from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.chatbot_service import ask_chatbot
from auth import get_optional_user
from models import User

router = APIRouter(prefix="/api/v1/chatbot", tags=["chatbot"])

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    question: str
    response: str

@router.post("/ask", response_model=ChatResponse)
async def ask(
    body: ChatRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    if not body.question.strip():
        raise HTTPException(status_code=422, detail="Question cannot be empty")
    
    answer = ask_chatbot(body.question)
    
    return {
        "question": body.question,
        "response": answer
    }
