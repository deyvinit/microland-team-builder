import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, CheckCircle, Edit3 } from 'lucide-react';
import '../styles/Forms.css';

export default function AddProject() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    required_skills: '',
    owner_id: 1
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      fetch(`${import.meta.env.VITE_API_URL}/projects`)
        .then(res => res.json())
        .then(projects => {
          const proj = projects.find(p => p.id.toString() === id);
          if (proj) {
            setFormData({
              title: proj.title,
              description: proj.description || '',
              required_skills: proj.required_skills,
              owner_id: proj.owner_id
            });
          }
        })
        .catch(() => setError("Failed to load existing project."))
        .finally(() => setInitialLoading(false));
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEditMode
        ? `${import.meta.env.VITE_API_URL}/projects/${id}`
        : `${import.meta.env.VITE_API_URL}/projects`;

      const res = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error("Failed to secure project entry on the backend.");

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
          <Briefcase size={24} color="var(--primary-color)" /> Project Board
        </h2>
        <div className="form-nav__spacer" />
      </nav>

      <main className="page-container form-body">
        <form onSubmit={handleSubmit} className="auth-card form-card">

          <div className="form-header">
            <h3 className="form-header__title">{isEditMode ? 'Edit Project' : 'New Project Mission'}</h3>
            <p className="form-header__subtitle">{isEditMode ? 'Update project scope and required skills.' : 'Launch a new hackathon initiative for candidates to discover.'}</p>
          </div>

          {error && <div className="form-error">{error}</div>}

          {success ? (
            <div className="form-success">
              <CheckCircle size={48} />
              <h3 className="form-success__title">{isEditMode ? 'Scope Updated!' : 'Project Launched!'}</h3>
              <p className="form-success__subtitle">Redirecting to Dashboard...</p>
            </div>
          ) : initialLoading ? (
             <div className="form-loading">Loading Project...</div>
          ) : (
            <>
              <div>
                <label className="form-label">Project Title</label>
                <input required name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Fintech AI App" className="form-input" />
              </div>

              <div>
                <label className="form-label">Required Skills</label>
                <input required name="required_skills" value={formData.required_skills} onChange={handleChange} placeholder="e.g. React, Node.js, Fintech" className="form-input" />
              </div>

              <div>
                <label className="form-label">Project Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="What is the active goal or objective?..." rows={4} className="form-textarea" />
              </div>

              <button type="submit" disabled={loading} className="btn-primary form-submit">
                {loading ? 'Committing to Fleet...' : isEditMode ? <><Edit3 size={18} /> Update Project</> : <><Briefcase size={18} /> Launch Project</>}
              </button>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
