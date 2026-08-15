import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Crown, MessageSquare, Shield, Globe, Mail, Github, Twitter, Send, Edit3, Check, X, Sparkles } from 'lucide-react';
import { OwnerInfo, User } from '../types';

interface AboutOwnerModalProps {
  ownerInfo: OwnerInfo;
  currentUser: User;
  onClose: () => void;
  onDirectMessage: (ownerUsername: string) => void;
  onUpdateOwnerInfo?: (updated: OwnerInfo) => Promise<void>;
}

export const AboutOwnerModal: React.FC<AboutOwnerModalProps> = ({
  ownerInfo,
  currentUser,
  onClose,
  onDirectMessage,
  onUpdateOwnerInfo,
}) => {
  const isOwnerOrAdmin = currentUser.isOwner || currentUser.isAdmin;
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<OwnerInfo>({ ...ownerInfo });
  const [saving, setSaving] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateOwnerInfo) return;
    setSaving(true);
    try {
      await onUpdateOwnerInfo(formData);
      setIsEditing(false);
      setStatusText('Owner information updated successfully!');
      setTimeout(() => setStatusText(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update owner profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl relative my-auto overflow-hidden"
      >
        {/* Glowing aura */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {!isEditing ? (
          <div>
            {/* Header / Avatar */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-3">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-300 shadow-xl shadow-amber-500/20">
                  <img
                    src={ownerInfo.avatar}
                    alt={ownerInfo.name}
                    className="w-full h-full rounded-full object-cover bg-slate-800"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-amber-500 text-slate-950 shadow-lg border-2 border-slate-900">
                  <Crown className="w-4 h-4 fill-slate-950" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">{ownerInfo.name}</h2>
                <span className="px-2.5 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono text-xs font-bold flex items-center gap-1 shadow-sm">
                  <Crown className="w-3 h-3 text-amber-400" />
                  &lt;Owner&gt;
                </span>
              </div>

              <p className="text-sm font-mono text-emerald-400 mt-0.5">@{ownerInfo.username}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">{ownerInfo.title}</p>

              {ownerInfo.statusMessage && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/70 text-xs text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{ownerInfo.statusMessage}</span>
                </div>
              )}
            </div>

            {/* Bio */}
            <div className="mt-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                About Ghanishtha &amp; G-Chat
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{ownerInfo.bio}</p>
            </div>

            {/* Skills / Badges */}
            {ownerInfo.skillsOrInterests && ownerInfo.skillsOrInterests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ownerInfo.skillsOrInterests.map((skill, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700/60 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Social & Contact Links */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {ownerInfo.contactEmail && (
                <a
                  href={`mailto:${ownerInfo.contactEmail}`}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60 flex items-center gap-1.5 text-xs"
                >
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Email</span>
                </a>
              )}
              {ownerInfo.socialLinks?.github && (
                <a
                  href={ownerInfo.socialLinks.github}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60 flex items-center gap-1.5 text-xs"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
              )}
              {ownerInfo.socialLinks?.twitter && (
                <a
                  href={ownerInfo.socialLinks.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60 flex items-center gap-1.5 text-xs"
                >
                  <Twitter className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Twitter/X</span>
                </a>
              )}
              {ownerInfo.socialLinks?.telegram && (
                <a
                  href={ownerInfo.socialLinks.telegram}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60 flex items-center gap-1.5 text-xs"
                >
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  <span>Telegram</span>
                </a>
              )}
            </div>

            {statusText && (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 text-center">
                {statusText}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDirectMessage(ownerInfo.username);
                }}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
              >
                <MessageSquare className="w-4 h-4 fill-slate-950" />
                <span>Message Ghanishtha Directly</span>
              </button>

              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
                >
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span>Edit About Owner</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Inline Edit Form for Owner */
          <form onSubmit={handleSave} className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                Edit About Owner
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Username Handle
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                Title / Subtitle
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                Avatar Image URL
              </label>
              <input
                type="text"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                Status Message
              </label>
              <input
                type="text"
                value={formData.statusMessage}
                onChange={(e) => setFormData({ ...formData, statusMessage: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                About / Bio Description
              </label>
              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail || ''}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="name@email.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Telegram Link / Handle
                </label>
                <input
                  type="text"
                  value={formData.socialLinks?.telegram || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, telegram: e.target.value },
                    })
                  }
                  placeholder="https://t.me/..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Owner Info</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
