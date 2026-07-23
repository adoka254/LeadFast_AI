'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('hvap-session');
    window.localStorage.removeItem('hvap-user');
    window.localStorage.removeItem('hvap-business');
    window.localStorage.removeItem('hvap-leads');
    window.localStorage.setItem('hvap-logout-message', 'You have been signed out.');
    router.push('/login');
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.04)',
        color: '#f8fafc',
        borderRadius: '999px',
        padding: '8px 14px',
        cursor: 'pointer',
        fontSize: '0.95rem'
      }}
    >
      Sign out
    </button>
  );
}
