import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Lock,
  Search,
  RefreshCw,
  LogOut,
  ExternalLink,
  Download,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Trophy,
  XCircle,
  Clock,
  ChevronDown,
  ArrowLeft,
  X,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { DbSubmission } from '../lib/supabase';

interface AdminViewProps {
  onBackToApp: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onBackToApp }) => {
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem('admin_session_token') || localStorage.getItem('admin_session_token');
  });
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Dashboard state
  const [submissions, setSubmissions] = useState<DbSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'design' | 'writing'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'reviewed' | 'winner' | 'rejected'>('all');

  // Selected submission modal
  const [selectedSubmission, setSelectedSubmission] = useState<DbSubmission | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Verify token on mount
  useEffect(() => {
    if (!token) return;

    fetch('/api/admin/verify', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.valid) {
          handleLogout();
        } else {
          fetchSubmissions(token);
        }
      })
      .catch(() => {
        handleLogout();
      });
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthenticating(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Invalid password');
      }

      sessionStorage.setItem('admin_session_token', data.token);
      setToken(data.token);
      setPassword('');
      fetchSubmissions(data.token);
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_session_token');
    localStorage.removeItem('admin_session_token');
    setToken(null);
    setSubmissions([]);
  };

  const fetchSubmissions = async (authToken = token) => {
    if (!authToken) return;
    setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch('/api/admin/submissions', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch submissions');
      }

      setSubmissions(data.submissions || []);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'submitted' | 'reviewed' | 'winner' | 'rejected') => {
    if (!token) return;
    setUpdatingStatusId(id);

    try {
      const res = await fetch(`/api/admin/submissions/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );

      if (selectedSubmission?.id === id) {
        setSelectedSubmission((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      alert(`Could not update status: ${err.message}`);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Filtered submissions list
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      // Category filter
      if (categoryFilter !== 'all' && s.category !== categoryFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesEmail = s.email ? s.email.toLowerCase().includes(q) : false;
        const matchesChallenge = s.challenge_title.toLowerCase().includes(q);
        const matchesNumber = String(s.challenge_number).includes(q);
        const matchesText = s.submission_text ? s.submission_text.toLowerCase().includes(q) : false;
        return matchesName || matchesEmail || matchesChallenge || matchesNumber || matchesText;
      }
      return true;
    });
  }, [submissions, categoryFilter, statusFilter, searchQuery]);

  // Metric stats
  const stats = useMemo(() => {
    const total = submissions.length;
    const design = submissions.filter((s) => s.category === 'design').length;
    const writing = submissions.filter((s) => s.category === 'writing').length;
    const winners = submissions.filter((s) => s.status === 'winner').length;
    const pending = submissions.filter((s) => s.status === 'submitted').length;
    return { total, design, writing, winners, pending };
  }, [submissions]);

  // -------------------------------------------------------------
  // Unauthenticated Login Screen
  // -------------------------------------------------------------
  if (!token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl space-y-6 text-left">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#ff3b30]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-white">ORGANIZER ACCESS</h2>
                <p className="text-xs font-mono-digits text-zinc-400">24 Hour Challenge Portal</p>
              </div>
            </div>

            <button
              onClick={onBackToApp}
              className="text-xs font-mono-digits text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs font-mono-digits text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono-digits uppercase text-zinc-300 tracking-wider">
                Event Passphrase
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-white focus:outline-none text-white text-sm placeholder:text-zinc-600 transition-colors font-mono-digits"
                />
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] font-mono-digits text-zinc-500">
                Default event passphrase is configured on your server.
              </p>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3.5 rounded-xl font-mono-digits text-sm font-bold uppercase tracking-wider text-black bg-white hover:bg-zinc-100 active:scale-[0.99] transition-all cursor-pointer"
            >
              {isAuthenticating ? 'VERIFYING...' : 'ENTER DASHBOARD'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Authenticated Admin Dashboard
  // -------------------------------------------------------------
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#ff3b30]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-display font-extrabold text-2xl text-white tracking-tight">
                ORGANIZER DASHBOARD
              </h1>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-mono-digits uppercase font-semibold">
                ADMIN
              </span>
            </div>
            <p className="text-xs font-mono-digits text-zinc-400">
              Live submissions stream from Supabase database
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-center">
          <button
            onClick={() => fetchSubmissions()}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-mono-digits flex items-center gap-1.5 transition-colors"
            title="Refresh submissions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onBackToApp}
            className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-mono-digits flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Challenge View</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-xl bg-red-950/30 border border-red-900/50 hover:bg-red-900/40 text-red-300 text-xs font-mono-digits flex items-center gap-1.5 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left">
          <div className="text-[11px] font-mono-digits text-zinc-400 uppercase tracking-wider">
            Total Entries
          </div>
          <div className="text-2xl font-display font-extrabold text-white mt-1">
            {stats.total}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left">
          <div className="text-[11px] font-mono-digits text-purple-400 uppercase tracking-wider">
            Design
          </div>
          <div className="text-2xl font-display font-extrabold text-white mt-1">
            {stats.design}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left">
          <div className="text-[11px] font-mono-digits text-emerald-400 uppercase tracking-wider">
            Writing
          </div>
          <div className="text-2xl font-display font-extrabold text-white mt-1">
            {stats.writing}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left">
          <div className="text-[11px] font-mono-digits text-amber-400 uppercase tracking-wider">
            New / Pending
          </div>
          <div className="text-2xl font-display font-extrabold text-white mt-1">
            {stats.pending}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left col-span-2 sm:col-span-1">
          <div className="text-[11px] font-mono-digits text-[#ff3b30] uppercase tracking-wider">
            Winners
          </div>
          <div className="text-2xl font-display font-extrabold text-white mt-1">
            {stats.winners}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search participant, email, or challenge title..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-white focus:outline-none text-white text-xs font-mono-digits placeholder:text-zinc-600 transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono-digits">
          {/* Category Filter */}
          <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5">
            {(['all', 'design', 'writing'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  categoryFilter === cat ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5">
            {(['all', 'submitted', 'reviewed', 'winner', 'rejected'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  statusFilter === st ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-xs font-mono-digits text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={() => fetchSubmissions()}
            className="underline font-bold text-white hover:text-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Submissions List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-zinc-400 mx-auto" />
          <p className="text-xs font-mono-digits text-zinc-400">Loading submissions from database...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="py-20 text-center space-y-3 p-8 rounded-2xl bg-zinc-950 border border-zinc-800">
          <Shield className="w-8 h-8 text-zinc-600 mx-auto" />
          <h3 className="font-display font-bold text-lg text-white">No submissions found</h3>
          <p className="text-xs font-mono-digits text-zinc-400 max-w-sm mx-auto">
            {submissions.length === 0
              ? 'No participant submissions yet. Submissions will appear in real time.'
              : 'No entries match your search or filter settings.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubmissions.map((sub) => (
            <div
              key={sub.id}
              className="rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all p-5 flex flex-col justify-between space-y-4 text-left shadow-lg"
            >
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-digits uppercase font-bold ${
                      sub.category === 'design'
                        ? 'bg-purple-950/70 border border-purple-800/60 text-purple-300'
                        : 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-300'
                    }`}
                  >
                    {sub.category} #{sub.challenge_number}
                  </span>

                  {/* Status Picker */}
                  <select
                    value={sub.status}
                    disabled={updatingStatusId === sub.id}
                    onChange={(e) =>
                      handleUpdateStatus(sub.id, e.target.value as any)
                    }
                    className={`text-[11px] font-mono-digits font-bold uppercase rounded px-2 py-0.5 border cursor-pointer focus:outline-none ${
                      sub.status === 'winner'
                        ? 'bg-amber-950/60 border-amber-600 text-amber-300'
                        : sub.status === 'reviewed'
                        ? 'bg-blue-950/60 border-blue-600 text-blue-300'
                        : sub.status === 'rejected'
                        ? 'bg-red-950/60 border-red-800 text-red-300'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <option value="submitted">Submitted</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="winner">Winner ★</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <h3 className="font-display font-extrabold text-base text-white tracking-tight line-clamp-1">
                  {sub.challenge_title}
                </h3>

                <div className="text-xs font-mono-digits text-zinc-400 flex items-center justify-between">
                  <span className="font-semibold text-zinc-200">{sub.name}</span>
                  {sub.created_at && (
                    <span className="text-zinc-500 text-[10px]">
                      {new Date(sub.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                {sub.email && (
                  <p className="text-[11px] font-mono-digits text-zinc-500 truncate">
                    {sub.email}
                  </p>
                )}
              </div>

              {/* Card Body: Text or File preview */}
              <div className="space-y-3 pt-2 border-t border-zinc-900">
                {sub.submission_text && (
                  <p className="text-xs text-zinc-300 line-clamp-3 italic font-sans">
                    "{sub.submission_text}"
                  </p>
                )}

                {/* File badge / Image preview */}
                {sub.file_name && (
                  <div className="space-y-1.5">
                    {sub.signed_file_url && sub.file_type?.startsWith('image/') ? (
                      <div className="h-28 rounded-lg overflow-hidden border border-zinc-800 bg-black/50 flex items-center justify-center relative group">
                        <img
                          src={sub.signed_file_url}
                          alt={sub.file_name}
                          className="h-full w-full object-cover"
                        />
                        <a
                          href={sub.signed_file_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-xs font-mono-digits text-white transition-opacity"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Full</span>
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono-digits">
                        <div className="flex items-center space-x-2 truncate max-w-[180px]">
                          <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="text-zinc-300 truncate">{sub.file_name}</span>
                        </div>
                        {sub.signed_file_url && (
                          <a
                            href={sub.signed_file_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-[#ff3b30] hover:underline shrink-0 text-[11px] flex items-center gap-1 font-semibold"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {sub.submission_url && (
                  <div className="text-xs font-mono-digits">
                    <a
                      href={
                        sub.submission_url.startsWith('http')
                          ? sub.submission_url
                          : `https://${sub.submission_url}`
                      }
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-zinc-400 hover:text-white flex items-center gap-1 truncate"
                    >
                      <ExternalLink className="w-3 h-3 text-[#ff3b30] shrink-0" />
                      <span className="truncate">{sub.submission_url}</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Action */}
              <button
                onClick={() => setSelectedSubmission(sub)}
                className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono-digits text-zinc-200 font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View Full Details</span>
                <Eye className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Full Details Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8 space-y-6 text-left shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-mono-digits text-zinc-400 uppercase">
                    <span>{selectedSubmission.category} #{selectedSubmission.challenge_number}</span>
                    <span>•</span>
                    <span className="text-[#ff3b30] font-bold uppercase">{selectedSubmission.status}</span>
                  </div>
                  <h2 className="font-display font-bold text-2xl text-white mt-1">
                    {selectedSubmission.challenge_title}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Creator info */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs font-mono-digits">
                <div>
                  <span className="text-zinc-500 block">CREATOR</span>
                  <span className="text-white font-bold text-sm">{selectedSubmission.name}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">EMAIL</span>
                  <span className="text-zinc-300">{selectedSubmission.email || 'None provided'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">SUBMITTED AT</span>
                  <span className="text-zinc-300">
                    {selectedSubmission.created_at
                      ? new Date(selectedSubmission.created_at).toLocaleString()
                      : 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">SUBMISSION ID</span>
                  <span className="text-zinc-400 font-mono text-[10px] truncate block">
                    {selectedSubmission.id}
                  </span>
                </div>
              </div>

              {/* Status change in modal */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono-digits">
                <span className="text-zinc-300">Update Status:</span>
                <div className="flex gap-2">
                  {(['submitted', 'reviewed', 'winner', 'rejected'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedSubmission.id, st)}
                      className={`px-3 py-1 rounded capitalize font-semibold transition-colors ${
                        selectedSubmission.status === st
                          ? 'bg-white text-black font-bold'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Written content */}
              {selectedSubmission.submission_text && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono-digits uppercase text-zinc-400 tracking-wider">
                    {selectedSubmission.category === 'writing' ? 'Written Submission' : 'Notes'}
                  </h4>
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
                    {selectedSubmission.submission_text}
                  </div>
                </div>
              )}

              {/* Attached file & preview */}
              {selectedSubmission.file_name && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono-digits uppercase text-zinc-400 tracking-wider">
                      Attached File: {selectedSubmission.file_name}
                    </h4>
                    {selectedSubmission.signed_file_url && (
                      <a
                        href={selectedSubmission.signed_file_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-xs font-mono-digits text-[#ff3b30] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Secure File</span>
                      </a>
                    )}
                  </div>

                  {selectedSubmission.signed_file_url &&
                  selectedSubmission.file_type?.startsWith('image/') ? (
                    <div className="rounded-xl overflow-hidden border border-zinc-800 bg-black/60 p-2 flex items-center justify-center">
                      <img
                        src={selectedSubmission.signed_file_url}
                        alt="Submitted work"
                        className="max-h-80 object-contain rounded"
                      />
                    </div>
                  ) : null}
                </div>
              )}

              {/* URL */}
              {selectedSubmission.submission_url && (
                <div className="space-y-1">
                  <h4 className="text-xs font-mono-digits uppercase text-zinc-400 tracking-wider">
                    Submission Link
                  </h4>
                  <a
                    href={
                      selectedSubmission.submission_url.startsWith('http')
                        ? selectedSubmission.submission_url
                        : `https://${selectedSubmission.submission_url}`
                    }
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm font-mono-digits text-[#ff3b30] hover:underline flex items-center gap-1.5"
                  >
                    <span>{selectedSubmission.submission_url}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
