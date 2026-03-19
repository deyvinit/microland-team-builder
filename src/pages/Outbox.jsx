import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox, User, XCircle } from 'lucide-react';

export default function Outbox() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [messageToRevoke, setMessageToRevoke] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [msgRes, usersRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/messages?user_id=1`),
          fetch(`${import.meta.env.VITE_API_URL}/users`)
        ]);
        const msgs = await msgRes.json();
        const usersList = await usersRes.json();
        
        const userMap = {};
        usersList.forEach(u => { userMap[u.id] = u; });
        
        setUsers(userMap);
        setMessages(msgs.reverse()); // latest first
      } catch(err) {
        console.error("Error fetching outbox:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleRevoke = async () => {
    if (!messageToRevoke) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/messages/${messageToRevoke.id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageToRevoke.id));
        setMessageToRevoke(null);
      }
    } catch (err) {
      console.error("Failed to revoke message", err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav-bar">
        <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)' }}>
          <ArrowLeft size={20} /> <span className="hide-icon-text">Back</span>
        </button>
        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Inbox size={24} color="var(--primary-color)" /> <span className="hide-icon-text">Outbox</span>
        </h2>
        <div style={{ width: 60 }} />
      </nav>

      <main className="page-container" style={{ flex: 1, paddingBottom: '2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-text)' }}>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--muted-text)', background: 'var(--card-bg)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
            <Inbox size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <h3>No Approved Messages Yet</h3>
            <p>Go to the AI Concierge to build your team and send introductions!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--pulse-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                      <User size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.05rem' }}>
                        To: {users[msg.to_user]?.name || `User #${msg.to_user}`}
                      </h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted-text)' }}>
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.4rem 0.8rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 600 }}>
                    Sent
                  </span>
                </div>
                
                <p style={{ margin: 0, color: 'var(--text-color)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <div />
                  
                  <button 
                    onClick={() => setMessageToRevoke(msg)}
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: '#ef4444', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#ef4444'; }} 
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <XCircle size={14} /> Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {messageToRevoke && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="auth-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center', margin: 0, animation: 'fadeIn 0.2s ease-out' }}>
            <XCircle size={48} color="#ef4444" style={{ marginBottom: '1rem', opacity: 0.9 }} />
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', marginTop: 0 }}>Revoke Delivery?</h3>
            <p style={{ color: 'var(--muted-text)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Are you sure you want to intercept and permanently delete this message to <strong>{users[messageToRevoke.to_user]?.name || `User #${messageToRevoke.to_user}`}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setMessageToRevoke(null)}
                style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={handleRevoke}
                style={{ flex: 1, padding: '0.8rem', background: '#ef4444', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
