# main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, User, Project, Match, Message
from pydantic import BaseModel
from typing import List, Optional
import datetime
import os
from dotenv import load_dotenv
from openai import OpenAI
import json

# Load environment variables from .env file
load_dotenv()
print("API Key:", os.getenv("OPENROUTER_API_KEY"))

from fastapi.middleware.cors import CORSMiddleware

# Create the FastAPI app instance
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Database Dependency ----------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------- Pydantic Models ----------
class UserOut(BaseModel):
    id: int
    name: str
    bio: Optional[str] = None
    skills_text: str
    availability: bool
    profile_pic_url: Optional[str] = None

    class Config:
        orm_mode = True

class ProjectOut(BaseModel):
    id: int
    title: str
    description: str
    required_skills: str
    owner_id: int
    team_members: Optional[List[str]] = []

    class Config:
        orm_mode = True

class ProjectCreate(BaseModel):
    title: str
    description: str
    required_skills: str
    owner_id: int

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[str] = None
    owner_id: Optional[int] = None

    class Config:
        orm_mode = True

class MatchRequest(BaseModel):
    goal: str
    user_id: int

class MatchResponse(BaseModel):
    matches: List[dict]
    suggested_roles: dict
    explanation: str

class ApproveRequest(BaseModel):
    user_id: int
    project_id: Optional[int] = None
    approved_matches: List[int]
    messages: dict

class UserCreate(BaseModel):
    name: str
    bio: Optional[str] = None
    skills_text: str
    availability: bool = True
    profile_pic_url: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    skills_text: Optional[str] = None
    availability: Optional[bool] = None
    profile_pic_url: Optional[str] = None

class MessageOut(BaseModel):
    id: int
    from_user: int
    to_user: int
    content: str
    drafted_by_ai: bool
    approved: bool
    created_at: str

    class Config:
        orm_mode = True

# ---------- OpenRouter Client ----------
# Initialize with API key from environment
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

# ---------- LLM-Powered Endpoint ----------
@app.post("/ai/match-llm")
async def match_with_llm(request: MatchRequest):
    """
    Enhanced AI endpoint using real LLM via OpenRouter
    """
    try:
        db = next(get_db())
        users = db.query(User).all()

        user_list = []
        for user in users:
            user_list.append(f"- {user.name}: {user.skills_text} - {user.bio or 'No bio'}")

        users_text = "\n".join(user_list)

        prompt = f"""You are an AI team-building assistant for a hackathon.

Available users:
{users_text}

User request: {request.goal}

Your task:
Analyze the User request. If it is a simple greeting (like 'hello'), a casual question, or off-topic, IGNORE the JSON requirement and simply reply back with a friendly conversational response in plain text.
HOWEVER, if the user is explicitly trying to build a team or describes a project goal, you MUST synthesize the data and return your response strictly in this JSON format:
{{
  "project_proposal": {{
    "title": "Catchy Project Title",
    "description": "Brief professional description of the goal",
    "required_skills": "Comma, separated, skills, needed"
  }},
  "matches": [
    {{
      "name": "user name",
      "skills": ["skill1", "skill2"],
      "explanation": "why they match",
      "draft_message": "Hi [name], I'm building a team..."
    }}
  ],
  "suggested_roles": {{
    "role": "person name"
  }},
  "summary": "brief overall explanation"
}}
"""

        # Use openrouter/free which automatically routes to a working free model
        completion = client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Hackathon Team Builder",
            },
            model="openrouter/free",  # This will pick a currently available free model
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant that returns JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=4000
        )

        result = completion.choices[0].message.content

        try:
            return json.loads(result)
        except:
            return {"response": result}

    except Exception as e:
        return {"error": str(e), "note": "Falling back to basic matching. Try again!"}

# ---------- Other Endpoints (unchanged) ----------
@app.get("/")
def root():
    return {"message": "Team Builder API is running. Go to /docs for interactive docs."}

