# database.py
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Text, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# SQLite database file (will be created in the same folder)
DATABASE_URL = "sqlite:///./team_builder.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Define tables
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    bio = Column(Text, nullable=True)
    skills_text = Column(String)  # comma-separated skills, e.g., "React, Python, UI"
    availability = Column(Boolean, default=True)
    profile_pic_url = Column(String, nullable=True)

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    required_skills = Column(String)  # comma-separated
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User")

class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("projects.id"))
    score = Column(Float)
    status = Column(String, default="pending")  # pending, accepted, rejected
    user = relationship("User")
    project = relationship("Project")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    from_user = Column(Integer, ForeignKey("users.id"))
    to_user = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    drafted_by_ai = Column(Boolean, default=False)
    approved = Column(Boolean, default=False)
    created_at = Column(String)  # store as text for simplicity

# Create all tables in the database
Base.metadata.create_all(bind=engine)

print("✅ Database tables created successfully!")