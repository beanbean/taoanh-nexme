'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, signOut, isAdmin, getAllApprovals, approveUser, rejectUser } from '@/lib/supabase';

type ApprovalRecord = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type Tab = 'pending' | 'approved' | 'rejected';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    initAdmin();
  }, []);

  async function initAdmin() {
    const { user: currentUser } = await getUser();
    if (!currentUser) {
      router.push('/');
      return;
    }

    if (!isAdmin(currentUser.email)) {
      router.push('/dashboard');
      return;
    }

    setUser(currentUser);
    await loadApprovals();
    setLoading(false);
  }

  async function loadApprovals() {
    const data = await getAllApprovals();
    setApprovals(data);
  }

  async function handleApprove(userId: string) {
    setProcessing(userId);
    const success = await approveUser(userId);
    if (success) {
      await loadApprovals();
    } else {
      alert('Loi khi duyet user');
    }
    setProcessing(null);
  }

  async function handleReject(userId: string) {
    if (!confirm('Ban co chac chan muon tu choi user nay?')) return;
    setProcessing(userId);
    const success = await rejectUser(userId);
    if (success) {
      await loadApprovals();
    } else {
      alert('Loi khi tu choi user');
    }
    setProcessing(null);
  }

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  const filteredApprovals = approvals.filter(a => a.status === activeTab);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner-dark w-8 h-8 border-[3px]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-secondary pb-12">
      {/* Header */}
      <header className="bg-surface border-b border-border-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <span className="font-semibold text-sm text-text-primary">Admin - Duyet User</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-header"
              >
                Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="btn-header"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                Dang xuat
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 mt-6">
        {/* Tabs */}
        <div className="card mb-5">
          <div className="flex border-b border-border-light">
            {([
              { key: 'pending' as Tab, label: 'Cho duyet', count: approvals.filter(a => a.status === 'pending').length },
              { key: 'approved' as Tab, label: 'Da duyet', count: approvals.filter(a => a.status === 'approved').length },
              { key: 'rejected' as Tab, label: 'Da tu choi', count: approvals.filter(a => a.status === 'rejected').length },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 px-4 text-sm font-medium text-center transition-colors relative ${
                  activeTab === tab.key
                    ? 'text-brand-600'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                    activeTab === tab.key
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-surface-tertiary text-text-tertiary'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="p-4">
            {filteredApprovals.length === 0 ? (
              <div className="text-center py-10">
                <div className="inline-flex w-12 h-12 rounded-full bg-surface-tertiary items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                  </svg>
                </div>
                <p className="text-sm text-text-tertiary">
                  {activeTab === 'pending' && 'Khong co user nao dang cho duyet'}
                  {activeTab === 'approved' && 'Chua co user nao duoc duyet'}
                  {activeTab === 'rejected' && 'Chua co user nao bi tu choi'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApprovals.map(approval => (
                  <div
                    key={approval.id}
                    className="flex items-center gap-3 p-3 bg-surface-secondary rounded-xl border border-border-light"
                  >
                    {/* Avatar */}
                    {approval.avatar_url ? (
                      <img
                        src={approval.avatar_url}
                        alt={approval.display_name || 'User'}
                        className="w-10 h-10 rounded-full object-cover border-2 border-border"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-surface-tertiary flex items-center justify-center border-2 border-border">
                        <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {approval.display_name || '(Chua co ten)'}
                      </p>
                      <p className="text-xs text-text-secondary truncate">{approval.email}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {formatDate(approval.created_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    {activeTab === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(approval.user_id)}
                          disabled={processing === approval.user_id}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          {processing === approval.user_id ? (
                            <div className="spinner w-3 h-3" />
                          ) : (
                            'Duyet'
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(approval.user_id)}
                          disabled={processing === approval.user_id}
                          className="btn-danger px-3 py-1.5 text-xs"
                        >
                          Tu choi
                        </button>
                      </div>
                    )}

                    {activeTab === 'approved' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Da duyet
                        </span>
                        <button
                          onClick={() => handleReject(approval.user_id)}
                          disabled={processing === approval.user_id}
                          className="btn-danger px-3 py-1.5 text-xs"
                        >
                          Thu hoi
                        </button>
                      </div>
                    )}

                    {activeTab === 'rejected' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Da tu choi
                        </span>
                        <button
                          onClick={() => handleApprove(approval.user_id)}
                          disabled={processing === approval.user_id}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          Duyet lai
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
