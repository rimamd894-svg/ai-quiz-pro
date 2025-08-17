from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import os
import uuid
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
import hashlib
import time

# Load environment variables
load_dotenv()

app = FastAPI(title="AI Quiz Pro API", version="1.0.0")

# MongoDB setup
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "quiz_pro_db")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Pydantic models
class UserRegistration(BaseModel):
    email: str
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: str
    password: str

class QuizRequest(BaseModel):
    category: str
    difficulty: str
    num_questions: int = 5

class QuizAnswer(BaseModel):
    question_id: str
    selected_answer: int
    time_taken: float

class QuizSubmission(BaseModel):
    quiz_id: str
    answers: List[QuizAnswer]

# Utility functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token(user_id: str) -> str:
    return f"token_{user_id}_{int(time.time())}"

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    if not token.startswith("token_"):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = token.split("_")[1]
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# AI Quiz Generation
async def generate_quiz_questions(category: str, difficulty: str, num_questions: int):
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"quiz_{uuid.uuid4()}",
            system_message=f"""You are an AI quiz generator. Generate exactly {num_questions} multiple-choice questions for the category '{category}' at '{difficulty}' difficulty level.

IMPORTANT: Return ONLY a valid JSON array with this exact format:
[
  {{
    "id": "q1",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "explanation": "Brief explanation why this is correct",
    "points": 10
  }}
]

Rules:
- Each question should have exactly 4 options
- correct_answer should be index (0-3) of the correct option
- Points: Easy=10, Medium=20, Hard=30
- Questions should be educational and factual
- No markdown, no extra text, just the JSON array"""
        ).with_model("openai", "gpt-4o-mini")

        user_message = UserMessage(text=f"Generate {num_questions} {difficulty} level questions about {category}")
        response = await chat.send_message(user_message)
        
        # Parse the AI response
        try:
            questions = json.loads(response.strip())
            if not isinstance(questions, list):
                raise ValueError("Response is not a list")
            
            # Assign points based on difficulty
            points_map = {"Easy": 10, "Medium": 20, "Hard": 30}
            for q in questions:
                q["points"] = points_map.get(difficulty, 10)
                q["category"] = category
                q["difficulty"] = difficulty
            
            return questions
        except json.JSONDecodeError:
            # Fallback questions if AI response fails
            return generate_fallback_questions(category, difficulty, num_questions)
            
    except Exception as e:
        print(f"AI generation failed: {e}")
        return generate_fallback_questions(category, difficulty, num_questions)

def generate_fallback_questions(category: str, difficulty: str, num_questions: int):
    """Fallback questions in case AI fails"""
    points_map = {"Easy": 10, "Medium": 20, "Hard": 30}
    points = points_map.get(difficulty, 10)
    
    questions = []
    for i in range(num_questions):
        questions.append({
            "id": f"fallback_{i+1}",
            "question": f"Sample {difficulty} question {i+1} about {category}?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": 0,
            "explanation": f"This is a sample explanation for {category}",
            "points": points,
            "category": category,
            "difficulty": difficulty
        })
    return questions

# API Routes
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "AI Quiz Pro API"}

@app.post("/api/auth/register")
async def register_user(user_data: UserRegistration):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "total_points": 0,
        "wallet_balance": 0.0,
        "created_at": datetime.utcnow(),
        "total_quizzes": 0,
        "correct_answers": 0,
        "is_verified": False
    }
    
    await db.users.insert_one(user_doc)
    token = generate_token(user_id)
    
    return {
        "message": "User registered successfully",
        "token": token,
        "user": {
            "user_id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "total_points": 0,
            "wallet_balance": 0.0
        }
    }

@app.post("/api/auth/login")
async def login_user(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or user["password"] != hash_password(login_data.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = generate_token(user["user_id"])
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "total_points": user.get("total_points", 0),
            "wallet_balance": user.get("wallet_balance", 0.0)
        }
    }

