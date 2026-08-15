import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Crown,
  Shield,
  MessageSquare,
  Sparkles,
  KeyRound,
  Clock,
  Calendar,
  Check,
  Copy,
  UserCheck,
} from 'lucide-react';
import { User } from '../types';

interface UserProfileModalProps {
  user: User;
  currentUser: User;
  onClose: () => void;
  onStartDirectMessage: (user: User) => void;
  onOpenAboutOwner?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  currentUser,
  onClose,
  onStartDirectMessage,
  onOpenAboutOwner,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const isMe = user.id === currentUser.id;
  const isOwner = user.isOwner || user.username === 'ghanishtha';

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden my-auto"
      >
        {/* Subtle glowing ambient lighting */}
        {isOwner ? (
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
        ) : (
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
        )}

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Profile Header */}
        <div className="flex flex-col items-center text-center mt-2">
          {/* Avatar / PPF */}
          <div className="relative mb-3">
            <div
              className={`w-24 h-24 rounded-full p-1 shadow-xl ${
                isOwner
                  ? 'bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-300 shadow-amber-500/20'
                  : 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-500/20'
              }`}
            >
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full rounded-full object-cover bg-slate-800"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Online Badge */}
            <div className="absolute bottom-0 right-1 p-1 rounded-full bg-slate-950 border-2 border-slate-900">
              {user.isOnline ? (
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-400" title="Online" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full bg-slate-500" title="Offline" />
              )}
            </div>

            {isOwner && (
              <div className="absolute top-0 right-0 p-1.5 rounded-full bg-amber-500 text-slate-950 shadow-md border-2 border-slate-900">
                <Crown className="w-3.5 h-3.5 fill-slate-950" />
              </div>
            )}
          </div>

          {/* Name & Role */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <h2 className="text-xl font-bold text-white tracking-tight">{user.name}</h2>
            {isOwner && (
              <span className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" />
                &lt;Owner&gt;
              </span>
            )}
            {!isOwner && user.isAdmin && (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/40 text-blue-300 font-mono text-[11px] font-bold flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-400" />
                Admin
              </span>
            )}
            {!isOwner && !user.isAdmin && (
              <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">
                Member
              </span>
            )}
          </div>

          <p className="text-xs font-mono text-emerald-400 mt-1">@{user.username}</p>

          {/* Status Message / Mood */}
          {user.statusMessage && (
            <div className="mt-3 px-3 py-1.5 rounded-full bg-slate-800/70 border border-slate-700/60 text-xs text-slate-300 flex items-center gap-1.5 max-w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">{user.statusMessage}</span>
            </div>
          )}
        </div>

        {/* Bio / About Box */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>About</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
            {user.bio || 'No bio written yet.'}
          </p>
        </div>

        {/* Account Details / Stats */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Joined</p>
              <p className="text-white text-xs truncate">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Verified Member'}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Security</p>
              <p className="text-emerald-400 text-xs truncate">E2EE Verified</p>
            </div>
          </div>
        </div>

        {/* Passcode (Only visible if viewing own profile or if Admin/Owner) */}
        {(isMe || currentUser.isOwner || currentUser.isAdmin) && user.code && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-amber-300/80 uppercase font-semibold">
                  {isMe ? 'Your Passkey' : "User's Passkey"}
                </p>
                <p className="text-xs font-mono font-bold text-amber-300 truncate">{user.code}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopyCode(user.code)}
              className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors cursor-pointer"
              title="Copy Passkey"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex items-center gap-2">
          {!isMe ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartDirectMessage(user);
              }}
              className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-950/50"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-slate-950" />
              <span>Send Direct Message</span>
            </button>
          ) : (
            <div className="flex-1 py-2 text-center text-xs text-slate-400 font-medium">
              (This is your active profile)
            </div>
          )}

          {isOwner && onOpenAboutOwner && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAboutOwner();
              }}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>About Owner</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
