import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, CheckCircle, Edit3 } from 'lucide-react';
import '../styles/Forms.css';

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
        .catch(() => setError("Failed to load existing profile."))
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
    <div className="form-page">
      <nav className="nav-bar">
        <button onClick={() => navigate('/dashboard')} className="form-nav__back-btn">
          <ArrowLeft size={20} /> Back
        </button>
        <h2 className="form-nav__title">
          <UserPlus size={24} color="var(--primary-color)" /> Add Profile
        </h2>
        <div className="form-nav__spacer" />
      </nav>

      <main className="page-container form-body">
        <form onSubmit={handleSubmit} className="auth-card form-card">

          <div className="form-header">
            <h3 className="form-header__title">{isEditMode ? 'Edit Profile' : 'New Candidate Tracker'}</h3>
            <p className="form-header__subtitle">{isEditMode ? 'Update candidate availability and skillset.' : 'Securely add a new freelancer or team member to your local hackathon database.'}</p>
          </div>

          {error && <div className="form-error">{error}</div>}

          {success ? (
            <div className="form-success">
              <CheckCircle size={48} />
              <h3 className="form-success__title">{isEditMode ? 'Profile Updated!' : 'Profile Committed!'}</h3>
              <p className="form-success__subtitle">Redirecting to Dashboard...</p>
            </div>
          ) : initialLoading ? (
             <div className="form-loading">Loading Profile...</div>
          ) : (
            <>
              <div>
                <label className="form-label">Full Name</label>
                <input required name="name" value={formData.name} onChange={handleChange} placeholder="e.g. John Doe" className="form-input" />
              </div>

              <div>
                <label className="form-label">Comma-separated Skills</label>
                <input required name="skills_text" value={formData.skills_text} onChange={handleChange} placeholder="e.g. React, Node.js, Fintech" className="form-input" />
              </div>

              <div>
                <label className="form-label">Short Bio</label>
                <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Experience, background, or notable achievements..." rows={3} className="form-textarea" />
              </div>

              <div className="form-checkbox-row">
                <input type="checkbox" name="availability" checked={formData.availability} onChange={handleChange} id="avail" className="form-checkbox" />
                <label htmlFor="avail" className="form-checkbox-label">Currently Available for Active Projects</label>
              </div>

              <button type="submit" disabled={loading} className="btn-primary form-submit">
                {loading ? 'Saving to Database...' : isEditMode ? <><Edit3 size={18} /> Update Profile</> : <><UserPlus size={18} /> Register Profile</>}
              </button>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
