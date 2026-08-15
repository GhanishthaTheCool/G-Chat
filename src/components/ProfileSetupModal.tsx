import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { User, Camera, Sparkles, Check, AtSign, FileText, Smile, Shield } from 'lucide-react';

interface ProfileSetupModalProps {
  code: string;
  initialName?: string;
  initialUsername?: string;
  initialAvatar?: string;
  initialBio?: string;
  initialStatus?: string;
  isOwner?: boolean;
  onSave: (profile: {
    name: string;
    username: string;
    avatar: string;
    bio: string;
    statusMessage: string;
  }) => Promise<void>;
  isFirstTime?: boolean;
  onClose?: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=300&auto=format&fit=crop&q=80',
  'https://api.dicebear.com/7.x/bottts/svg?seed=cypher1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=neonPulse',
];

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  code,
  initialName = '',
  initialUsername = '',
  initialAvatar = '',
  initialBio = '',
  initialStatus = '',
  isOwner = false,
  onSave,
  isFirstTime = true,
  onClose,
}) => {
  const [name, setName] = useState(initialName || (isOwner ? 'Ghanishtha' : ''));
  const [username, setUsername] = useState(initialUsername || (isOwner ? 'ghanishtha' : ''));
  const [avatar, setAvatar] = useState(
    initialAvatar || (isOwner ? PRESET_AVATARS[0] : `https://api.dicebear.com/7.x/bottts/svg?seed=${code}`)
  );
  const [bio, setBio] = useState(initialBio || (isOwner ? 'Platform Owner & Architect 🛡️' : 'Encrypted friends circle member 🔒'));
  const [statusMessage, setStatusMessage] = useState(initialStatus || 'Online & vibing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 8);
    setAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    if (!cleanUsername || cleanUsername.length < 2) {
      setError('Please choose a valid username handle (at least 2 characters)');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await onSave({
        name: name.trim(),
        username: cleanUsername,
        avatar,
        bio: bio.trim(),
        statusMessage: statusMessage.trim(),
      });
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl relative my-auto"
      >
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" />
            {isFirstTime ? 'Access Permitted • Profile Setup' : 'Edit Member Profile'}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {isFirstTime ? 'Set Up Your Encrypted Persona' : 'Customize Your Profile'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Choose your display name, username handle, profile picture (PPF), and status for your friends to see.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Picture (PPF) Section */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-tr from-emerald-500 via-cyan-500 to-teal-400 shadow-xl overflow-hidden">
                <img
                  src={avatar}
                  alt="Profile Preview"
                  className="w-full h-full rounded-full object-cover bg-slate-800"
                  referrerPolicy="no-referrer"
                />
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition-transform hover:scale-110 cursor-pointer"
                title="Upload Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
              >
                Upload Photo
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={handleRandomAvatar}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Randomize
              </button>
            </div>

            {/* Avatar presets gallery */}
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto max-w-full py-1">
              {PRESET_AVATARS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatar(preset)}
                  className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    avatar === preset ? 'border-emerald-400 scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={preset} alt="preset" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Display Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex, Rahul"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            {/* Username Handle for Search */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Username Handle <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <AtSign className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g. alex2026"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Friends can search and message you via @{username || 'username'}</p>
            </div>
          </div>

          {/* Status Message */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Current Status / Vibe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Smile className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="e.g. In the zone • Coding • Hit me up!"
                className="w-full pl-9 pr-3 py-2 bg-slate-950/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Bio / About */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Bio / About You
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 pointer-events-none text-slate-500">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell your friends something about yourself..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-3">
            {!isFirstTime && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isFirstTime ? 'Launch Chat Dashboard' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
