'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LogoutButton from '../components/LogoutButton';
import { supabaseAnon as supabase, hasSupabaseConfig } from '@/lib/supabase';

interface Business {
  id: string;
  business_name: string;
  trade: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  plan: string | null;
}

interface Lead {
  id: string;
  lead_name: string;
  lead_email: string | null;
  lead_phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

export default function ContractorDashboard() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const router = useRouter();

  useEffect(() => {
    async function loadContractorData() {
      if (typeof window === 'undefined') return;

      const storedUser = window.localStorage.getItem('hvap-user');
      const storedBusiness = window.localStorage.getItem('hvap-business');
      const storedSession = window.localStorage.getItem('hvap-session');

      if (!storedSession && !storedUser) {
        // If not authenticated as contractor, redirect to login role selector
        router.replace('/login');
        return;
      }

      let currentBiz: Business | null = null;
      if (storedBusiness) {
        try {
          currentBiz = JSON.parse(storedBusiness);
        } catch (e) {
          console.error('Error parsing stored business:', e);
        }
      }

      setBusiness(currentBiz);

      if (hasSupabaseConfig && supabase) {
        try {
          let query = supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

          const { data, error } = await query;
          if (error) {
            console.error('Error fetching leads:', error);
          } else if (data) {
            setLeads(data as Lead[]);
          }
        } catch (err) {
          console.error('Fetch error:', err);
        }
      }

      setLoading(false);
    }

    loadContractorData();
  }, [router]);

  const visibleLeads = filterStatus === 'All' 
    ? leads 
    : leads.filter(l => l.status === filterStatus);

  return (
    <main>
      <section className="container" style={{ padding: '24px 0 40px' }}>
        {/* Header + Nav */}
        <div className="panel card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <div>
            <p style={{ color: '#38bdf8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: '6px' }}>Private Contractor Workspace</p>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>
              {business?.business_name || 'Contractor Dashboard'}
            </h1>
          </div>
          <nav className="nav" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <a href="/dashboard" className="active">My Dashboard</a>
            <a href="/contact">Support</a>
            <LogoutButton />
          </nav>
        </div>

        {/* Business Summary KPI */}
        <div className="grid grid-3" style={{ marginBottom: '18px' }}>
          <div className="panel card kpi">
            <div className="label">Registered Trade</div>
            <div className="value" style={{ fontSize: '1.25rem', textTransform: 'capitalize' }}>
              {business?.trade || 'General Contracting'}
            </div>
          </div>
          <div className="panel card kpi">
            <div className="label">Total Captured Leads</div>
            <div className="value">{loading ? '—' : leads.length}</div>
          </div>
          <div className="panel card kpi">
            <div className="label">Active Subscription</div>
            <div className="value" style={{ fontSize: '1.25rem', textTransform: 'capitalize' }}>
              {business?.plan || 'Standard'}
            </div>
          </div>
        </div>

        {/* Contractor's Private Leads View */}
        <div className="panel card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0 }}>My Incoming Leads</h2>
              <p style={{ color: '#94a3b8', margin: '4px 0 0' }}>Customer requests submitted for your services.</p>
            </div>
            {leads.length > 0 && (
              <select
                aria-label="Filter status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All statuses</option>
                <option value="New">New</option>
                <option value="received">Received</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Booked">Booked</option>
              </select>
            )}
          </div>

          {loading ? (
            <p style={{ color: '#94a3b8' }}>Loading your leads...</p>
          ) : visibleLeads.length === 0 ? (
            /* Explicit Directive: "If he has 0 leads ,this informartion is displayed instead of an empty table-'No leads captured yet. '" */
            <div style={{ padding: '32px 16px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
              <p style={{ fontSize: '1.1rem', color: '#94a3b8', margin: 0, fontWeight: '500' }}>
                No leads captured yet.
              </p>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>
                New requests submitted by clients will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid" style={{ gap: '12px' }}>
              {visibleLeads.map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '16px',
                    background: 'rgba(30, 41, 59, 0.4)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '1.05rem' }}>{lead.lead_name}</div>
                      <div style={{ color: '#38bdf8', fontSize: '0.9rem', marginTop: '2px' }}>
                        📧 {lead.lead_email} {lead.lead_phone ? `• 📞 ${lead.lead_phone}` : ''}
                      </div>
                    </div>
                    <span className={`badge ${lead.status === 'Booked' ? '' : 'warn'}`}>
                      {lead.status || 'New'}
                    </span>
                  </div>
                  {lead.message && (
                    <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)' }}>
                      <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.95rem' }}>{lead.message}</p>
                    </div>
                  )}
                  <div style={{ marginTop: '8px', color: '#64748b', fontSize: '0.8rem' }}>
                    Received: {new Date(lead.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
