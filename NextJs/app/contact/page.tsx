'use client';

import { useState } from 'react';
import LogoutButton from '../components/LogoutButton';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiReply, setAiReply] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    setAiReply('');

    try {
      const response = await fetch('/api/lead-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Something went wrong.');
      } else {
        setStatus('Your message was received! An AI reply has been sent to your email.');
        if (result.aiReply) setAiReply(result.aiReply);
        setName('');
        setEmail('');
        setMessage('');
      }
    } catch (error) {
      setStatus('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="container" style={{ padding: '24px 0 40px' }}>
        {/* Header + Nav */}
        <div className="panel card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <div>
            <p style={{ color: '#38bdf8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: '6px' }}>AI-Powered Contact</p>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>LeadFast AI Contact Form</h1>
          </div>
          <nav className="nav" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <a href="/">Overview</a>
            <a href="/leads">Leads</a>
            <a href="/contact" className="active">LeadFast AI</a>
            <a href="/login">Login</a>
            <LogoutButton />
          </nav>
        </div>

        {/* Contact Form */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="panel card" style={{ width: '100%', maxWidth: '600px' }}>
            <p style={{ color: '#94a3b8', marginBottom: '20px', marginTop: 0 }}>
              Submit your enquiry and our AI assistant will respond to your email within seconds, powered by Claude AI.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Full Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  required
                />
              </label>

              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Email Address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </label>

              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Message</span>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your project or enquiry..."
                  required
                />
              </label>

              <button
                type="submit"
                className="btn"
                style={{ background: 'linear-gradient(135deg, #2563eb, #38bdf8)', color: 'white', padding: '12px 16px' }}
                disabled={loading}
              >
                {loading ? 'Sending to AI…' : 'Submit to LeadFast AI'}
              </button>
            </form>

            {status && (
              <div style={{ marginTop: '16px', padding: '14px', borderRadius: '12px', background: status.includes('wrong') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${status.includes('wrong') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
                <p style={{ margin: 0, color: status.includes('wrong') ? '#fca5a5' : '#86efac' }}>{status}</p>
              </div>
            )}

            {aiReply && (
              <div style={{ marginTop: '16px', padding: '14px', borderRadius: '12px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <p style={{ color: '#38bdf8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px', marginTop: 0 }}>AI Reply Preview</p>
                <p style={{ margin: 0, color: '#e2e8f0', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{aiReply}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
