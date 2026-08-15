import React, { useState, useEffect } from 'react';
import {
  Crown,
  Search,
  MessageSquare,
  Users,
  Shield,
  ShieldAlert,
  Settings,
  LogOut,
  UserPlus,
  Radio,
  X,
  Sparkles,
  Info,
  Trash2,
  AlertTriangle,
  User as UserIcon,
  Smile,
  Edit3,
} from 'lucide-react';
import { User, OwnerInfo } from '../types';

interface SidebarProps {
  currentUser: User;
  ownerInfo: OwnerInfo;
  activeChannelId: string;
  onSelectChannel: (channelId: string, title: string, subtitle?: string, targetUser?: User | null) => void;
  onlineUserIds: string[];
  onOpenAboutOwner: () => void;
  onOpenAdminPanel: () => void;
  onOpenProfileSetup: () => void;
  onViewUserProfile: (user: User) => void;
  onLogout: () => void;
  onDeleteAccount?: () => Promise<void>;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  ownerInfo,
  activeChannelId,
  onSelectChannel,
  onlineUserIds,
  onOpenAboutOwner,
  onOpenAdminPanel,
  onOpenProfileSetup,
  onViewUserProfile,
  onLogout,
  onDeleteAccount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Track active DM user IDs locally per user account
  const [activeDMUserIds, setActiveDMUserIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`fc_active_dms_${currentUser.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addActiveDM = (userId: string) => {
    setActiveDMUserIds((prev) => {
      if (prev.includes(userId)) return prev;
      const next = [...prev, userId];
      try {
        localStorage.setItem(`fc_active_dms_${currentUser.id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isCurrentOwner = currentUser.isOwner || currentUser.username === 'ghanishtha';

  // Fetch users for username search and friend list
  const fetchUsers = async (query = '') => {
    setSearching(true);
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const list = await res.json();
        if (query) {
          setSearchResults(list.filter((u: User) => u.id !== currentUser.id));
        } else {
          setAllUsers(list);
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    fetchUsers(searchQuery);
  }, [searchQuery]);

  // Derived DM channel ID between 2 users
  const getDMChannelId = (userA: string, userB: string) => {
    const sorted = [userA, userB].sort();
    return `dm:${sorted[0]}:${sorted[1]}`;
  };

  const isOwnerOnline =
    onlineUserIds.includes('user-ghanishtha') ||
    allUsers.find((u) => u.username === 'ghanishtha')?.isOnline ||
    true;

  // Handle click on Owner (for friends only)
  const handleSelectOwner = () => {
    if (isCurrentOwner) return; // Owner shouldn't DM themselves

    const ownerUser = allUsers.find((u) => u.username === 'ghanishtha' || u.isOwner) || {
      id: 'user-ghanishtha',
      code: 'GHANISHTHA-OWNER',
      name: ownerInfo.name,
      username: ownerInfo.username,
      avatar: ownerInfo.avatar,
      bio: ownerInfo.bio,
      statusMessage: ownerInfo.statusMessage,
      isOwner: true,
      isAdmin: true,
      createdAt: '',
    };

    const dmId = getDMChannelId(currentUser.id, ownerUser.id);
    const statusText = ownerInfo.statusMessage || ownerInfo.bio || 'Online';
    onSelectChannel(dmId, ownerInfo.name, `@${ownerInfo.username} - ${statusText}`, ownerUser);
    onCloseMobile();
  };

  const handleSelectFriend = (friend: User) => {
    addActiveDM(friend.id);
    const dmId = getDMChannelId(currentUser.id, friend.id);
    const statusText =
      friend.statusMessage ||
      friend.bio ||
      (onlineUserIds.includes(friend.id) || friend.isOnline ? 'Online' : 'Offline');
    onSelectChannel(dmId, friend.name, `@${friend.username} - ${statusText}`, friend);
    setSearchQuery('');
    onCloseMobile();
  };

  const handleSelectLounge = () => {
    onSelectChannel('lounge', 'G-Chat Lounge', '#general • Encrypted Group Chat', null);
    onCloseMobile();
  };

  // Find users for Direct Messages: only show contacts the user has active conversation with
  const otherFriends = allUsers.filter((u) => {
    if (u.id === currentUser.id) return false;
    if (!isCurrentOwner && (u.isOwner || u.username === 'ghanishtha')) return false;
    return activeDMUserIds.includes(u.id);
  });

  return (
    <aside
      className={`fixed md:static inset-y-0 left-0 z-40 w-80 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
        isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-950/50">
            <Shield className="w-4 h-4 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              G-Chat
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                E2EE
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">Zero-Knowledge Private Chat</p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* TOP PINNED SECTION: GHANISHTHA <Owner> */}
      <div className="p-3 border-b border-slate-800/90 bg-gradient-to-b from-amber-500/10 via-slate-900/80 to-transparent">
        <div className="flex items-center justify-between text-[11px] font-semibold text-amber-300 uppercase tracking-wider mb-2 px-1">
          <span className="flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-amber-400" />{' '}
            {isCurrentOwner ? 'Your Owner Console' : 'Platform Owner (Direct Line)'}
          </span>
          <button
            type="button"
            onClick={onOpenAboutOwner}
            className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer"
            title="Read About Ghanishtha"
          >
            <Info className="w-3 h-3" /> About
          </button>
        </div>

        {isCurrentOwner ? (
          /* When logged in as Ghanishtha: Clean owner console card (no self DM bug) */
          <div className="w-full p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-left flex items-center justify-between">
            <button
              type="button"
              onClick={() => onViewUserProfile(currentUser)}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
              title="Click to view full owner profile"
            >
              <div className="relative shrink-0">
                <img
                  src={ownerInfo.avatar}
                  alt={ownerInfo.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shadow-md"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                    {ownerInfo.name}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-400/30 text-amber-300 border border-amber-400/50 text-[9px] font-mono font-bold">
                    &lt;Owner&gt;
                  </span>
                </div>
                <p className="text-[11px] text-emerald-400 font-mono truncate">@{ownerInfo.username}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={onOpenAdminPanel}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              title="Open Admin Dashboard & Manage Codes"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Admin Room</span>
            </button>
          </div>
        ) : (
          /* When logged in as a Friend: Direct DM to Owner */
          <button
            type="button"
            onClick={handleSelectOwner}
            className={`w-full p-2.5 rounded-xl border transition-all text-left flex items-center gap-3 cursor-pointer group ${
              activeChannelId.includes('user-ghanishtha')
                ? 'bg-amber-500/20 border-amber-500/50 shadow-md shadow-amber-950/30'
                : 'bg-slate-950/70 border-amber-500/30 hover:border-amber-500/60 hover:bg-slate-950'
            }`}
          >
            <div
              className="relative shrink-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const ownerUser = allUsers.find((u) => u.username === 'ghanishtha' || u.isOwner) || {
                  id: 'user-ghanishtha',
                  code: 'GHANISHTHA-OWNER',
                  name: ownerInfo.name,
                  username: ownerInfo.username,
                  avatar: ownerInfo.avatar,
                  bio: ownerInfo.bio,
                  isOwner: true,
                  isAdmin: true,
                  createdAt: '',
                };
                onViewUserProfile(ownerUser);
              }}
              title="Click to view Profile Details"
            >
              <img
                src={ownerInfo.avatar}
                alt={ownerInfo.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shadow-md hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              {isOwnerOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                  {ownerInfo.name}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-mono font-bold">
                  &lt;Owner&gt;
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">@{ownerInfo.username}</p>
            </div>

            <span className="text-[10px] px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold group-hover:scale-105 transition-transform shadow-sm">
              DM
            </span>
          </button>
        )}
      </div>

      {/* SEARCH BY USERNAME (For finding friends) */}
      <div className="p-3 border-b border-slate-800/90">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people by @username..."
            className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* CHANNEL & CONVERSATION LIST */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Search Results if user is searching */}
        {searchQuery ? (
          <div className="space-y-1">
            <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Search Results</span>
              {searching && <span className="text-[10px] text-emerald-400 animate-pulse">Searching...</span>}
            </div>

            {searchResults.length === 0 && !searching ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No user found matching "@{searchQuery}"
              </div>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="w-full p-2 rounded-xl bg-slate-950/40 hover:bg-slate-800/80 border border-transparent hover:border-slate-700/60 transition-all flex items-center justify-between"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectFriend(user)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewUserProfile(user);
                      }}
                      className="w-8 h-8 rounded-full object-cover bg-slate-800 shrink-0 hover:ring-2 hover:ring-emerald-400 transition-all"
                      referrerPolicy="no-referrer"
                      title="View Profile Details"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-emerald-400 font-mono truncate">
                        @{user.username} - {user.statusMessage || user.bio || 'Active'}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onViewUserProfile(user)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="View Profile"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectFriend(user)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors cursor-pointer"
                    >
                      Chat
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            {/* General Lounge Channel */}
            <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Public Spaces
            </div>

            <button
              type="button"
              onClick={handleSelectLounge}
              className={`w-full p-2.5 rounded-xl transition-all text-left flex items-center gap-2.5 cursor-pointer ${
                activeChannelId === 'lounge'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                #
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold truncate">G-Chat Lounge</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                    All Friends
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">Encrypted community lounge</p>
              </div>
            </button>

            {/* Direct Messages with Friends */}
            <div className="pt-3">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Direct Encrypted DMs</span>
                <span className="text-[10px] text-slate-500 font-mono">{otherFriends.length}</span>
              </div>

              {otherFriends.length === 0 ? (
                <div className="p-3 text-center text-[11px] text-slate-500">
                  {isCurrentOwner
                    ? 'No other friends have joined yet. Use Admin Room to add accounts or passcodes!'
                    : 'Search above by @username to start a private encrypted chat with a friend.'}
                </div>
              ) : (
                <div className="space-y-1 mt-1">
                  {otherFriends.map((friend) => {
                    const dmId = getDMChannelId(currentUser.id, friend.id);
                    const isActive = activeChannelId === dmId;
                    const isFriendOnline = onlineUserIds.includes(friend.id) || friend.isOnline;

                    return (
                      <div
                        key={friend.id}
                        className={`w-full p-2 rounded-xl transition-all flex items-center justify-between group ${
                          isActive
                            ? 'bg-slate-800 border border-slate-700 text-white'
                            : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectFriend(friend)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={friend.avatar}
                              alt={friend.name}
                              className="w-8 h-8 rounded-full object-cover bg-slate-800"
                              referrerPolicy="no-referrer"
                            />
                            {isFriendOnline && (
                              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{friend.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              @{friend.username} - {friend.statusMessage || friend.bio || (isFriendOnline ? 'Online' : 'Offline')}
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => onViewUserProfile(friend)}
                          className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700/80 transition-colors cursor-pointer opacity-80 group-hover:opacity-100 shrink-0"
                          title="View Profile Details"
                        >
                          <UserIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* USER PROFILE & TOOLBAR FOOTER */}
      <div className="p-3 border-t border-slate-800/90 bg-slate-950/90 space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Current User Pill */}
          <button
            type="button"
            onClick={() => onViewUserProfile(currentUser)}
            className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group flex-1"
            title="View your detailed profile"
          >
            <div className="relative shrink-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-9 h-9 rounded-full object-cover bg-slate-800 border border-emerald-500/40 group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                  {currentUser.name}
                </span>
                {currentUser.isOwner ? (
                  <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                ) : currentUser.isAdmin ? (
                  <Shield className="w-3 h-3 text-blue-400 shrink-0" />
                ) : null}
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate flex items-center gap-1">
                <span className="text-emerald-400/90 shrink-0">@{currentUser.username}</span>
                <span className="text-slate-500 shrink-0">-</span>
                <span className="text-slate-300 truncate" title={currentUser.statusMessage || currentUser.bio || 'Online'}>
                  {currentUser.statusMessage || currentUser.bio || 'Online'}
                </span>
              </div>
            </div>
          </button>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onOpenProfileSetup}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Edit Profile (Name, Photo, Status, Bio)"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {onDeleteAccount && (
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(true)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/80 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Delete Account"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Change Code / Exit"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Admin Panel Button (if Owner or Admin) */}
        {(currentUser.isOwner || currentUser.isAdmin) && (
          <button
            type="button"
            onClick={onOpenAdminPanel}
            className="w-full py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin Room (Manage Codes &amp; Accounts)</span>
          </button>
        )}
      </div>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteAccountModal && (
        <div
          className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (!deletingAccount) {
              setShowDeleteAccountModal(false);
              setDeleteError(null);
            }
          }}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white text-center">Delete Your Account?</h3>
            <p className="text-xs text-slate-400 text-center mt-1.5 leading-relaxed">
              Are you sure you want to permanently delete your account (@{currentUser.username})? Your passkey and profile will be deleted.
            </p>

            {deleteError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs text-center font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteAccountModal(false);
                  setDeleteError(null);
                }}
                disabled={deletingAccount}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={async () => {
                  if (!onDeleteAccount) return;
                  setDeletingAccount(true);
                  setDeleteError(null);
                  try {
                    await onDeleteAccount();
                  } catch (err: any) {
                    setDeleteError(err.message || 'Failed to delete account');
                    setDeletingAccount(false);
                  }
                }}
                className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingAccount ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
