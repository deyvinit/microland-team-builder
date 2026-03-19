import Dexie from 'dexie';

// Initialize the database
export const db = new Dexie('TeamBuilderDatabase');

// Define the schema
// id is the primary key, others are indexed attributes for faster querying
db.version(1).stores({
  profiles: 'id, name, skills, availability',
  projects: 'id, title, description, required_skills',
  matches: 'id, profile_id, project_id, status, ai_reasoning, drafted_message'
});

export default db;
