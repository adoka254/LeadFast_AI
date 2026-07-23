'use client';

import { useEffect, useMemo, useState } from 'react';
import LogoutButton from './components/LogoutButton';
import { supabaseAnon as supabase, hasSupabaseConfig } from '@/lib/supabase';

interface Contractor {
  id: string;
  business_name: string;
  trade: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  plan: string | null;
}

export default function HomePage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorsLoading, setContractorsLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [trades, setTrades] = useState<string[]>([]);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [qualifiedLeads, setQualifiedLeads] = useState<number | null>(null);
  const [openJobs, setOpenJobs] = useState<number | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    async function fetchContractors() {
      if (hasSupabaseConfig && supabase) {
        setContractorsLoading(true);
        try {
          const { data, error } = await supabase
            .from('businesses')
            .select('id, business_name, trade, contact_email, contact_phone, plan')
            .order('created_at', { ascending: false });
          if (error) {
            console.error('Error fetching businesses:', error);
          } else if (data) {
            setContractors(data as Contractor[]);
            const uniqueTrades = Array.from(new Set(data.map((b: any) => b.trade).filter(Boolean))) as string[];
            setTrades(uniqueTrades);
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

    async function fetchMetrics() {
      if (!hasSupabaseConfig || !supabase) { setMetricsLoading(false); return; }
      try {
        const { count: totalLeads } = await supabase
          .from('leads').select('id', { count: 'exact', head: true });
        const { count: openCount } = await supabase
          .from('leads').select('id', { count: 'exact', head: true })
          .in('status', ['New', 'Follow-up']);
        setQualifiedLeads(totalLeads ?? 0);
        setOpenJobs(openCount ?? 0);
      } catch (err) {
        console.error('Metrics fetch error:', err);
      } finally {
        setMetricsLoading(false);
      }
    }

    fetchContractors();
    fetchMetrics();
  }, []);

  const visibleContractors = useMemo(() => {
    if (filter === 'All') return contractors;
    return contractors.filter((item) => item.trade === filter);
  }, [filter, contractors]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus('');
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to submit lead.');
      setStatus(`Lead captured for ${formData.name}.`);
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error: any) {
      setStatus(error.message || 'Submission failed.');
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
            <p style={{ color: '#38bdf8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: '6px' }}>LeadFast AI · HVAP Contractor Portal</p>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Unified contractor workspace</h1>
          </div>
          <nav className="nav" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <a href="/" className="active">Overview</a>
            <a href="/leads">Leads</a>
            <a href="/contact">LeadFast AI</a>
            <a href="/login">Login</a>
            <LogoutButton />
          </nav>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-3" style={{ marginBottom: '18px' }}>
          <div className="panel card kpi">
            <div className="label">Qualified Leads</div>
            <div className="value">{metricsLoading ? '—' : qualifiedLeads ?? '0'}</div>
          </div>
          <div className="panel card kpi">
            <div className="label">Open Jobs</div>
            <div className="value">{metricsLoading ? '—' : openJobs ?? '0'}</div>
          </div>
          <div className="panel card kpi">
            <div className="label">Registered Businesses</div>
            <div className="value">{contractorsLoading ? '—' : contractors.length}</div>
          </div>
        </div>

        {/* Contractor Roster + Lead Capture */}
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <div className="panel card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0 }}>Active contractor roster</h2>
                  <span className={`badge ${hasSupabaseConfig ? '' : 'warn'}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    {hasSupabaseConfig ? 'Live Database' : 'Sandbox'}
                  </span>
                </div>
                <p style={{ color: '#94a3b8', margin: '4px 0 0' }}>A view of registered partner businesses.</p>
              </div>
              <select aria-label="Filter by trade" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="All">All trades</option>
                {trades.map((trade) => (
                  <option key={trade} value={trade}>{trade}</option>
                ))}
              </select>
            </div>
            <div className="grid" style={{ gap: '12px' }}>
              {contractorsLoading ? (
                <p style={{ color: '#94a3b8' }}>Loading contractors...</p>
              ) : visibleContractors.length === 0 ? (
                <p style={{ color: '#94a3b8' }}>No contractors found. Add businesses in your Supabase dashboard.</p>
              ) : (
                visibleContractors.map((contractor) => (
                  <div key={contractor.id} style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{contractor.business_name}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                        {contractor.trade || 'General'}
                        {contractor.contact_email ? ` • ${contractor.contact_email}` : ''}
                      </div>
                    </div>
                    {contractor.plan && <span className="badge">{contractor.plan}</span>}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel card">
            <h2 style={{ marginTop: 0 }}>Lead capture</h2>
            <p style={{ color: '#94a3b8', marginBottom: '14px' }}>Capture incoming contractor leads directly from this page.</p>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>
              <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Full name" />
              <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email" />
              <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone" />
              <textarea rows={4} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Project details" />
              <button type="submit" className="btn" style={{ background: 'linear-gradient(135deg, #2563eb, #38bdf8)', color: 'white' }} disabled={loading}>
                {loading ? 'Capturing…' : 'Capture lead'}
              </button>
              {status && <p style={{ margin: 0, color: '#86efac' }}>{status}</p>}
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}