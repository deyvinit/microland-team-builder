# seed.py
from database import SessionLocal, User, Project

db = SessionLocal()

# Clear existing data (optional, but good for fresh start)
db.query(User).delete()
db.query(Project).delete()

# Add users with Indian names
users = [
    User(name="Aarav Sharma", skills_text="React, Node, Fintech", bio="Frontend dev with fintech experience", availability=True),
    User(name="Iyer Venkatesh", skills_text="Python, Django, Backend", bio="Backend expert", availability=True),
    User(name="Priya Kapoor", skills_text="Pitch, Marketing, UI", bio="Can pitch anything", availability=True),
    User(name="Ananya Desai", skills_text="React, UI/UX", bio="Design + frontend", availability=False),
    User(name="Rahul Verma", skills_text="Java, Spring, Backend", bio="Experienced in enterprise apps", availability=True),
    User(name="Sneha Reddy", skills_text="Data Science, Python, ML", bio="Can handle data and models", availability=True),
]
db.add_all(users)
db.commit()

# Add a project (owner_id = 1 is Aarav Sharma)
project = Project(
    title="Fintech Hackathon Team",
    description="Looking for React, backend, and pitch people",
    required_skills="React, backend, pitch",
    owner_id=1  # Aarav Sharma owns this project
)
db.add(project)
db.commit()

print("✅ Sample data added!")