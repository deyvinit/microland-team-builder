import React, { useEffect, useState } from 'react';
import { db } from '../database';
import { Sun, Moon, MessageSquare, Users, Briefcase, Inbox, Edit2, Trash2, LogOut, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [profileToDelete, setProfileToDelete] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [projectQr, setProjectQr] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const syncAndLoad = async () => {
      try {
        // 1. Attempt to sync fresh data from the FastAPI Backend
        const [usersRes, projRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/users`),
          fetch(`${import.meta.env.VITE_API_URL}/projects`)
        ]);
        
        if (usersRes.ok && projRes.ok) {
           const users = await usersRes.json();
           const projects = await projRes.json();
           
           // 2. Overwrite Dexie cache with the new active API truth
           await db.profiles.clear();
           await db.projects.clear();
           
           await db.profiles.bulkAdd(users.map(u => ({
             id: u.id.toString(),
             name: u.name,
             skills: u.skills_text,
             availability: u.availability ? 'Available' : 'Busy',
             bio: u.bio || ''
           })));
           
           await db.projects.bulkAdd(projects.map(p => ({
             id: p.id.toString(),
             title: p.title,
             description: p.description,
             required_skills: p.required_skills,
             team_members: p.team_members || []
           })));
        }
      } catch (err) {
        console.warn("Backend unreachable. Falling back to offline Dexie.js cache.", err);
      }

      // 3. Always render from the Dexie Offline Database
      const cachedProfiles = await db.profiles.toArray();
      const cachedProjects = await db.projects.toArray();
      
      setProfiles(cachedProfiles);
      setProjects(cachedProjects);
    };
    syncAndLoad();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav-bar">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Briefcase size={24} color="var(--primary-color)" /> Team Builder
        </h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button 
            className="theme-toggle-btn" 
            onClick={() => setShowLogoutConfirm(true)} 
            aria-label="Logout"
            style={{ color: '#ef4444' }}
          >
            <LogOut size={20} />
          </button>
          <button className="btn-primary" style={{ marginTop: 0, padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)' }} onClick={() => navigate('/outbox')}>
            <Inbox size={18} /> Outbox
          </button>
          <button className="btn-primary" style={{ marginTop: 0, padding: '0.5rem 1rem' }} onClick={() => navigate('/chat')}>
            <MessageSquare size={18} /> AI Concierge
          </button>
        </div>
      </nav>

      <main className="page-container" style={{ flex: 1, width: '100%' }}>
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Briefcase size={20} color="var(--primary-color)" /> Active Projects
            </h3>
            <button onClick={() => navigate('/add-project')} style={{ background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-color)'; e.currentTarget.style.color = 'white'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary-color)'; }}>
              + Add Project
            </button>
          </div>
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {projects.map(proj => (
              <div key={proj.id} className="auth-card" style={{ padding: '1.5rem', width: 'auto', margin: 0, textAlign: 'left', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setProjectQr(proj)}
                    style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '0.4rem', borderRadius: '6px', color: 'var(--muted-text)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.borderColor = '#10b981'; }} 
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--muted-text)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <QrCode size={16} />
                  </button>
                  <button 
                    onClick={() => navigate(`/edit-project/${proj.id}`)}
                    style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '0.4rem', borderRadius: '6px', color: 'var(--muted-text)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.color = 'var(--primary-color)'; e.currentTarget.style.borderColor = 'var(--primary-color)'; }} 
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--muted-text)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setProjectToDelete(proj)}
                    style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '0.4rem', borderRadius: '6px', color: 'var(--muted-text)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }} 
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--muted-text)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1.2rem', paddingRight: '8.5rem', wordBreak: 'break-word', lineHeight: '1.3' }}>{proj.title}</h4>
                <p style={{ color: 'var(--muted-text)', fontSize: '0.95rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                  {proj.description}
                </p>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: proj.team_members?.length ? '0.8rem' : 0 }}>
                  Required: {proj.required_skills}
                </div>
                {proj.team_members && proj.team_members.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted-text)', marginBottom: '0.5rem' }}>Recruited Team</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {proj.team_members.map(member => (
                        <div key={member} style={{ background: 'var(--primary-color)', color: 'white', fontSize: '0.8rem', padding: '0.3rem 0.6rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 500 }}>
                          <Users size={12} /> {member}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Users size={20} color="var(--primary-color)" /> Available Profiles
            </h3>
            <button onClick={() => navigate('/add-profile')} style={{ background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-color)'; e.currentTarget.style.color = 'white'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary-color)'; }}>
              + Add Profile
            </button>
          </div>
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {profiles.map(prof => (
              <div key={prof.id} className="auth-card" style={{ padding: '1.5rem', width: 'auto', margin: 0, textAlign: 'left', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => navigate(`/edit-profile/${prof.id}`)}
                    style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '0.4rem', borderRadius: '6px', color: 'var(--muted-text)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.color = 'var(--primary-color)'; e.currentTarget.style.borderColor = 'var(--primary-color)'; }} 
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--muted-text)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setProfileToDelete(prof)}
                    style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '0.4rem', borderRadius: '6px', color: 'var(--muted-text)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }} 
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--muted-text)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1.2rem', paddingRight: '5rem' }}>{prof.name}</h4>
                <p style={{ color: 'var(--muted-text)', fontSize: '0.9rem', marginBottom: '1rem' }}>Availability: {prof.availability}</p>
                <div style={{ fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {prof.skills.split(',').map(s => (
                    <span key={s} style={{ background: 'var(--border-color)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                      {s.trim()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {projectQr && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="auth-card" style={{ width: '100%', maxWidth: '350px', padding: '2rem', textAlign: 'center', margin: 0, animation: 'fadeIn 0.2s ease-out' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', marginTop: 0 }}>Join Team</h3>
            <p style={{ color: 'var(--muted-text)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Scan to collaborate on <strong>{projectQr.title}</strong></p>
            
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1.5rem' }}>
              <QRCodeCanvas value={`microland://join/${projectQr.id}`} size={200} level="H" />
            </div>

            <button 
              onClick={() => setProjectQr(null)}
              style={{ width: '100%', padding: '0.8rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Done Scanning
            </button>
          </div>
        </div>
      )}

      {projectToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="auth-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center', margin: 0, animation: 'fadeIn 0.2s ease-out' }}>
            <Trash2 size={48} color="#ef4444" style={{ marginBottom: '1rem', opacity: 0.9 }} />
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', marginTop: 0 }}>Delete Project?</h3>
            <p style={{ color: 'var(--muted-text)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Are you sure you want to permanently disarm and remove <strong>{projectToDelete.title}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setProjectToDelete(null)}
                style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch(`${import.meta.env.VITE_API_URL}/projects/${projectToDelete.id}`, { method: 'DELETE' });
                    if(res.ok) window.location.reload();
                  } catch(err) { console.error("Deletion failed", err); }
                }}
                style={{ flex: 1, padding: '0.8rem', background: '#ef4444', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {profileToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="auth-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center', margin: 0, animation: 'fadeIn 0.2s ease-out' }}>
            <Trash2 size={48} color="#ef4444" style={{ marginBottom: '1rem', opacity: 0.9 }} />
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', marginTop: 0 }}>Delete Candidate?</h3>
            <p style={{ color: 'var(--muted-text)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Are you sure you want to permanently remove <strong>{profileToDelete.name}</strong> from your local database? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setProfileToDelete(null)}
                style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch(`${import.meta.env.VITE_API_URL}/users/${profileToDelete.id}`, { method: 'DELETE' });
                    if(res.ok) window.location.reload();
                  } catch(err) { console.error("Deletion failed", err); }
                }}
                style={{ flex: 1, padding: '0.8rem', background: '#ef4444', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="auth-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center', margin: 0, animation: 'fadeIn 0.2s ease-out' }}>
            <LogOut size={48} color="#ef4444" style={{ marginBottom: '1rem', opacity: 0.9 }} />
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', marginTop: 0 }}>Sign Out?</h3>
            <p style={{ color: 'var(--muted-text)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Are you sure you want to end your session? Your offline Dashboard cache will remain persistent until explicitly cleared.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('chat_history');
                  navigate('/login');
                }}
                style={{ flex: 1, padding: '0.8rem', background: '#ef4444', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
