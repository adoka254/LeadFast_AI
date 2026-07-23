'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAnon as supabase, hasSupabaseConfig } from '@/lib/supabase';

interface Business {
  id: string;
  business_name: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Toggle between Login and Sign‑Up modes
  const [isSignUp, setIsSignUp] = useState(false);
  // Toggle between Password and Magic Link login
  const [useMagicLink, setUseMagicLink] = useState(false);

  // Business registration fields (sign‑up only) — match businesses table columns
  const [businessName, setBusinessName] = useState('');
  const [businessTrade, setBusinessTrade] = useState('');
  const [businessContactEmail, setBusinessContactEmail] = useState('');
  const [businessContactPhone, setBusinessContactPhone] = useState('');
  const [businessPlan, setBusinessPlan] = useState('');

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Multiple‑business state (shown after login when contractor has > 1 business)
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
      setMessage('You are already signed in. Use sign out to return to this page.');
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!hasSupabaseConfig || !supabase) {
        throw new Error('Supabase configuration missing.');
      }

      // ── Sign‑Up Flow ────────────────────────────────────────────────────────
      if (isSignUp) {
        // 1. Create the Supabase Auth user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        const userId = signUpData.user?.id;
        if (!userId) throw new Error('User ID not returned after sign‑up.');

        // 2. Insert the business via server‑side API route (bypasses RLS)
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            business_name: businessName,
            trade: businessTrade,
            contact_email: businessContactEmail || email,
            contact_phone: businessContactPhone,
            plan: businessPlan || null,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed to create business.');

        // 3. Persist session and business, then redirect
        const { data: sessionData } = await supabase.auth.getSession();

        // If email confirmation is enabled, Supabase won't return a session yet
        if (!sessionData.session) {
          setMessage('Business registered! Please check your email to confirm your account before signing in.');
          setLoading(false);
          return;
        }

        window.localStorage.setItem('hvap-session', JSON.stringify(sessionData.session));
        window.localStorage.setItem('hvap-user', JSON.stringify(signUpData.user));
        window.localStorage.setItem(
          'hvap-business',
          JSON.stringify({ id: result.id, name: result.business_name })
        );
        setMessage('Account created! Redirecting to dashboard…');
        router.replace('/dashboard');
        return;
      }

      // ── Login Flow ──────────────────────────────────────────────────────────
      if (useMagicLink) {
        // Magic link — just send the OTP email
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setMessage('Check your email for the magic sign‑in link!');
        return;
      }

      // Password login
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.session) {
        window.localStorage.setItem('hvap-session', JSON.stringify(data.session));
        window.localStorage.setItem('hvap-user', JSON.stringify(data.user));

        // Fetch all businesses for this contractor via server‑side route (bypasses RLS)
        const bizRes = await fetch('/api/my-businesses', {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        const bizData = await bizRes.json();
        const bizList = Array.isArray(bizData) ? bizData : [];
        setBusinesses(bizList);

        if (bizList.length === 0) {
          // No business registered yet — go to dashboard
          router.replace('/dashboard');
          return;
        }

        if (bizList.length === 1) {
          // Single business — auto‑select and redirect
          window.localStorage.setItem(
            'hvap-business',
            JSON.stringify({ id: bizList[0].id, name: bizList[0].business_name })
          );
          router.replace('/dashboard');
          return;
        }

        // Multiple businesses — show selector
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
        <div className="panel card" style={{ width: '100%', maxWidth: '460px' }}>
          <p style={{ color: '#38bdf8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: '6px' }}>Secure access</p>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.75rem' }}>
            {isSignUp ? 'Contractor Sign‑Up' : 'Contractor Login'}
          </h1>
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setShowBizSelect(false); }}
            style={{ marginBottom: '12px', background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
          >
            {isSignUp ? 'Switch to Login' : 'Create Account'}
          </button>
          <p style={{ color: '#94a3b8', marginBottom: '18px' }}>
            Only registered contractors can access the private dashboard.
          </p>

          {/* ── Business selector (shown after login when multiple businesses) ── */}
          {showBizSelect && businesses.length > 0 ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span>Select Business</span>
                <select
                  value={selectedBizId}
                  onChange={(e) => setSelectedBizId(e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px' }}
                >
                  {businesses.map((biz) => (
                    <option key={biz.id} value={biz.id}>
                      {biz.business_name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn"
                style={{ background: 'linear-gradient(135deg, #2563eb, #38bdf8)', color: 'white', padding: '10px 14px' }}
                onClick={() => {
                  const chosen = businesses.find((b) => b.id === selectedBizId);
                  window.localStorage.setItem(
                    'hvap-business',
                    JSON.stringify({ id: selectedBizId, name: chosen?.business_name })
                  );
                  router.replace('/dashboard');
                }}
              >
                Continue to Dashboard
              </button>
            </div>
          ) : (
            /* ── Auth form ── */
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span>Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contractor@company.com"
                />
              </label>

              {/* Magic link toggle — only in login mode */}
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setUseMagicLink(!useMagicLink)}
                  style={{ fontSize: '0.8rem', background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', textAlign: 'left' }}
                >
                  {useMagicLink ? 'Switch to Password' : 'Use Magic Link instead'}
                </button>
              )}

              {/* Password field — hidden when magic link is selected */}
              {(!useMagicLink || isSignUp) && (
                <label style={{ display: 'grid', gap: '6px' }}>
                  <span>Password</span>
                  <input
                    required={!useMagicLink}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </label>
              )}

              {/* Business fields — sign‑up mode only, matching businesses table */}
              {isSignUp && (
                <>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span>Business Name</span>
                    <input
                      required
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Acme Corp"
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span>Trade</span>
                    <input
                      type="text"
                      value={businessTrade}
                      onChange={(e) => setBusinessTrade(e.target.value)}
                      placeholder="e.g. Plumbing, HVAC, Electrical"
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span>Business Contact Email</span>
                    <input
                      type="email"
                      value={businessContactEmail}
                      onChange={(e) => setBusinessContactEmail(e.target.value)}
                      placeholder="info@acmecorp.com (defaults to sign‑up email)"
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span>Contact Phone</span>
                    <input
                      type="tel"
                      value={businessContactPhone}
                      onChange={(e) => setBusinessContactPhone(e.target.value)}
                      placeholder="+1 555 1234"
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span>Plan</span>
                    <select
                      value={businessPlan}
                      onChange={(e) => setBusinessPlan(e.target.value)}
                      style={{ padding: '8px', borderRadius: '4px' }}
                    >
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
                style={{ background: 'linear-gradient(135deg, #2563eb, #38bdf8)', color: 'white', padding: '12px 16px' }}
                disabled={loading}
              >
                {loading ? 'Processing…' : isSignUp ? 'Sign Up' : useMagicLink ? 'Send Magic Link' : 'Sign In'}
              </button>
            </form>
          )}

          {message && (
            <p role="alert" style={{ marginTop: '12px', color: message.startsWith('Account') || message.includes('registered') ? '#86efac' : '#fca5a5' }}>
              {message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
