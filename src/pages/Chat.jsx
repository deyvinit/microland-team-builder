import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Send, Bot, CheckCircle, XCircle, Bell, Edit2 } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import TinderCard from 'react-tinder-card';
import '../styles/Chat.css';

const generateSkillData = (candidateSkillsStr) => {
  const skills = candidateSkillsStr ? candidateSkillsStr.toLowerCase() : '';
  const score = (keywords) => {
    let pts = 0;
    keywords.forEach(kw => { if (skills.includes(kw)) pts += 1; });
    return Math.min(100, (pts * 40) + 20);
  };
  return [
    { subject: 'Frontend', A: score(['react', 'ui', 'ux', 'html', 'css', 'javascript', 'frontend']) },
    { subject: 'Backend', A: score(['node', 'python', 'django', 'backend', 'api', 'flask', 'java']) },
    { subject: 'Data/ML', A: score(['ml', 'data', 'sql', 'python', 'ai', 'analytics']) },
    { subject: 'Design', A: score(['figma', 'ui', 'ux', 'design', 'creative']) },
    { subject: 'Business', A: score(['pitch', 'fintech', 'management', 'agile', 'startup', 'strategy']) }
  ];
};

export default function Chat() {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [query, setQuery] = useState('');

  let touchTimer = null;
  const deleteMessage = (msgId) => {
    setMessageToDelete(msgId);
  };

  const confirmDelete = () => {
    if (messageToDelete) {
      setMessages(prev => prev.filter(m => m.id !== messageToDelete));
      setMessageToDelete(null);
    }
  };
  const handleTouchStart = (msgId) => {
    touchTimer = setTimeout(() => deleteMessage(msgId), 800);
  };
  const handleTouchEnd = () => {
    if (touchTimer) clearTimeout(touchTimer);
  };

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chat_history');
    if (saved) return JSON.parse(saved);
    return [{ id: Date.now(), text: "Hello! I'm your AI Concierge. What kind of team are you looking to build today?", sender: 'ai', type: 'text' }];
  });

  const [isTyping, setIsTyping] = useState(false);
  const [pushNotification, setPushNotification] = useState('');
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(messages));
  }, [messages]);

  const toggleListen = () => {
    if (isListening) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser or device.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setQuery('');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Microphone error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSend = async (manualQuery = query) => {
    if (!manualQuery.trim()) return;

    const userMessage = { id: Date.now(), text: manualQuery, sender: 'user', type: 'text' };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsTyping(true);

    const txt = document.getElementById('chat-input-area');
    if (txt) txt.style.height = 'auto';

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/match-llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: manualQuery, user_id: 1 })
      });
      const data = await response.json();
      setIsTyping(false);

      let parsedData = data;
      if (data.response && typeof data.response === 'string') {
        const raw = data.response;
        const firstBrace = raw.indexOf('{');
        const lastBrace = raw.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          try {
            parsedData = JSON.parse(raw.substring(firstBrace, lastBrace + 1));
          } catch (e) {
            console.error("Could not extract embedded JSON:", e);
          }
        }
      }

      if (parsedData.project_proposal && parsedData.matches && parsedData.matches.length > 0) {
        setMessages(prev => [...prev, {
          id: Date.now() + 50,
          sender: 'ai',
          type: 'project_proposal',
          project: parsedData.project_proposal,
          hiddenMatches: parsedData.matches,
          hiddenSummary: parsedData.summary,
          hiddenRoles: parsedData.suggested_roles || {},
          status: 'pending',
          isEditingProject: false
        }]);
      } else if (parsedData.matches && parsedData.matches.length > 0) {
        parsedData.matches.forEach((match, index) => {
          setMessages(prev => [...prev, {
            id: Date.now() + 1 + index,
            sender: 'ai',
            type: 'proposal',
            profile: { name: match.name, skills: Array.isArray(match.skills) ? match.skills.join(', ') : match.skills, projectId: 1 },
            reasoning: match.explanation || 'No explanation provided.',
            draftMessage: match.draft_message || match.draftMessage,
            status: 'pending',
            suggestedRoles: parsedData.suggested_roles || {}
          }]);
        });
        if (parsedData.summary) {
          setMessages(prev => [...prev, { id: Date.now() + 100, text: `Summary: ${parsedData.summary}`, sender: 'ai', type: 'text' }]);
        }
      } else {
        const errorText = parsedData.summary || parsedData.error || parsedData.response || data.response || "I couldn't find a matching candidate.";
        setMessages(prev => [...prev, { id: Date.now() + 1, text: errorText, sender: 'ai', type: 'text' }]);
      }
    } catch (error) {
      console.error("Match error:", error);
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now() + 1, text: "Error connecting to the AI backend. Is it running?", sender: 'ai', type: 'text' }]);
    }
  };

  const handleEditToggle = (msgId) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isEditingProject: !m.isEditingProject } : m));
  };

  const handleProjectFieldChange = (msgId, field, value) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return { ...m, project: { ...m.project, [field]: value } };
      }
      return m;
    }));
  };

  const handleProjectAction = async (msgId, actionType, project, hiddenMatches, hiddenSummary, hiddenRoles) => {
    if (actionType === 'approved') {
      try {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'approved' } : m));
        setIsTyping(true);
        const projRes = await fetch(`${import.meta.env.VITE_API_URL}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: project.title,
            description: project.description,
            required_skills: project.required_skills,
            owner_id: 1
          })
        });
        setIsTyping(false);
        let createdProjectId = 1;
        if (projRes.ok) {
          const newProj = await projRes.json();
          createdProjectId = newProj.id;
        }

        const unpackedProposals = hiddenMatches.map((match, index) => ({
          id: Date.now() + 100 + index,
          sender: 'ai',
          type: 'proposal',
          profile: { name: match.name, skills: Array.isArray(match.skills) ? match.skills.join(', ') : match.skills, projectId: createdProjectId },
          reasoning: match.explanation || 'No explanation provided.',
          draftMessage: match.draft_message || match.draftMessage,
          suggestedRoles: hiddenRoles,
          status: 'pending'
        }));

        setMessages(prev => [...prev,
          { id: Date.now() + 1, text: `Project '${project.title}' officially deployed to Dashboard. Finding matching talent now...`, sender: 'ai', type: 'text' },
          ...unpackedProposals
        ]);

        if (hiddenSummary) {
          setMessages(prev => [...prev, { id: Date.now() + 500, text: `Summary: ${hiddenSummary}`, sender: 'ai', type: 'text' }]);
        }

      } catch(e) {
        setIsTyping(false);
        console.error("Agentic project creation failed", e);
      }
    } else {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'rejected' } : m));
      setMessages(prev => [...prev, { id: Date.now() + 2, text: "Project discarded. Let me know if you want to approach this differently.", sender: 'ai', type: 'text' }]);
    }
  };

  const handleAction = async (msgId, actionType, profile, reasoning, draftMsg) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: actionType } : m));

    if (actionType === 'approved') {
      try {
        const usersResp = await fetch(`${import.meta.env.VITE_API_URL}/users`);
        const users = await usersResp.json();
        const matchedUser = users.find(u => u.name.toLowerCase() === profile.name.toLowerCase());
        const targetUserId = matchedUser ? matchedUser.id : 1;

        await fetch(`${import.meta.env.VITE_API_URL}/messages/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 1,
            profile_id: targetUserId,
            project_id: profile.projectId || 1,
            approved_matches: [targetUserId],
            messages: {
              [targetUserId]: draftMsg
            }
          })
        });
        setMessages(prev => [...prev, { id: Date.now() + 2, text: `Excellent choice. I've successfully dispatched your introduction to ${profile.name}. You can track this message or revoke it at any time from your Outbox.`, sender: 'ai', type: 'text' }]);

        setPushNotification(`Notification: Intro message successfully sent to ${profile.name}!`);
        setTimeout(() => setPushNotification(''), 4500);
      } catch (err) {
        console.error("Approve error", err);
        setMessages(prev => [...prev, { id: Date.now() + 2, text: "I apologize, but I encountered a network error while attempting to dispatch your message. Please check your connection and try again.", sender: 'ai', type: 'text' }]);
      }
    } else {
      const rejectText = profile && profile.name
        ? `Understood. I have cleared the match for ${profile.name} and cancelled the introduction. Let me know if you'd like to adjust your team requirements.`
        : "Understood. I have cleared this match and cancelled the introduction. Let me know if you'd like to adjust your team requirements.";
      setMessages(prev => [...prev, { id: Date.now() + 2, text: rejectText, sender: 'ai', type: 'text' }]);
    }
  };

  return (
    <div className="chat-page">

      {pushNotification && (
        <div className="push-notification">
          <Bell size={20} />
          {pushNotification}
        </div>
      )}

      <nav className="nav-bar">
        <button onClick={() => navigate('/dashboard')} className="chat-back-btn">
          <ArrowLeft size={20} /> <span className="hide-icon-text">Back</span>
        </button>
        <h2 className="chat-title">
          <Bot size={24} color="var(--primary-color)" /> <span className="hide-icon-text">AI Concierge</span>
        </h2>
        <button onClick={() => setShowClearConfirm(true)} className="chat-clear-btn">
          Clear All
        </button>
      </nav>

      <main className="page-container chat-body">
        <div className="chat-messages">
          {messages.map(msg => {
            if (msg.type === 'text') {
              return (
                <div
                  key={msg.id}
                  onContextMenu={(e) => { e.preventDefault(); deleteMessage(msg.id); }}
                  onTouchStart={() => handleTouchStart(msg.id)}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  className={`chat-bubble ${msg.sender === 'ai' ? 'chat-bubble--ai' : 'chat-bubble--user'}`}
                >
                  {msg.text}
                </div>
              );
            }

            if (msg.type === 'project_proposal') {
              return (
                <div
                  key={msg.id}
                  onContextMenu={(e) => { e.preventDefault(); deleteMessage(msg.id); }}
                  onTouchStart={() => handleTouchStart(msg.id)}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  className="chat-card"
                >
                  <div className="card-header card-header--relative">
                    {msg.status === 'pending' && (
                      <button onClick={() => handleEditToggle(msg.id)} className="card-edit-btn">
                        <Edit2 size={14} /> {msg.isEditingProject ? 'Save' : 'Edit'}
                      </button>
                    )}

                    <h3 className="card-header__title card-header__title--padded">
                      💼 {msg.isEditingProject ? 'Edit Project' : `Proposed Project: ${msg.project.title}`}
                    </h3>

                    {msg.isEditingProject ? (
                      <div className="card-edit-form">
                        <input
                          type="text"
                          value={msg.project.title}
                          onChange={(e) => handleProjectFieldChange(msg.id, 'title', e.target.value)}
                          className="card-edit-input"
                          placeholder="Project Title"
                        />
                        <textarea
                          value={msg.project.description}
                          onChange={(e) => handleProjectFieldChange(msg.id, 'description', e.target.value)}
                          className="card-edit-textarea"
                          placeholder="Project Description"
                        />
                      </div>
                    ) : (
                      <p className="card-header__description">{msg.project.description}</p>
                    )}
                  </div>

                  <div className="card-info">
                    <strong>🛠️ Required Skills Identified:</strong><br />
                    {msg.isEditingProject ? (
                        <input
                          type="text"
                          value={msg.project.required_skills}
                          onChange={(e) => handleProjectFieldChange(msg.id, 'required_skills', e.target.value)}
                          className="card-info__skills-input"
                          placeholder="Comma-separated skills..."
                        />
                    ) : (
                        <span className="card-info__highlight">{msg.project.required_skills}</span>
                    )}
                  </div>

                  {msg.status === 'pending' ? (
                    <div className="card-actions">
                       <p className="card-actions__hint">
                         {msg.isEditingProject ? 'Save your changes above before launching!' : 'Should I launch this project and draft invitations to suitable candidates?'}
                       </p>
                       <div className="card-actions__row">
                        <button
                          onClick={() => handleProjectAction(msg.id, 'approved', msg.project, msg.hiddenMatches, msg.hiddenSummary, msg.hiddenRoles)}
                          disabled={msg.isEditingProject}
                          className={`btn-launch ${msg.isEditingProject ? 'btn-launch--disabled' : 'btn-launch--active'}`}
                        >
                          <CheckCircle size={18} /> Launch Project & Find Team
                        </button>
                        <button
                          onClick={() => handleProjectAction(msg.id, 'rejected')}
                          className="btn-reject"
                        >
                          <XCircle size={18} /> Discard
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`card-status ${msg.status === 'approved' ? 'card-status--approved' : 'card-status--rejected'}`}>
                      {msg.status === 'approved' ? '✅ Project Launched' : '❌ Project Discarded'}
                    </div>
                  )}
                </div>
              );
            }

            if (msg.type === 'proposal') {
              const radarData = generateSkillData(msg.profile.skills);

              const cardContent = (
                <div
                  onContextMenu={(e) => { e.preventDefault(); deleteMessage(msg.id); }}
                  onTouchStart={() => handleTouchStart(msg.id)}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  className={`proposal-card ${msg.status === 'pending' ? 'proposal-card--pending' : ''}`}
                >
                  <div className="card-header">
                    <h3 className="card-header__title">
                      👤 {msg.profile.name}
                    </h3>
                    <p className="card-header__subtitle">
                      <strong style={{ color: 'var(--text-color)' }}>Skills:</strong> {msg.profile.skills}
                    </p>
                  </div>

                  <div className="radar-chart-container">
                     <strong className="radar-chart-title">📊 Skill Synergy</strong>
                     <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                          <PolarGrid stroke="var(--border-color)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-color)', fontSize: 11 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Candidate" dataKey="A" stroke="var(--primary-color)" fill="var(--primary-color)" fillOpacity={0.4} />
                        </RadarChart>
                     </ResponsiveContainer>
                  </div>

                  <div className="card-info">
                    <strong>🧠 AI Explanation:</strong><br />
                    {msg.reasoning}
                  </div>

                  {msg.suggestedRoles && Object.entries(msg.suggestedRoles).some(([role, name]) => name === msg.profile.name) && (
                    <div className="card-info">
                      <strong>✨ Suggested Role:</strong><br />
                      {Object.entries(msg.suggestedRoles)
                        .filter(([role, name]) => name === msg.profile.name)
                        .map(([role]) => (
                          <span key={role} className="card-role">{role}</span>
                      ))}
                    </div>
                  )}

                  {msg.draftMessage && (
                    <div className="card-draft">
                      <strong>📝 Draft Message:</strong><br /><br />
                      <span style={{ whiteSpace: 'pre-wrap' }}>{msg.draftMessage}</span>
                    </div>
                  )}

                  {msg.status === 'pending' ? (
                    <div className="card-actions">
                      <p className="card-actions__hint">
                        Swipe <strong>Right</strong> to Approve, Swipe <strong>Left</strong> to Reject
                      </p>
                      <div className="card-actions__row">
                        <button
                          onClick={() => handleAction(msg.id, 'approved', msg.profile, msg.reasoning, msg.draftMessage)}
                          className="btn-approve"
                        >
                          <CheckCircle size={18} /> Approve
                        </button>
                        <button
                          onClick={() => handleAction(msg.id, 'rejected')}
                          className="btn-reject"
                        >
                          <XCircle size={18} /> Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`card-status ${msg.status === 'approved' ? 'card-status--approved' : 'card-status--rejected'}`}>
                      {msg.status === 'approved' ? '✅ Action Approved' : '❌ Action Rejected'}
                    </div>
                  )}
                </div>
              );

              return (
                <div key={msg.id} className="swipe-wrapper">
                  {msg.status === 'pending' ? (
                    <TinderCard
                      onSwipe={(dir) => {
                        if (dir === 'right') handleAction(msg.id, 'approved', msg.profile, msg.reasoning, msg.draftMessage);
                        else if (dir === 'left') handleAction(msg.id, 'rejected', msg.profile, msg.reasoning, msg.draftMessage);
                      }}
                      preventSwipe={['up', 'down']}
                      className="swipe-card"
                    >
                      {cardContent}
                    </TinderCard>
                  ) : (
                    cardContent
                  )}
                </div>
              );
            }
            return null;
          })}

          {isTyping && (
            <div className="chat-skeleton">
              <div className="skeleton-header">
                <div className="skeleton-pulse skeleton-avatar"></div>
                <div className="skeleton-pulse skeleton-title"></div>
              </div>
              <div className="skeleton-pulse skeleton-line skeleton-line--full"></div>
              <div className="skeleton-pulse skeleton-line skeleton-line--90"></div>
              <div className="skeleton-pulse skeleton-line skeleton-line--70"></div>
            </div>
          )}

          {isListening && (
            <div className="listening-indicator">
              <div className="listening-indicator__circle">
                <Mic size={40} />
              </div>
              <span className="listening-indicator__text">Listening... Speak now</span>
            </div>
          )}
        </div>

        <div className="chat-input-bar">
          <button onClick={toggleListen} className={`chat-mic-btn ${isListening ? 'chat-mic-btn--active' : 'chat-mic-btn--inactive'}`}>
            <Mic size={20} />
          </button>

          <textarea
            id="chat-input-area"
            placeholder="Type your goal... (e.g. 'Build my fintech team')"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(query);
              }
            }}
            rows={1}
            className="chat-textarea"
          />

          <button
            onClick={() => handleSend(query)}
            className={`chat-send-btn ${query.length > 0 ? 'chat-send-btn--active' : 'chat-send-btn--inactive'}`}
          >
            <Send size={20} />
          </button>
        </div>
      </main>

      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="auth-card modal-card">
            <h3 className="modal-card__title">Clear All Chat History?</h3>
            <p className="modal-card__text">
              Are you sure you want to permanently delete your entire conversation history with the AI Concierge?
            </p>
            <div className="modal-actions">
              <button onClick={() => setShowClearConfirm(false)} className="btn-cancel">
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('chat_history');
                  setMessages([{ id: Date.now(), text: "Hello! I'm your AI Concierge. What kind of team are you looking to build today?", sender: 'ai', type: 'text' }]);
                  setShowClearConfirm(false);
                }}
                className="btn-danger"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {messageToDelete && (
        <div className="modal-overlay">
          <div className="auth-card modal-card">
            <XCircle size={48} color="#ef4444" className="modal-card__icon" />
            <h3 className="modal-card__title">Delete Message?</h3>
            <p className="modal-card__text">
              Are you sure you want to permanently remove this message from your chat history?
            </p>
            <div className="modal-actions">
              <button onClick={() => setMessageToDelete(null)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={confirmDelete} className="btn-danger">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
