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
      router.push('/client');
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
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <section className="container" style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
        
        {/* Main Interactive Card: Role Selection / Auth */}
        <div className="panel card" style={{ width: '100%', maxWidth: '580px', padding: '32px' }}>
          
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

        {/* Separate Card Field for LeadFast AI Overview & 3 SVG Trade Graphics */}
        <div className="panel card" style={{ width: '100%', maxWidth: '780px', padding: '32px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '1.35rem', color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⚡</span> About LeadFast AI
          </h2>
          <p style={{ color: '#e2e8f0', fontSize: '0.94rem', lineHeight: '1.7', marginBottom: '16px' }}>
            <strong>LeadFast AI</strong> is an instant lead response system engineered specifically for home service contractors like HVAC technicians, plumbers, and roofers. By intercepting website contact form submissions and generating personalized, context-aware email replies within 30 seconds, LeadFast AI bridges the critical response-time gap when contractors are busy in the field—ensuring no high-intent lead is lost to competitors while logging all interactions into a streamlined business dashboard.
          </p>
          <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: '1.7', marginBottom: '28px' }}>
            For clients, this means an end to waiting hours or days for quotes by receiving immediate, intelligent answers tailored to their specific home service needs. For contractors, it provides a 24/7 automated sales assistant that turns website traffic into booked jobs without manual overhead, delivering immediate value to both parties.
          </p>

          {/* 3 Detailed 3D Rendered Images: Tap, Roof, and Electrical Appliance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '24px' }}>
            
            {/* 3D IMAGE 1: TAP / FAUCET (Plumbing) */}
            <div style={{ background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '16px', padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}>
              <div style={{ width: '130px', height: '130px', borderRadius: '14px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, transparent 70%)' }}>
                <img src="/images/tap.png" alt="3D Plumbing Tap" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5))' }} />
              </div>
              <span style={{ marginTop: '14px', fontWeight: '700', color: '#38bdf8', fontSize: '0.95rem' }}>Plumbing & Taps</span>
            </div>

            {/* 3D IMAGE 2: ROOF / HOUSE ROOFING (Black & White 3D) */}
            <div style={{ background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', border: '1px solid rgba(248, 250, 252, 0.25)', borderRadius: '16px', padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}>
              <div style={{ width: '130px', height: '130px', borderRadius: '14px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%)' }}>
                <img src="/images/roof.png" alt="3D Black and White Roof" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5))' }} />
              </div>
              <span style={{ marginTop: '14px', fontWeight: '700', color: '#f8fafc', fontSize: '0.95rem' }}>Roofing & Structure</span>
            </div>

            {/* 3D IMAGE 3: ELECTRICAL APPLIANCE */}
            <div style={{ background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: '16px', padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}>
              <div style={{ width: '130px', height: '130px', borderRadius: '14px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, rgba(74, 222, 128, 0.18) 0%, transparent 70%)' }}>
                <img src="/images/appliance.png" alt="3D Electrical Appliance" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5))' }} />
              </div>
              <span style={{ marginTop: '14px', fontWeight: '700', color: '#4ade80', fontSize: '0.95rem' }}>Electrical & Appliances</span>
            </div>

          </div>
        </div>

      </section>

      {/* Website Owner / Company Footer Details */}
      <footer style={{ background: '#090d16', borderTop: '1px solid var(--border)', padding: '32px 16px 24px', marginTop: '40px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px', color: '#f8fafc', fontSize: '1.1rem', fontWeight: '700' }}>LeadFast AI</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, maxWidth: '320px' }}>
                Instant AI lead response and scheduling automation system for home service professionals across the US.
              </p>
            </div>
            <div style={{ display: 'grid', gap: '8px', fontSize: '0.88rem', color: '#cbd5e1' }}>
              <strong style={{ color: '#38bdf8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Company Contact</strong>
              <div>📞 <strong>Phone:</strong> <a href="tel:+18005550199" style={{ color: '#94a3b8', textDecoration: 'none' }}>+1 (800) 555-0199</a></div>
              <div>✉️ <strong>Email:</strong> <a href="mailto:support@leadfast.ai" style={{ color: '#94a3b8', textDecoration: 'none' }}>support@leadfast.ai</a></div>
              <div>📍 <strong>Address:</strong> 100 Enterprise Way, Suite 400, Austin, TX 78701</div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem' }}>
            <span>© {new Date().getFullYear()} LeadFast AI Technologies Inc. All rights reserved.</span>
            <span>HVAP Contractor Portal & Client Marketplace</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
