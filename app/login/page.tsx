'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAnon as supabase, hasSupabaseConfig } from '@/lib/supabase';

interface Business {
  id: string;
  business_name: string;
}

type Step = 'role_select' | 'auth_form';

export default function LoginPage() {
  const [step, setStep] = useState<Step>('role_select');
  const [role, setRole] = useState<'contractor' | 'client' | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessTrade, setBusinessTrade] = useState('');
  const [businessContactEmail, setBusinessContactEmail] = useState('');
  const [businessContactPhone, setBusinessContactPhone] = useState('');
  const [businessPlan, setBusinessPlan] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  const [showBizSelect, setShowBizSelect] = useState(false);

  useEffect(() => {
    const session = window.localStorage.getItem('hvap-session');
    const logoutMessage = window.localStorage.getItem('hvap-logout-message');
    if (logoutMessage) {
      setMessage(logoutMessage);
      window.localStorage.removeItem('hvap-logout-message');
    } else if (session) {
      setMessage('You are signed in as a contractor.');
    }
  }, []);

  function handleSelectRole(selectedRole: 'contractor' | 'client') {
    setRole(selectedRole);
    if (selectedRole === 'client') {
      router.push('/');
    } else {
      setStep('auth_form');
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!hasSupabaseConfig || !supabase) throw new Error('Supabase configuration missing.');

      if (isSignUp) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        const userId = signUpData.user?.id;
        if (!userId) throw new Error('User ID not returned after sign‑up.');

        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            business_name: businessName,
            trade: businessTrade,
            contact_email: businessContactEmail || email,
            contact_phone: businessContactPhone,
            plan: businessPlan || null
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed to create business.');

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setMessage('Business registered! Please check your email to confirm your account before signing in.');
          setLoading(false);
          return;
        }
        window.localStorage.setItem('hvap-session', JSON.stringify(sessionData.session));
        window.localStorage.setItem('hvap-user', JSON.stringify(signUpData.user));
        window.localStorage.setItem('hvap-business', JSON.stringify({ id: result.id, name: result.business_name }));
        setMessage('Account created! Redirecting to your dashboard…');
        router.replace('/dashboard');
        return;
      }

      if (useMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setMessage('Check your email for the magic sign‑in link!');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.session) {
        window.localStorage.setItem('hvap-session', JSON.stringify(data.session));
        window.localStorage.setItem('hvap-user', JSON.stringify(data.user));

        const bizRes = await fetch('/api/my-businesses', {
          headers: { Authorization: `Bearer ${data.session.access_token}` }
        });
        const bizData = await bizRes.json();
        const bizList = Array.isArray(bizData) ? bizData : [];
        setBusinesses(bizList);

        if (bizList.length === 0) {
          router.replace('/dashboard');
          return;
        }
        if (bizList.length === 1) {
          window.localStorage.setItem('hvap-business', JSON.stringify({ id: bizList[0].id, name: bizList[0].business_name }));
          router.replace('/dashboard');
          return;
        }
        setSelectedBizId(bizList[0].id);
        setShowBizSelect(true);
      }
    } catch (err: any) {
      setMessage(err.message || 'Unable to sign in / sign up.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="container" style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
        <div className="panel card" style={{ width: '100%', maxWidth: '520px', padding: '32px' }}>
          
          {step === 'role_select' ? (
            <div>
              <p style={{ color: '#38bdf8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: '8px' }}>
                Welcome to LeadFast AI
              </p>
              <h1 style={{ margin: '0 0 12px', fontSize: '1.8rem' }}>How would you like to proceed?</h1>
              <p style={{ color: '#94a3b8', marginBottom: '28px', lineHeight: '1.5' }}>
                Please select your role to be directed to the appropriate portal.
              </p>

              <div style={{ display: 'grid', gap: '16px' }}>
                <button
                  type="button"
                  onClick={() => handleSelectRole('contractor')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '20px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(56, 189, 248, 0.1))',
                    border: '1px solid var(--accent)',
                    color: 'white',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '4px' }}>
                    🛠️ I am a Contractor
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                    Sign in to your private dashboard to view your business leads and metrics.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRole('client')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '20px',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border)',
                    color: 'white',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '4px' }}>
                    📋 I am a Client / Lead
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                    Browse available contractors by trade and submit a service request.
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setStep('role_select')}
                style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: 0, marginBottom: '16px', fontSize: '0.9rem' }}
              >
                ← Back to role selection
              </button>

              <p style={{ color: '#38bdf8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: '6px' }}>
                Contractor Access
              </p>
              <h1 style={{ margin: '0 0 8px', fontSize: '1.75rem' }}>
                {isSignUp ? 'Contractor Sign‑Up' : 'Contractor Login'}
              </h1>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setShowBizSelect(false); }}
                  style={{ background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {isSignUp ? 'Switch to Login' : 'Create Account'}
                </button>
              </div>

              {showBizSelect && businesses.length > 0 ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span>Select Business</span>
                    <select value={selectedBizId} onChange={(e) => setSelectedBizId(e.target.value)}>
                      {businesses.map((biz) => (
                        <option key={biz.id} value={biz.id}>{biz.business_name}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #38bdf8)', color: 'white', padding: '10px 14px' }}
                    onClick={() => {
                      const chosen = businesses.find((b) => b.id === selectedBizId);
                      window.localStorage.setItem('hvap-business', JSON.stringify({ id: selectedBizId, name: chosen?.business_name }));
                      router.replace('/dashboard');
                    }}
                  >
                    Continue to Dashboard
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span>Email</span>
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contractor@company.com" />
                  </label>

                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setUseMagicLink(!useMagicLink)}
                      style={{ fontSize: '0.8rem', background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', textAlign: 'left' }}
                    >
                      {useMagicLink ? 'Switch to Password' : 'Use Magic Link instead'}
                    </button>
                  )}

                  {(!useMagicLink || isSignUp) && (
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span>Password</span>
                      <input required={!useMagicLink} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                    </label>
                  )}

                  {isSignUp && (
                    <>
                      <label style={{ display: 'grid', gap: '6px' }}>
                        <span>Business Name</span>
                        <input required type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Plumbing Co." />
                      </label>
                      <label style={{ display: 'grid', gap: '6px' }}>
                        <span>Trade</span>
                        <input type="text" value={businessTrade} onChange={(e) => setBusinessTrade(e.target.value)} placeholder="e.g. Plumbing, HVAC, Electrical" />
                      </label>
                      <label style={{ display: 'grid', gap: '6px' }}>
                        <span>Business Contact Email</span>
                        <input type="email" value={businessContactEmail} onChange={(e) => setBusinessContactEmail(e.target.value)} placeholder="info@acme.com" />
                      </label>
                      <label style={{ display: 'grid', gap: '6px' }}>
                        <span>Contact Phone</span>
                        <input type="tel" value={businessContactPhone} onChange={(e) => setBusinessContactPhone(e.target.value)} placeholder="+1 555 1234" />
                      </label>
                      <label style={{ display: 'grid', gap: '6px' }}>
                        <span>Plan</span>
                        <select value={businessPlan} onChange={(e) => setBusinessPlan(e.target.value)}>
                          <option value="">Select a plan (optional)</option>
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </label>
                    </>
                  )}

                  <button
                    type="submit"
                    className="btn"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #38bdf8)', color: 'white', padding: '12px 16px', marginTop: '6px' }}
                    disabled={loading}
                  >
                    {loading ? 'Processing…' : isSignUp ? 'Sign Up' : useMagicLink ? 'Send Magic Link' : 'Sign In'}
                  </button>
                </form>
              )}

              {message && (
                <p role="alert" style={{ marginTop: '12px', color: message.startsWith('Account') || message.includes('registered') || message.includes('magic') ? '#86efac' : '#fca5a5' }}>
                  {message}
                </p>
              )}
            </div>
          )}

        </div>
      </section>
    </main>
  );
}
