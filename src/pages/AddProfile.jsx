import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, CheckCircle, Edit3 } from 'lucide-react';

export default function AddProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    skills_text: '',
    availability: true
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      fetch(`${import.meta.env.VITE_API_URL}/users`)
        .then(res => res.json())
        .then(users => {
          const user = users.find(u => u.id.toString() === id);
          if (user) {
            setFormData({
              name: user.name,
              bio: user.bio || '',
              skills_text: user.skills_text,
              availability: user.availability
            });
          }
        })
        .catch(err => setError("Failed to load existing profile."))
        .finally(() => setInitialLoading(false));
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const url = isEditMode 
        ? `${import.meta.env.VITE_API_URL}/users/${id}` 
        : `${import.meta.env.VITE_API_URL}/users`;
        
      const res = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error("Failed to secure profile entry on the backend.");
      
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav-bar">
        <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
          <ArrowLeft size={20} /> Back
        </button>
        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={24} color="var(--primary-color)" /> Add Profile
        </h2>
        <div style={{ width: 60 }} />
      </nav>

      <main className="page-container" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '2rem', paddingBottom: '2rem' }}>
        <form onSubmit={handleSubmit} className="auth-card" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', margin: 0 }}>
          
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{isEditMode ? 'Edit Profile' : 'New Candidate Tracker'}</h3>
            <p style={{ color: 'var(--muted-text)', fontSize: '0.9rem', marginTop: '0.5rem' }}>{isEditMode ? 'Update candidate availability and skillset.' : 'Securely add a new freelancer or team member to your local hackathon database.'}</p>
          </div>

          {error && <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}
          
          {success ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 0', color: '#10b981' }}>
              <CheckCircle size={48} />
              <h3 style={{ margin: 0 }}>{isEditMode ? 'Profile Updated!' : 'Profile Committed!'}</h3>
              <p style={{ color: 'var(--muted-text)', fontSize: '0.9rem' }}>Redirecting to Dashboard...</p>
            </div>
          ) : initialLoading ? (
             <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-text)' }}>Loading Profile...</div>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Full Name</label>
                <input required name="name" value={formData.name} onChange={handleChange} placeholder="e.g. John Doe" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '1rem', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Comma-separated Skills</label>
                <input required name="skills_text" value={formData.skills_text} onChange={handleChange} placeholder="e.g. React, Node.js, Fintech" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '1rem', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Short Bio</label>
                <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Experience, background, or notable achievements..." rows={3} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '1rem', resize: 'none', outline: 'none', fontFamily: 'inherit' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <input type="checkbox" name="availability" checked={formData.availability} onChange={handleChange} id="avail" style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }} />
                <label htmlFor="avail" style={{ fontSize: '0.95rem', cursor: 'pointer' }}>Currently Available for Active Projects</label>
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '1rem', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 600, transition: 'all 0.2s' }}>
                {loading ? 'Saving to Database...' : isEditMode ? <><Edit3 size={18} /> Update Profile</> : <><UserPlus size={18} /> Register Profile</>}
              </button>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