@app.get("/users", response_model=List[UserOut])
def get_users(skill: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(User)
    if skill:
        query = query.filter(User.skills_text.ilike(f"%{skill}%"))
    return query.all()

@app.post("/users", response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = User(
        name=user.name,
        bio=user.bio,
        skills_text=user.skills_text,
        availability=user.availability,
        profile_pic_url=user.profile_pic_url
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}

@app.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
        
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/projects", response_model=ProjectOut)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    db_proj = Project(title=project.title, description=project.description, required_skills=project.required_skills, owner_id=project.owner_id)
    db.add(db_proj)
    db.commit()
    db.refresh(db_proj)
    return db_proj

@app.put("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, project_update: ProjectUpdate, db: Session = Depends(get_db)):
    db_proj = db.query(Project).filter(Project.id == project_id).first()
    if not db_proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_proj, key, value)
        
    db.commit()
    db.refresh(db_proj)
    return db_proj

@app.delete("/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    db_proj = db.query(Project).filter(Project.id == project_id).first()
    if not db_proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(db_proj)
    db.commit()
    return {"message": "Project deleted successfully"}

@app.get("/projects", response_model=List[ProjectOut])
def get_projects(skill: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Project)
    if skill:
        query = query.filter(Project.required_skills.ilike(f"%{skill}%"))
    projects = query.all()
    
    result = []
    for proj in projects:
        proj_dict = {
            "id": proj.id,
            "title": proj.title,
            "description": proj.description,
            "required_skills": proj.required_skills,
            "owner_id": proj.owner_id
        }
        # Find accepted matches securely targeting this exact project
        accepted_matches = db.query(Match).filter(Match.project_id == proj.id, Match.status == "accepted").all()
        team_members = []
        for m in accepted_matches:
            if m.user:
                team_members.append(m.user.name)
        proj_dict["team_members"] = team_members
        result.append(proj_dict)
        
    return result

@app.post("/ai/match", response_model=MatchResponse)
def ai_match(request: MatchRequest, db: Session = Depends(get_db)):
    goal = request.goal.lower()
    skill_keywords = ["react", "node", "python", "django", "backend", "frontend",
                      "pitch", "ui", "ux", "fintech", "java", "spring", "ml", "data"]
    required_skills = [s for s in skill_keywords if s in goal]
    if not required_skills:
        required_skills = ["react", "backend", "pitch"]

    from sqlalchemy import or_
    filters = [User.skills_text.ilike(f"%{skill}%") for skill in required_skills]
    users = db.query(User).filter(or_(*filters)).all()

    matches = []
    for user in users:
        user_skills = [s.strip().lower() for s in user.skills_text.split(',')]
        score = sum(1 for skill in required_skills if skill in user_skills) / len(required_skills)
        draft = f"Hi {user.name}, I'm building a team for a hackathon and noticed you have {user.skills_text}. Would you be interested?"
        matches.append({
            "user_id": user.id,
            "name": user.name,
            "skills": user_skills,
            "score": round(score, 2),
            "draft_message": draft
        })

    matches.sort(key=lambda x: x['score'], reverse=True)

    suggested_roles = {}
    assigned_users = set()
    for skill in required_skills:
        for m in matches:
            if m['user_id'] not in assigned_users and skill in m['skills']:
                suggested_roles[skill] = m['name']
                assigned_users.add(m['user_id'])
                break

    explanation = f"I found {len(matches)} potential candidates based on your request for {', '.join(required_skills)}. "
    if matches:
        explanation += f"Top match is {matches[0]['name']} with a score of {matches[0]['score']}."

    return MatchResponse(
        matches=matches,
        suggested_roles=suggested_roles,
        explanation=explanation
    )

@app.get("/messages", response_model=List[MessageOut])
def get_messages(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Message)
    if user_id:
        query = query.filter(Message.from_user == user_id)
    return query.all()

@app.delete("/messages/{message_id}")
def delete_message(message_id: int, db: Session = Depends(get_db)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    db.delete(msg)
    db.commit()
    return {"status": "Message revoked successfully"}

@app.post("/messages/approve")
def approve_messages(request: ApproveRequest, db: Session = Depends(get_db)):
    for user_id in request.approved_matches:
        msg_content = request.messages.get(str(user_id), "")
        msg = Message(
            from_user=request.user_id,
            to_user=user_id,
            content=msg_content,
            drafted_by_ai=True,
            approved=True,
            created_at=str(datetime.datetime.now())
        )
        db.add(msg)
        
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.availability = False
            
        if request.project_id:
            db_match = Match(user_id=user_id, project_id=request.project_id, score=1.0, status="accepted")
            db.add(db_match)
            
    db.commit()
    return {"status": "approved", "count": len(request.approved_matches)}