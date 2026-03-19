import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Send, Bot, CheckCircle, XCircle, Bell, Edit2 } from 'lucide-react';

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
  
  // Initialize from LocalStorage or Fallback to Default Welcome Message
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chat_history');
    if (saved) return JSON.parse(saved);
    return [{ id: Date.now(), text: "Hello! I'm your AI Concierge. What kind of team are you looking to build today?", sender: 'ai', type: 'text' }];
  });
  
  const [isTyping, setIsTyping] = useState(false);
  const [pushNotification, setPushNotification] = useState('');
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Persist messages to LocalStorage whenever they update
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
      setQuery(''); // Clear field so they see it transcribing
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
    
    // Auto-reset textarea height after dispatched
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
      // If the backend returned a raw string because of markdown wrapper, safely extract the JSON
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
        // Enqueue a custom Project Proposal UI block, caching the hidden matches
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
        // Fallback if no project proposal was generated
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

        // Now unleash the hidden matches!
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

        // Included profile_id and project_id correctly
        await fetch(`${import.meta.env.VITE_API_URL}/messages/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 1, 
            profile_id: targetUserId,
            project_id: profile.projectId || 1, // Dynamic mapping to auto-created project
            approved_matches: [targetUserId],
            messages: {
              [targetUserId]: draftMsg
            }
          })
        });
        setMessages(prev => [...prev, { id: Date.now() + 2, text: `Excellent choice. I've successfully dispatched your introduction to ${profile.name}. You can track this message or revoke it at any time from your Outbox.`, sender: 'ai', type: 'text' }]);
        
        // Trigger generic simulated push notification
        setPushNotification(`Notification: Intro message successfully sent to ${profile.name}!`);
        setTimeout(() => setPushNotification(''), 4500);
      } catch (err) {
        console.error("Approve error", err);
        setMessages(prev => [...prev, { id: Date.now() + 2, text: "I apologize, but I encountered a network error while attempting to dispatch your message. Please check your connection and try again.", sender: 'ai', type: 'text' }]);
      }
    } else {
      setMessages(prev => [...prev, { id: Date.now() + 2, text: "Understood. I have cleared this match and cancelled the introduction. Let me know if you'd like to adjust your team requirements.", sender: 'ai', type: 'text' }]);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {pushNotification && (
        <div style={{ position: 'fixed', top: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary-color)', color: 'white', padding: '1rem 2rem', borderRadius: '12px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '0.8rem', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)', fontWeight: 600 }}>
          <Bell size={20} />
          {pushNotification}
        </div>
      )}

      <nav className="nav-bar">
        <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)' }}>
          <ArrowLeft size={20} /> <span className="hide-icon-text">Back</span>
        </button>
        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bot size={24} color="var(--primary-color)" /> <span className="hide-icon-text">AI Concierge</span>
        </h2>
        <button 
          onClick={() => setShowClearConfirm(true)} 
          style={{ color: 'var(--muted-text)', fontSize: '0.85rem', background: 'transparent', border: '1px solid var(--border-color)', padding: '0.4rem 0.8rem', borderRadius: '4px' }}
        >
          Clear All
        </button>
      </nav>

      <main className="page-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
          {messages.map(msg => {
            if (msg.type === 'text') {
              return (
                <div 
                  key={msg.id} 
                  onContextMenu={(e) => { e.preventDefault(); deleteMessage(msg.id); }}
                  onTouchStart={() => handleTouchStart(msg.id)}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  style={{ 
                  alignSelf: msg.sender === 'ai' ? 'flex-start' : 'flex-end',
                  background: msg.sender === 'ai' ? 'var(--card-bg)' : 'var(--primary-color)',
                  color: msg.sender === 'ai' ? 'var(--text-color)' : '#fff',
                  padding: '1rem 1.5rem',
                  borderRadius: '24px',
                  borderBottomLeftRadius: msg.sender === 'ai' ? '4px' : '24px',
                  borderBottomRightRadius: msg.sender === 'user' ? '4px' : '24px',
                  border: msg.sender === 'ai' ? '1px solid var(--border-color)' : 'none',
                  maxWidth: '80%',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
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
                  style={{
                  alignSelf: 'flex-start',
                  background: 'var(--card-bg)',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  maxWidth: '90%',
                  width: '500px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ background: 'var(--bg-color)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1rem', borderTop: '4px solid var(--primary-color)', position: 'relative' }}>
                    {msg.status === 'pending' && (
                      <button 
                        onClick={() => handleEditToggle(msg.id)}
                        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        <Edit2 size={14} /> {msg.isEditingProject ? 'Save' : 'Edit'}
                      </button>
                    )}
                    
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.4rem', paddingRight: '4rem' }}>
                      💼 {msg.isEditingProject ? 'Edit Project' : `Proposed Project: ${msg.project.title}`}
                    </h3>
                    
                    {msg.isEditingProject ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                        <input 
                          type="text" 
                          value={msg.project.title} 
                          onChange={(e) => handleProjectFieldChange(msg.id, 'title', e.target.value)}
                          style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)', width: '100%', fontSize: '0.95rem' }}
                          placeholder="Project Title"
                        />
                        <textarea 
                          value={msg.project.description} 
                          onChange={(e) => handleProjectFieldChange(msg.id, 'description', e.target.value)}
                          style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)', width: '100%', minHeight: '80px', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical' }}
                          placeholder="Project Description"
                        />
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--muted-text)', lineHeight: '1.5' }}>
                        {msg.project.description}
                      </p>
                    )}
                  </div>
                  
                  <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-color)' }}>
                    <strong>🛠️ Required Skills Identified:</strong><br />
                    {msg.isEditingProject ? (
                        <input 
                          type="text" 
                          value={msg.project.required_skills} 
                          onChange={(e) => handleProjectFieldChange(msg.id, 'required_skills', e.target.value)}
                          style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)', width: '100%', marginTop: '0.5rem', fontSize: '0.85rem' }}
                          placeholder="Comma-separated skills..."
                        />
                    ) : (
                        <span style={{ color: 'var(--primary-color)', fontWeight: 500, display: 'block', marginTop: '0.2rem' }}>{msg.project.required_skills}</span>
                    )}
                  </div>

                  {msg.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                       <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted-text)', textAlign: 'center' }}>
                         {msg.isEditingProject ? 'Save your changes above before launching!' : 'Should I launch this project and draft invitations to suitable candidates?'}
                       </p>
                       <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                          onClick={() => handleProjectAction(msg.id, 'approved', msg.project, msg.hiddenMatches, msg.hiddenSummary, msg.hiddenRoles)}
                          disabled={msg.isEditingProject}
                          style={{ flex: 1, padding: '0.8rem', background: msg.isEditingProject ? 'var(--border-color)' : 'var(--primary-color)', color: msg.isEditingProject ? 'var(--muted-text)' : 'white', border: 'none', borderRadius: '8px', cursor: msg.isEditingProject ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 600, transition: 'all 0.2s' }}
                        >
                          <CheckCircle size={18} /> Launch Project & Find Team
                        </button>
                        <button 
                          onClick={() => handleProjectAction(msg.id, 'rejected')}
                          style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                        >
                          <XCircle size={18} /> Discard
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: msg.status === 'approved' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {msg.status === 'approved' ? '✅ Project Launched' : '❌ Project Discarded'}
                    </div>
                  )}
                </div>
              );
            }

            if (msg.type === 'proposal') {
              return (
                <div 
                  key={msg.id} 
                  onContextMenu={(e) => { e.preventDefault(); deleteMessage(msg.id); }}
                  onTouchStart={() => handleTouchStart(msg.id)}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  style={{
                  alignSelf: 'flex-start',
                  background: 'var(--card-bg)',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  maxWidth: '90%',
                  width: '500px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  {/* Specific Candidate Card UI */}
                  <div style={{ background: 'var(--bg-color)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1rem', borderTop: '4px solid var(--primary-color)' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)' }}>
                      👤 {msg.profile.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--muted-text)' }}>
                      <strong style={{ color: 'var(--text-color)' }}>Skills:</strong> {msg.profile.skills}
                    </p>
                  </div>
                  
                  {/* The 'Why' Factor rendered from API explanation */}
                  <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-color)' }}>
                    <strong>🧠 AI Explanation:</strong><br />
                    {msg.reasoning}
                  </div>

                  {/* Suggested Roles filtered for this specific candidate */}
                  {msg.suggestedRoles && Object.entries(msg.suggestedRoles).some(([role, name]) => name === msg.profile.name) && (
                    <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-color)' }}>
                      <strong>✨ Suggested Role:</strong><br />
                      {Object.entries(msg.suggestedRoles)
                        .filter(([role, name]) => name === msg.profile.name)
                        .map(([role]) => (
                          <span key={role} style={{ display: 'block', marginTop: '0.2rem', color: 'var(--primary-color)', fontWeight: 500 }}>{role}</span>
                      ))}
                    </div>
                  )}
                  
                  {/* The Draft Message */}
                  {msg.draftMessage && (
                    <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-color)', borderLeft: '4px solid var(--primary-color)' }}>
                      <strong>📝 Draft Message:</strong><br /><br />
                      <span style={{ whiteSpace: 'pre-wrap' }}>{msg.draftMessage}</span>
                    </div>
                  )}

                  {/* The Approval Gate Buttons aligned to POST structure */}
                  {msg.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button 
                        onClick={() => handleAction(msg.id, 'approved', msg.profile, msg.reasoning, msg.draftMessage)}
                        style={{ flex: 1, padding: '0.8rem', background: '#10b981', color: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                      >
                        <CheckCircle size={18} /> Approve & Send
                      </button>
                      <button 
                        onClick={() => handleAction(msg.id, 'rejected')}
                        style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                      >
                        <XCircle size={18} /> Reject
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: msg.status === 'approved' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {msg.status === 'approved' ? '✅ Action Approved' : '❌ Action Rejected'}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })}

          {/* SKELETON LOADER */}
          {isTyping && (
            <div style={{ alignSelf: 'flex-start', width: '380px', background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
               {/* Skeleton Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div className="skeleton-pulse" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--border-color)' }}></div>
                <div className="skeleton-pulse" style={{ height: '24px', width: '160px', background: 'var(--border-color)', borderRadius: '4px' }}></div>
              </div>
              {/* Skeleton Lines */}
              <div className="skeleton-pulse" style={{ height: '16px', width: '100%', background: 'var(--border-color)', borderRadius: '4px', marginBottom: '0.8rem' }}></div>
              <div className="skeleton-pulse" style={{ height: '16px', width: '90%', background: 'var(--border-color)', borderRadius: '4px', marginBottom: '0.8rem' }}></div>
              <div className="skeleton-pulse" style={{ height: '16px', width: '70%', background: 'var(--border-color)', borderRadius: '4px' }}></div>
            </div>
          )}

          {isListening && (
            <div style={{ alignSelf: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '3rem', color: 'var(--primary-color)' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--pulse-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s infinite' }}>
                <Mic size={40} />
              </div>
              <span className="animate-pulse" style={{ fontWeight: 600 }}>Listening... Speak now</span>
            </div>
          )}
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginTop: 'auto' }}>
          <button onClick={toggleListen} style={{ background: isListening ? '#ef4444' : 'var(--primary-color)', color: '#fff', padding: '0.8rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}>
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
            style={{ 
              flex: 1, 
              border: 'none', 
              background: 'transparent', 
              fontSize: '1.05rem', 
              color: 'var(--text-color)', 
              outline: 'none',
              resize: 'none',
              minHeight: '24px',
              maxHeight: '120px',
              overflowY: 'auto',
              fontFamily: 'inherit',
              padding: '2px 0',
              lineHeight: '1.4'
            }} 
          />
          
          <button 
            onClick={() => handleSend(query)}
            style={{ background: query.length > 0 ? 'var(--primary-color)' : 'var(--border-color)', color: query.length > 0 ? '#fff' : 'var(--muted-text)', padding: '0.8rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
          >
            <Send size={20} />
          </button>
        </div>
      </main>

      {showClearConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="auth-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center', margin: 0, animation: 'fadeIn 0.2s ease-out' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', marginTop: 0 }}>Clear All Chat History?</h3>
            <p style={{ color: 'var(--muted-text)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete your entire conversation history with the AI Concierge?
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setShowClearConfirm(false)}
                style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('chat_history');
                  setMessages([{ id: Date.now(), text: "Hello! I'm your AI Concierge. What kind of team are you looking to build today?", sender: 'ai', type: 'text' }]);
                  setShowClearConfirm(false);
                }}
                style={{ flex: 1, padding: '0.8rem', background: '#ef4444', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {messageToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="auth-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center', margin: 0, animation: 'fadeIn 0.2s ease-out' }}>
            <XCircle size={48} color="#ef4444" style={{ marginBottom: '1rem', opacity: 0.9 }} />
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', marginTop: 0 }}>Delete Message?</h3>
            <p style={{ color: 'var(--muted-text)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Are you sure you want to permanently remove this message from your chat history?
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setMessageToDelete(null)}
                style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                style={{ flex: 1, padding: '0.8rem', background: '#ef4444', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .animate-pulse {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes skeleton-pulse {
          0% { opacity: 0.8; }
          50% { opacity: 0.4; }
          100% { opacity: 0.8; }
        }
        .skeleton-pulse {
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }

        @keyframes slideDown {
          0% { transform: translate(-50%, -100%); opacity: 0; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
