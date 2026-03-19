import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Loader2 } from 'lucide-react';

export default function Login() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const navigate = useNavigate();

  const handleBiometricLogin = () => {
    setIsAuthenticating(true);
    // Simulate a native biometric prompt delay
    setTimeout(() => {
      setIsAuthenticating(false);
      navigate('/dashboard');
    }, 2000);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 style={{ marginBottom: '1rem', fontSize: '2rem', fontWeight: '800' }}>Team Builder</h1>
        <p style={{ color: 'var(--muted-text)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Connect securely to match with top talent for your next project.
        </p>
        
        <button 
          className="btn-primary" 
          onClick={handleBiometricLogin}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <Fingerprint size={24} />
          )}
          {isAuthenticating ? 'Authenticating...' : 'Authenticate with Face ID'}
        </button>
      </div>
    </div>
  );
}
