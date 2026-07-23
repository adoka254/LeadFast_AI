'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseAnon as supabase, hasSupabaseConfig } from '@/lib/supabase';

interface Contractor {
  id: string;
  business_name: string;
  trade: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  plan: string | null;
}

export default function ClientMarketplacePage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorsLoading, setContractorsLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState('All');
  const [selectedContractor, setSelectedContractor] = useState('');
  
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiReply, setAiReply] = useState('');

  useEffect(() => {
    async function fetchPublicContractors() {
      if (hasSupabaseConfig && supabase) {
        setContractorsLoading(true);
        try {
          const { data, error } = await supabase
            .from('businesses')
            .select('id, business_name, trade, contact_email, contact_phone, plan')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching registered contractors:', error);
          } else if (data) {
            setContractors(data as Contractor[]);
          }
        } catch (err) {
          console.error('Fetch error:', err);
        } finally {
          setContractorsLoading(false);
        }
      } else {
        setContractorsLoading(false);
      }
    }

    fetchPublicContractors();
  }, []);

  const tradesList = useMemo(() => {
    const unique = Array.from(new Set(contractors.map((c) => c.trade).filter(Boolean))) as string[];
    return unique.length > 0 ? unique : ['Plumbing', 'HVAC', 'Electrical', 'Roofing', 'General Contracting'];
  }, [contractors]);

  const visibleContractors = useMemo(() => {
    if (selectedTrade === 'All') return contractors;
    return contractors.filter((c) => c.trade?.toLowerCase() === selectedTrade.toLowerCase());
  }, [selectedTrade, contractors]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus('');
    setAiReply('');

    try {
      const fullMessage = selectedContractor 
        ? `[Request for ${selectedContractor}] ${formData.message}` 
        : formData.message;

      const response = await fetch('/api/lead-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: fullMessage
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to submit service request.');

      setStatus(`Thank you ${formData.name}! Your request has been submitted. A confirmation email has been sent to ${formData.email}.`);
      if (result.aiReply) setAiReply(result.aiReply);
      setFormData({ name: '', email: '', phone: '', message: '' });
      setSelectedContractor('');
    } catch (error: any) {
      setStatus(error.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="container" style={{ padding: '24px 0 40px' }}>
        {/* Header + Nav */}
        <div className="panel card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div>
            <p style={{ color: '#38bdf8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: '6px' }}>
              LeadFast AI · Client Directory
            </p>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Find & Hire Trusted Local Contractors</h1>
          </div>
          <nav className="nav" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <a href="/" className="active">Find Contractors</a>
            <a href="/contact">Direct Contact</a>
            <a href="/login" style={{ background: 'linear-gradient(135deg, #2563eb, #38bdf8)', color: 'white', fontWeight: '600', padding: '8px 16px', borderRadius: '999px' }}>
              Contractor Portal / Login
            </a>
          </nav>
        </div>

        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          
          {/* Left Column: Public Directory of Available Contractors */}
          <div className="panel card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0 }}>Available Contractors</h2>
                <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: '0.9rem' }}>
                  Browse verified contractors and their specialized trades.
                </p>
              </div>
              <select
                aria-label="Filter by trade"
                value={selectedTrade}
                onChange={(e) => setSelectedTrade(e.target.value)}
                style={{ width: 'auto', minWidth: '140px' }}
              >
                <option value="All">All Trades</option>
                {tradesList.map((trade) => (
                  <option key={trade} value={trade}>{trade}</option>
                ))}
              </select>
            </div>

            <div className="grid" style={{ gap: '12px' }}>
              {contractorsLoading ? (
                <p style={{ color: '#94a3b8' }}>Loading directory...</p>
              ) : visibleContractors.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '12px' }}>
                  <p style={{ color: '#94a3b8', margin: 0 }}>No registered contractors listed for this trade yet.</p>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
                    You can still submit a general request below and we will match you with a provider.
                  </p>
                </div>
              ) : (
                visibleContractors.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      border: selectedContractor === c.business_name ? '2px solid var(--accent-2)' : '1px solid var(--border)',
                      borderRadius: '14px',
                      padding: '16px',
                      background: 'rgba(30, 41, 59, 0.5)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{c.business_name}</div>
                        <div style={{ color: '#38bdf8', fontSize: '0.9rem', marginTop: '2px' }}>
                          🏷️ Trade: <strong>{c.trade || 'General Contracting'}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setSelectedContractor(c.business_name)}
                        style={{
                          background: selectedContractor === c.business_name ? 'var(--accent-2)' : 'rgba(255,255,255,0.06)',
                          color: selectedContractor === c.business_name ? '#07111f' : '#f8fafc',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          padding: '6px 14px'
                        }}
                      >
                        {selectedContractor === c.business_name ? '✓ Selected' : 'Request Quote'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Lead Service Request Form */}
          <div className="panel card">
            <h2 style={{ marginTop: 0 }}>Submit Service Request</h2>
            <p style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '0.9rem' }}>
              {selectedContractor 
                ? `Direct request to ${selectedContractor}` 
                : 'Send your project details to matched contractors. You will receive an instant email confirmation.'}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
              {selectedContractor && (
                <div style={{ padding: '8px 12px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid var(--accent-2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#38bdf8' }}>
                    Target Contractor: <strong>{selectedContractor}</strong>
                  </span>
                  <button type="button" onClick={() => setSelectedContractor('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>
                    Clear
                  </button>
                </div>
              )}

              <label style={{ display: 'grid', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Your Full Name *</span>
                <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Smith" />
              </label>

              <label style={{ display: 'grid', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Email Address *</span>
                <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" />
              </label>

              <label style={{ display: 'grid', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Phone Number</span>
                <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
              </label>

              <label style={{ display: 'grid', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Project Details & Message *</span>
                <textarea rows={4} required value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Describe what work or repair you need done..." />
              </label>

              <button
                type="submit"
                className="btn"
                style={{ background: 'linear-gradient(135deg, #2563eb, #38bdf8)', color: 'white', padding: '12px 16px', fontWeight: '600' }}
                disabled={loading}
              >
                {loading ? 'Submitting Request…' : 'Submit Request to Contractors'}
              </button>

              {status && (
                <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: status.includes('failed') || status.includes('Unable') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${status.includes('failed') || status.includes('Unable') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
                  <p style={{ margin: 0, color: status.includes('failed') || status.includes('Unable') ? '#fca5a5' : '#86efac', fontSize: '0.9rem' }}>{status}</p>
                </div>
              )}

              {aiReply && (
                <div style={{ marginTop: '12px', padding: '14px', borderRadius: '10px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
                  <p style={{ color: '#38bdf8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px', marginTop: 0 }}>Instant AI Confirmation Reply</p>
                  <p style={{ margin: 0, color: '#e2e8f0', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{aiReply}</p>
                </div>
              )}
            </form>
          </div>

        </div>
      </section>
    </main>
  );
}