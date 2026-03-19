import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Loader2 } from 'lucide-react';

export default function Login() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const navigate = useNavigate();

  const handleBiometricLogin = async () => {
    setIsAuthenticating(true);
    try {
      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(challenge);
        window.crypto.getRandomValues(userId);

        await navigator.credentials.create({
          publicKey: {
            challenge: challenge,
            rp: { name: "Team Builder Secure Local", id: window.location.hostname },
            user: { id: userId, name: "admin@local", displayName: "Admin User" },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            authenticatorSelection: { userVerification: "required" },
            timeout: 60000,
            attestation: "none"
          }
        });
        
        setIsAuthenticating(false);
        navigate('/dashboard');
      } else {
        setTimeout(() => {
          setIsAuthenticating(false);
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      console.error("Biometric prompt cancelled or failed", err);
      // Apple's OS tightly restricts WebAuthn on self-signed IP certificates
      // Fail gracefully backward to the simulated loading gate for the presentation.
      setTimeout(() => {
        setIsAuthenticating(false);
        navigate('/dashboard');
      }, 1500);
    }
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
          {isAuthenticating ? 'Authenticating...' : 'Authenticate with Biometrics'}
        </button>
      </div>
    </div>
  );
}