@app.get("/api/user/profile")
async def get_user_profile(current_user = Depends(get_current_user)):
    return {
        "user_id": current_user["user_id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "total_points": current_user.get("total_points", 0),
        "wallet_balance": current_user.get("wallet_balance", 0.0),
        "total_quizzes": current_user.get("total_quizzes", 0),
        "correct_answers": current_user.get("correct_answers", 0)
    }

@app.get("/api/quiz/categories")
async def get_quiz_categories():
    return {
        "categories": [
            "General Knowledge",
            "Science & Technology", 
            "History",
            "Geography",
            "Sports",
            "Entertainment",
            "Literature",
            "Mathematics",
            "Current Affairs",
            "Art & Culture"
        ]
    }

@app.post("/api/quiz/generate")
async def generate_quiz(quiz_request: QuizRequest, current_user = Depends(get_current_user)):
    questions = await generate_quiz_questions(
        quiz_request.category,
        quiz_request.difficulty,
        quiz_request.num_questions
    )
    
    quiz_id = str(uuid.uuid4())
    quiz_doc = {
        "quiz_id": quiz_id,
        "user_id": current_user["user_id"],
        "category": quiz_request.category,
        "difficulty": quiz_request.difficulty,
        "questions": questions,
        "created_at": datetime.utcnow(),
        "completed": False,
        "score": 0,
        "total_points": sum(q["points"] for q in questions)
    }
    
    await db.quizzes.insert_one(quiz_doc)
    
    # Remove correct answers from response
    questions_for_client = []
    for q in questions:
        q_copy = q.copy()
        del q_copy["correct_answer"]
        del q_copy["explanation"]
        questions_for_client.append(q_copy)
    
    return {
        "quiz_id": quiz_id,
        "category": quiz_request.category,
        "difficulty": quiz_request.difficulty,
        "questions": questions_for_client,
        "time_limit": quiz_request.num_questions * 30,  # 30 seconds per question
        "total_possible_points": sum(q["points"] for q in questions)
    }

@app.post("/api/quiz/submit")
async def submit_quiz(submission: QuizSubmission, current_user = Depends(get_current_user)):
    # Get the quiz
    quiz = await db.quizzes.find_one({"quiz_id": submission.quiz_id, "user_id": current_user["user_id"]})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    if quiz["completed"]:
        raise HTTPException(status_code=400, detail="Quiz already completed")
    
    # Calculate score
    total_score = 0
    correct_count = 0
    results = []
    
    for answer in submission.answers:
        question = next((q for q in quiz["questions"] if q["id"] == answer.question_id), None)
        if not question:
            continue
            
        is_correct = question["correct_answer"] == answer.selected_answer
        points_earned = question["points"] if is_correct else 0
        
        if is_correct:
            correct_count += 1
            total_score += points_earned
        
        results.append({
            "question_id": answer.question_id,
            "question": question["question"],
            "options": question["options"],
            "selected_answer": answer.selected_answer,
            "correct_answer": question["correct_answer"],
            "is_correct": is_correct,
            "points_earned": points_earned,
            "explanation": question["explanation"],
            "time_taken": answer.time_taken
        })
    
    # Update quiz as completed
    await db.quizzes.update_one(
        {"quiz_id": submission.quiz_id},
        {
            "$set": {
                "completed": True,
                "score": total_score,
                "correct_answers": correct_count,
                "completed_at": datetime.utcnow(),
                "results": results
            }
        }
    )
    
    # Update user stats
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {
            "$inc": {
                "total_points": total_score,
                "total_quizzes": 1,
                "correct_answers": correct_count,
                "wallet_balance": total_score * 0.01  # 1 point = $0.01
            }
        }
    )
    
    return {
        "quiz_id": submission.quiz_id,
        "total_score": total_score,
        "correct_answers": correct_count,
        "total_questions": len(quiz["questions"]),
        "accuracy": (correct_count / len(quiz["questions"])) * 100,
        "points_earned": total_score,
        "money_earned": total_score * 0.01,
        "results": results
    }

@app.get("/api/leaderboard")
async def get_leaderboard(limit: int = 10):
    leaders = await db.users.find(
        {},
        {"full_name": 1, "total_points": 1, "total_quizzes": 1, "wallet_balance": 1}
    ).sort("total_points", -1).limit(limit).to_list(length=limit)
    
    leaderboard = []
    for i, leader in enumerate(leaders):
        leaderboard.append({
            "rank": i + 1,
            "full_name": leader["full_name"],
            "total_points": leader.get("total_points", 0),
            "total_quizzes": leader.get("total_quizzes", 0),
            "wallet_balance": leader.get("wallet_balance", 0.0)
        })
    
    return {"leaderboard": leaderboard}

@app.get("/api/user/history")
async def get_quiz_history(current_user = Depends(get_current_user), limit: int = 20):
    try:
        history = await db.quizzes.find(
            {"user_id": current_user["user_id"], "completed": True},
            {"quiz_id": 1, "category": 1, "difficulty": 1, "score": 1, "correct_answers": 1, "completed_at": 1}
        ).sort([("completed_at", -1)]).limit(limit).to_list(length=limit)
        
        return {"history": history}
    except Exception as e:
        print(f"History endpoint error: {e}")
        # Fallback without sorting if completed_at is missing
        try:
            history = await db.quizzes.find(
                {"user_id": current_user["user_id"], "completed": True},
                {"quiz_id": 1, "category": 1, "difficulty": 1, "score": 1, "correct_answers": 1}
            ).limit(limit).to_list(length=limit)
            return {"history": history}
        except Exception as e2:
            print(f"Fallback history error: {e2}")
            return {"history": []}

@app.get("/api/stats")
async def get_app_stats():
    total_users = await db.users.count_documents({})
    total_quizzes = await db.quizzes.count_documents({"completed": True})
    
    return {
        "total_users": total_users,
        "total_quizzes": total_quizzes,
        "app_name": "AI Quiz Pro",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)