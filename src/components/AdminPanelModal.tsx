import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShieldAlert,
  Key,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  RefreshCw,
  UserCheck,
  Sparkles,
  AlertTriangle,
  Lock,
  Radio,
  Sliders,
  UserPlus,
  Users,
  Shield,
  Crown,
  Share2,
} from 'lucide-react';
import { AccessCode, OwnerInfo, User } from '../types';

interface AdminPanelModalProps {
  adminCode: string;
  currentUser: User;
  ownerInfo: OwnerInfo;
  onClose: () => void;
  onUpdateOwnerInfo: (info: OwnerInfo) => Promise<void>;
  onUpdateAdminCode?: (newCode: string) => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  adminCode,
  currentUser,
  ownerInfo,
  onClose,
  onUpdateOwnerInfo,
  onUpdateAdminCode,
}) => {
  const [activeTab, setActiveTab] = useState<'create-account' | 'codes' | 'owner' | 'security'>('create-account');
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ usersCount: 0, messagesCount: 0 });

  // Direct Account Creation State (For onboarding friends without them signing up)
  const [friendName, setFriendName] = useState('');
  const [friendUsername, setFriendUsername] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [friendBio, setFriendBio] = useState('');
  const [friendStatus, setFriendStatus] = useState('');
  const [friendIsAdmin, setFriendIsAdmin] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createAccountSuccess, setCreateAccountSuccess] = useState<{
    name: string;
    username: string;
    passcode: string;
  } | null>(null);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  // Add Code State
  const [newCodeVal, setNewCodeVal] = useState('');
  const [newCodeLabel, setNewCodeLabel] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [addingCode, setAddingCode] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Code State
  const [editingCode, setEditingCode] = useState<AccessCode | null>(null);
  const [editVal, setEditVal] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editRevoked, setEditRevoked] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Owner Info Edit State
  const [editOwnerName, setEditOwnerName] = useState(ownerInfo.name);
  const [editOwnerUsername, setEditOwnerUsername] = useState(ownerInfo.username);
  const [editOwnerAvatar, setEditOwnerAvatar] = useState(ownerInfo.avatar);
  const [editOwnerBio, setEditOwnerBio] = useState(ownerInfo.bio);
  const [savingOwner, setSavingOwner] = useState(false);
  const [ownerSavedToast, setOwnerSavedToast] = useState(false);

  // Copied feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // In-app Delete Confirmation & Action Status (Replaces blocked window.confirm / window.alert in iframes)
  const [pendingDelete, setPendingDelete] = useState<{
    type: 'code' | 'user';
    targetId: string;
    displayName: string;
    detail: string;
  } | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch codes and registered users
  const fetchCodes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/codes', {
        headers: {
          'x-admin-code': adminCode,
          'x-user-id': currentUser.id,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes || []);
        setRegisteredUsers(data.users || []);
        setStats({
          usersCount: data.usersCount || (data.users ? data.users.length : 0),
          messagesCount: data.messagesCount || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load admin codes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [adminCode]);

  const handleGenerateRandomPasscode = (uname = '') => {
    const clean = (uname || 'FRIEND').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${clean || 'FRIEND'}-${num}`;
  };

  const handleCreateFriendAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAccountError(null);
    setCreateAccountSuccess(null);
    setCreatingAccount(true);

    try {
      let finalCode = friendCode.trim().toUpperCase();
      if (!finalCode) {
        finalCode = handleGenerateRandomPasscode(friendUsername || friendName);
      }

      const res = await fetch('/api/admin/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-code': adminCode,
        },
        body: JSON.stringify({
          name: friendName.trim(),
          username: friendUsername.trim().toLowerCase().replace(/^@/, ''),
          code: finalCode,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${friendUsername.trim().toLowerCase() || Date.now()}`,
          bio: friendBio.trim() || 'Added by Owner • G-Chat VIP Friend',
          statusMessage: friendStatus.trim() || 'Ready to chat',
          isAdminUser: friendIsAdmin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create friend account');
      }

      setCreateAccountSuccess({
        name: friendName.trim(),
        username: friendUsername.trim().toLowerCase().replace(/^@/, ''),
        passcode: finalCode,
      });

      // Clear inputs
      setFriendName('');
      setFriendUsername('');
      setFriendCode('');
      setFriendBio('');
      setFriendStatus('');
      setFriendIsAdmin(false);

      await fetchCodes();
    } catch (err: any) {
      setCreateAccountError(err.message || 'Error creating account');
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddingCode(true);

    try {
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-code': adminCode,
        },
        body: JSON.stringify({
          code: newCodeVal.trim().toUpperCase(),
          label: newCodeLabel.trim(),
          isAdminCode: newIsAdmin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create access code');
      }

      setNewCodeVal('');
      setNewCodeLabel('');
      setNewIsAdmin(false);
      await fetchCodes();
    } catch (err: any) {
      setAddError(err.message || 'Error adding code');
    } finally {
      setAddingCode(false);
    }
  };

  const handleStartEdit = (c: AccessCode) => {
    setEditingCode(c);
    setEditVal(c.code);
    setEditLabel(c.label || '');
    setEditRevoked(Boolean(c.isRevoked));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCode) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/admin/codes/${encodeURIComponent(editingCode.code)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-code': adminCode,
        },
        body: JSON.stringify({
          newCode: editVal.trim().toUpperCase(),
          label: editLabel.trim(),
          isRevoked: editRevoked,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update access code');
      }

      // If we modified our own active code, notify parent
      if (editingCode.code.toUpperCase() === adminCode.toUpperCase() && onUpdateAdminCode) {
        onUpdateAdminCode(editVal.trim().toUpperCase());
      }

      setEditingCode(null);
      await fetchCodes();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', message: err.message || 'Failed to update code' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePromptDeleteCode = (c: AccessCode) => {
    if (c.isOwnerCode || c.code === 'GHANISHTHA-OWNER' || c.code === 'OWNERISGOOD') {
      setFeedbackMsg({ type: 'error', message: 'Cannot delete the primary Owner passkey.' });
      setTimeout(() => setFeedbackMsg(null), 3500);
      return;
    }

    setPendingDelete({
      type: 'code',
      targetId: c.code,
      displayName: `Passkey "${c.code}"`,
      detail: c.userUsername
        ? `Tied to member @${c.userUsername} (${c.userName}). Deleting will revoke their passkey and permanently delete their account.`
        : `Label: "${c.label || 'Unassigned passkey'}"`,
    });
  };

  const handlePromptDeleteUser = (u: User) => {
    if (u.isOwner || u.id === 'user-ghanishtha' || u.username === 'ghanishtha') {
      setFeedbackMsg({ type: 'error', message: 'Cannot delete the primary Owner account.' });
      setTimeout(() => setFeedbackMsg(null), 3500);
      return;
    }

    setPendingDelete({
      type: 'user',
      targetId: u.id,
      displayName: `@${u.username} (${u.name})`,
      detail: `Passcode: "${u.code}". Deleting will permanently remove their member profile, contacts, and passkey.`,
    });
  };

  // Perform confirmed deletion
  const handleExecuteConfirmedDelete = async () => {
    if (!pendingDelete) return;
    setDeletingInProgress(true);
    setFeedbackMsg(null);

    try {
      const endpoint =
        pendingDelete.type === 'code'
          ? `/api/admin/codes/${encodeURIComponent(pendingDelete.targetId)}`
          : `/api/admin/users/${encodeURIComponent(pendingDelete.targetId)}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'x-admin-code': adminCode,
          'x-user-id': currentUser.id,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete record');
      }

      setFeedbackMsg({
        type: 'success',
        message: `Successfully deleted ${pendingDelete.displayName}.`,
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
      setPendingDelete(null);
      await fetchCodes();
    } catch (err: any) {
      console.error(err);
      setFeedbackMsg({
        type: 'error',
        message: err.message || 'Failed to execute deletion.',
      });
    } finally {
      setDeletingInProgress(false);
    }
  };

  const handleSaveOwnerInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOwner(true);
    try {
      await onUpdateOwnerInfo({
        name: editOwnerName.trim(),
        username: editOwnerUsername.trim().toLowerCase().replace(/^@/, ''),
        avatar: editOwnerAvatar.trim(),
        bio: editOwnerBio.trim(),
        socials: ownerInfo.socials,
      });
      setOwnerSavedToast(true);
      setTimeout(() => setOwnerSavedToast(false), 3000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', message: err.message || 'Failed to save owner info' });
    } finally {
      setSavingOwner(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/90 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Owner &amp; Admin Dashboard
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono font-bold">
                  &lt;Ghanishtha&gt;
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Directly add friends with passcodes, edit access keys, and customize owner profile
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Action Feedback Banner */}
        {feedbackMsg && (
          <div
            className={`mb-3 p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 shrink-0 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/15 border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{feedbackMsg.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4 shrink-0">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Registered Accounts
            </span>
            <span className="text-lg sm:text-xl font-bold text-white font-mono">{stats.usersCount}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Passkeys
            </span>
            <span className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">{codes.length}</span>
          </div>

          <div className="hidden sm:block p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Encrypted Messages
            </span>
            <span className="text-lg sm:text-xl font-bold text-cyan-400 font-mono">{stats.messagesCount}</span>
          </div>
        </div>

        {/* Tabs navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800/80 mb-4 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('create-account')}
            className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'create-account'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Friend Account</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('codes')}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'codes'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Manage Codes ({codes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('owner')}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'owner'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Edit Owner Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>System Info</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: ADD FRIEND ACCOUNT DIRECTLY */}
          {activeTab === 'create-account' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Instant Friend Onboarding (No Signup Required)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Create a ready-to-use account for your friend with their pre-assigned passcode. Your friend simply enters this passcode on the login screen and will be directly logged into G-Chat with their name, @username, and avatar!
                </p>
              </div>

              {/* Success Notification with Share Box */}
              {createAccountSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <Check className="w-4 h-4" />
                      <span>Account Created Successfully for {createAccountSuccess.name}!</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreateAccountSuccess(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Friend's Passcode</p>
                      <p className="text-base font-mono font-bold text-emerald-400">{createAccountSuccess.passcode}</p>
                      <p className="text-[10px] text-slate-500">Handle: @{createAccountSuccess.username}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(createAccountSuccess.passcode)}
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      {copiedCode === createAccountSuccess.passcode ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Passcode</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {createAccountError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{createAccountError}</span>
                </div>
              )}

              {/* Account Form */}
              <form onSubmit={handleCreateFriendAccount} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Friend's Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={friendName}
                      onChange={(e) => {
                        setFriendName(e.target.value);
                        if (!friendUsername) {
                          setFriendUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                        }
                      }}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Friend's @Username Handle *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-emerald-400 font-mono">@</span>
                      <input
                        type="text"
                        required
                        value={friendUsername}
                        onChange={(e) => setFriendUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="rahul"
                        className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Passcode with Auto-Gen button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Access Passcode / Code (Leave empty to auto-generate)
                    </label>
                    <button
                      type="button"
                      onClick={() => setFriendCode(handleGenerateRandomPasscode(friendUsername || friendName))}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-mono"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={friendCode}
                    onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FRIEND-RAHUL-7842"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Bio / Description
                    </label>
                    <input
                      type="text"
                      value={friendBio}
                      onChange={(e) => setFriendBio(e.target.value)}
                      placeholder="e.g. College best friend • Verified VIP"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Status Message / Mood
                    </label>
                    <input
                      type="text"
                      value={friendStatus}
                      onChange={(e) => setFriendStatus(e.target.value)}
                      placeholder="e.g. Available for late-night chat"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={friendIsAdmin}
                      onChange={(e) => setFriendIsAdmin(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Grant Admin Room Permissions</span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={creatingAccount}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {creatingAccount ? (
                      <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create Account &amp; Generate Passcode</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: MANAGE ACCESS CODES */}
          {activeTab === 'codes' && (
            <div className="space-y-4">
              {/* Add Simple Passkey Form */}
              <form onSubmit={handleAddCode} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-emerald-400" /> Add New Passkey
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const num = Math.floor(1000 + Math.random() * 9000);
                      setNewCodeVal(`FRIEND-${num}`);
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Auto Code
                  </button>
                </div>

                {addError && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                    {addError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={newCodeVal}
                      onChange={(e) => setNewCodeVal(e.target.value.toUpperCase())}
                      placeholder="CODE VALUE (e.g. VIP-789)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newCodeLabel}
                      onChange={(e) => setNewCodeLabel(e.target.value)}
                      placeholder="Label (e.g. Rahul's Pass)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsAdmin}
                      onChange={(e) => setNewIsAdmin(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Admin Code</span>
                  </label>

                  <button
                    type="submit"
                    disabled={addingCode}
                    className="py-1.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {addingCode ? 'Adding...' : 'Save Passkey'}
                  </button>
                </div>
              </form>

              {/* Codes List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 text-xs text-slate-400">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" /> Active Passkeys ({codes.length})
                  </span>
                  <button
                    type="button"
                    onClick={fetchCodes}
                    className="hover:text-white flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-xs text-slate-500">Loading access codes...</div>
                ) : (
                  <div className="space-y-2">
                    {codes.map((c) => (
                      <div
                        key={c.code}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          c.isRevoked
                            ? 'bg-slate-950/40 border-red-500/20 opacity-60'
                            : c.isOwnerCode
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-white tracking-wide">{c.code}</span>
                            {c.isOwnerCode && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-mono font-bold">
                                &lt;Owner Code&gt;
                              </span>
                            )}
                            {c.isAdminCode && !c.isOwnerCode && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[9px] font-mono">
                                Admin
                              </span>
                            )}
                            {c.isRevoked && (
                              <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[9px] font-mono">
                                Revoked
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                            <span>{c.label || 'Standard Passkey'}</span>
                            {c.userUsername && (
                              <span className="text-emerald-400 font-mono">(@{c.userUsername})</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(c.code)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                            title="Copy code"
                          >
                            {copiedCode === c.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(c)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                            title="Edit code"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!c.isOwnerCode && (
                            <button
                              type="button"
                              onClick={() => handlePromptDeleteCode(c)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                              title="Delete passkey & account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Registered User Accounts Section */}
              {registeredUsers.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between px-1 text-xs text-slate-400">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" /> Registered Accounts ({registeredUsers.length})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {registeredUsers.map((u) => {
                      const isOwnerUser = u.isOwner || u.id === 'user-ghanishtha' || u.username === 'ghanishtha';
                      return (
                        <div
                          key={u.id}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                            isOwnerUser
                              ? 'bg-amber-500/10 border-amber-500/30'
                              : 'bg-slate-950/70 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white truncate">{u.name}</span>
                                <span className="text-[11px] text-emerald-400 font-mono">@{u.username}</span>
                                {isOwnerUser ? (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-mono font-bold">
                                    Owner
                                  </span>
                                ) : u.isAdmin ? (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[9px] font-mono">
                                    Admin
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span className="font-mono">Passcode: {u.code}</span>
                                {u.isOnline && (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {!isOwnerUser && (
                            <button
                              type="button"
                              onClick={() => handlePromptDeleteUser(u)}
                              className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                              title="Permanently delete user account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Account</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EDIT OWNER PROFILE */}
          {activeTab === 'owner' && (
            <form onSubmit={handleSaveOwnerInfo} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Crown className="w-4 h-4" /> Ghanishtha Profile Details
                </span>
                {ownerSavedToast && (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Saved!
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Display Name</label>
                  <input
                    type="text"
                    required
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Owner @Username</label>
                  <input
                    type="text"
                    required
                    value={editOwnerUsername}
                    onChange={(e) => setEditOwnerUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Avatar Image URL</label>
                <input
                  type="url"
                  required
                  value={editOwnerAvatar}
                  onChange={(e) => setEditOwnerAvatar(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">About Owner / Bio</label>
                <textarea
                  rows={4}
                  value={editOwnerBio}
                  onChange={(e) => setEditOwnerBio(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingOwner}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {savingOwner ? 'Saving...' : 'Update Owner Profile'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: SYSTEM INFO */}
          {activeTab === 'security' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" /> Platform Security &amp; End-to-End Encryption
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="font-bold text-white block mb-1">Zero-Knowledge Key Architecture</span>
                  <p className="text-slate-400 leading-relaxed">
                    All chat messages and voice files are encrypted with AES-256-GCM via client-side Web Crypto. Plaintext is never stored on the server.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="font-bold text-white block mb-1">Owner Master Passcode</span>
                  <p className="text-slate-400">
                    The owner master login password is <code className="font-mono text-amber-300 font-bold">ownerisgood</code>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit Single Code Modal Sub-dialog */}
        {editingCode && (
          <div
            className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingCode(null)}
          >
            <div
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-3 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-bold text-white">Edit Passkey: {editingCode.code}</h3>

              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">New Code Value</label>
                  <input
                    type="text"
                    required
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Label</label>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRevoked}
                      onChange={(e) => setEditRevoked(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-red-500"
                    />
                    <span>Revoke / Disable this Code</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCode(null)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* In-App Delete Confirmation Modal (100% reliable inside iframe) */}
        {pendingDelete && (
          <div
            className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              if (!deletingInProgress) setPendingDelete(null);
            }}
          >
            <div
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-white">
                  Delete {pendingDelete.type === 'code' ? 'Passkey' : 'Account'}?
                </h3>
                <p className="text-xs font-mono font-bold text-amber-300">
                  {pendingDelete.displayName}
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  {pendingDelete.detail}
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={deletingInProgress}
                  onClick={() => setPendingDelete(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingInProgress}
                  onClick={handleExecuteConfirmedDelete}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-red-600/30"
                >
                  {deletingInProgress ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
