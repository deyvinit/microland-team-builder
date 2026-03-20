import React, { useEffect, useState } from 'react';
import { db } from '../database';
import { Sun, Moon, MessageSquare, Users, Briefcase, Inbox, Edit2, Trash2, LogOut, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';
import '../styles/Chat.css';

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
        const [usersRes, projRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/users`),
          fetch(`${import.meta.env.VITE_API_URL}/projects`)
        ]);

        if (usersRes.ok && projRes.ok) {
           const users = await usersRes.json();
           const projects = await projRes.json();

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

      const cachedProfiles = await db.profiles.toArray();
      const cachedProjects = await db.projects.toArray();

      setProfiles(cachedProfiles);
      setProjects(cachedProjects);
    };
    syncAndLoad();
  }, []);

  return (
    <div className="dashboard-page">
      <nav className="nav-bar">
        <h2 className="dashboard-nav__title">
          <Briefcase size={24} color="var(--primary-color)" /> <span className="hide-icon-text">Team Builder</span>
        </h2>
        <div className="dashboard-nav__actions">
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button
            className="theme-toggle-btn dashboard-nav__logout"
            onClick={() => setShowLogoutConfirm(true)}
            aria-label="Logout"
          >
            <LogOut size={20} />
          </button>
          <button className="btn-primary dashboard-nav__outbox-btn" onClick={() => navigate('/outbox')}>
            <Inbox size={18} /> <span className="hide-icon-text">Outbox</span>
          </button>
          <button className="btn-primary dashboard-nav__ai-btn" onClick={() => navigate('/chat')}>
            <MessageSquare size={18} /> <span className="hide-icon-text">AI Concierge</span>
          </button>
        </div>
      </nav>

      <main className="page-container dashboard-body">
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h3 className="dashboard-section__title">
              <Briefcase size={20} color="var(--primary-color)" /> Active Projects
            </h3>
            <button onClick={() => navigate('/add-project')} className="dashboard-section__add-btn">
              + Add Project
            </button>
          </div>
          <div className="dashboard-grid">
            {projects.map(proj => (
              <div key={proj.id} className="auth-card dashboard-card">
                <div className="dashboard-card__actions">
                  <button
                    onClick={() => setProjectQr(proj)}
                    className="dashboard-card__action-btn"
                    onMouseOver={(e) => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.borderColor = '#10b981'; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--muted-text)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <QrCode size={16} />
                  </button>
                  <button
                    onClick={() => navigate(`/edit-project/${proj.id}`)}
                    className="dashboard-card__action-btn"
                    onMouseOver={(e) => { e.currentTarget.style.color = 'var(--primary-color)'; e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--muted-text)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setProjectToDelete(proj)}
                    className="dashboard-card__action-btn"
                    onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--muted-text)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h4 className="dashboard-card__project-title">{proj.title}</h4>
                <p className="dashboard-card__description">{proj.description}</p>
                <div className="dashboard-card__skills" style={{ marginBottom: proj.team_members?.length ? '0.8rem' : 0 }}>
                  Required: {proj.required_skills}
                </div>
                {proj.team_members && proj.team_members.length > 0 && (
                  <div className="dashboard-card__team-section">
                    <div className="dashboard-card__team-label">Recruited Team</div>
                    <div className="dashboard-card__team-list">
                      {proj.team_members.map(member => (
                        <div key={member} className="dashboard-card__team-badge">
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
          <div className="dashboard-section__header">
            <h3 className="dashboard-section__title">
              <Users size={20} color="var(--primary-color)" /> Available Profiles
            </h3>
            <button onClick={() => navigate('/add-profile')} className="dashboard-section__add-btn">
              + Add Profile
            </button>
          </div>
          <div className="dashboard-grid">
            {profiles.map(prof => (
              <div key={prof.id} className="auth-card dashboard-card">
                <div className="dashboard-card__actions">
                  <button
                    onClick={() => navigate(`/edit-profile/${prof.id}`)}
                    className="dashboard-card__action-btn"
                    onMouseOver={(e) => { e.currentTarget.style.color = 'var(--primary-color)'; e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--muted-text)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setProfileToDelete(prof)}
                    className="dashboard-card__action-btn"
                    onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--muted-text)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h4 className="dashboard-card__profile-name">{prof.name}</h4>
                <p className="dashboard-card__availability">Availability: {prof.availability}</p>
                <div className="dashboard-card__skill-tags">
                  {prof.skills.split(',').map(s => (
                    <span key={s} className="dashboard-card__skill-tag">{s.trim()}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {projectQr && (
        <div className="modal-overlay">
          <div className="auth-card modal-card">
            <h3 className="qr-modal__title">Join Team</h3>
            <p className="qr-modal__subtitle">Scan to collaborate on <strong>{projectQr.title}</strong></p>
            <div className="qr-modal__canvas">
              <QRCodeCanvas value={`microland://join/${projectQr.id}`} size={200} level="H" />
            </div>
            <button onClick={() => setProjectQr(null)} className="qr-modal__done-btn">
              Done Scanning
            </button>
          </div>
        </div>
      )}

      {projectToDelete && (
        <div className="modal-overlay">
          <div className="auth-card modal-card">
            <Trash2 size={48} color="#ef4444" className="modal-card__icon" />
            <h3 className="modal-card__title">Delete Project?</h3>
            <p className="modal-card__text">
              Are you sure you want to permanently disarm and remove <strong>{projectToDelete.title}</strong>? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button onClick={() => setProjectToDelete(null)} className="btn-cancel">
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${import.meta.env.VITE_API_URL}/projects/${projectToDelete.id}`, { method: 'DELETE' });
                    if(res.ok) window.location.reload();
                  } catch(err) { console.error("Deletion failed", err); }
                }}
                className="btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {profileToDelete && (
        <div className="modal-overlay">
          <div className="auth-card modal-card">
            <Trash2 size={48} color="#ef4444" className="modal-card__icon" />
            <h3 className="modal-card__title">Delete Candidate?</h3>
            <p className="modal-card__text">
              Are you sure you want to permanently remove <strong>{profileToDelete.name}</strong> from your local database? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button onClick={() => setProfileToDelete(null)} className="btn-cancel">
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${import.meta.env.VITE_API_URL}/users/${profileToDelete.id}`, { method: 'DELETE' });
                    if(res.ok) window.location.reload();
                  } catch(err) { console.error("Deletion failed", err); }
                }}
                className="btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="auth-card modal-card">
            <LogOut size={48} color="#ef4444" className="modal-card__icon" />
            <h3 className="modal-card__title">Sign Out?</h3>
            <p className="modal-card__text">
              Are you sure you want to end your session? Your offline Dashboard cache will remain persistent until explicitly cleared.
            </p>
            <div className="modal-actions">
              <button onClick={() => setShowLogoutConfirm(false)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={() => { navigate('/login'); }} className="btn-danger">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
