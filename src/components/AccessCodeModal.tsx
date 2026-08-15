import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  KeyRound,
  ShieldCheck,
  Lock,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Crown,
  Sparkles,
  UserPlus,
  User,
  AtSign,
  Camera,
  Copy,
  Check,
  Smile,
  FileText,
} from 'lucide-react';

interface AccessCodeModalProps {
  onVerify: (code: string) => Promise<boolean>;
  onOwnerLogin: (password: string) => Promise<boolean>;
  onSignUp: (userData: {
    name: string;
    username: string;
    avatar: string;
    bio: string;
    statusMessage: string;
  }) => Promise<{ success: boolean; generatedPasskey?: string; error?: string }>;
  loading: boolean;
  errorMsg?: string | null;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=300&auto=format&fit=crop&q=80',
  'https://api.dicebear.com/7.x/bottts/svg?seed=cypher1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=gchatuser2',
];

export const AccessCodeModal: React.FC<AccessCodeModalProps> = ({
  onVerify,
  onOwnerLogin,
  onSignUp,
  loading,
  errorMsg,
}) => {
  // Mode: 'code' | 'owner' | 'signup' | 'signup_success'
  const [mode, setMode] = useState<'code' | 'owner' | 'signup' | 'signup_success'>('code');

  // Standard Code Login State
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);

  // Owner Login State
  const [ownerPass, setOwnerPass] = useState('');
  const [showOwnerPass, setShowOwnerPass] = useState(false);

  // Sign-Up State for Random Visitors
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupAvatar, setSignupAvatar] = useState(PRESET_AVATARS[0]);
  const [signupBio, setSignupBio] = useState('G-Chat member 🔒');
  const [signupStatus, setSignupStatus] = useState('Online and ready to chat');
  const [assignedPasskey, setAssignedPasskey] = useState('');
  const [copiedPasskey, setCopiedPasskey] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  // Submit standard code
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLocalError(null);

    const success = await onVerify(code.trim().toUpperCase());
    if (!success) {
      triggerShake();
    }
  };

  // Submit Owner Password
  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerPass.trim()) return;
    setLocalError(null);

    const success = await onOwnerLogin(ownerPass.trim());
    if (!success) {
      triggerShake();
      setLocalError('Incorrect Owner Password. Access denied.');
    }
  };

  // Submit Sign-Up Form
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim()) {
      setLocalError('Please enter your name');
      return;
    }
    const cleanUser = signupUsername.trim().toLowerCase().replace(/^@/, '');
    if (!cleanUser || cleanUser.length < 2) {
      setLocalError('Please choose a valid handle (at least 2 letters/numbers)');
      return;
    }

    setLocalError(null);
    const result = await onSignUp({
      name: signupName.trim(),
      username: cleanUser,
      avatar: signupAvatar,
      bio: signupBio.trim(),
      statusMessage: signupStatus.trim(),
    });

    if (result.success && result.generatedPasskey) {
      setAssignedPasskey(result.generatedPasskey);
      setMode('signup_success');
    } else {
      triggerShake();
      setLocalError(result.error || 'Failed to generate passkey');
    }
  };

  const handleCopyPasskey = () => {
    navigator.clipboard.writeText(assignedPasskey);
    setCopiedPasskey(true);
    setTimeout(() => setCopiedPasskey(false), 2500);
  };

  const randomizeAvatar = () => {
    const seed = Math.random().toString(36).substring(2, 8);
    setSignupAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          x: shake ? [-8, 8, -6, 6, -3, 3, 0] : 0,
        }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-slate-900/95 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden my-auto"
      >
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-cyan-500/20 to-teal-400/20 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/10">
            <Lock className="w-7 h-7 text-emerald-400" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            G-Chat
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono font-semibold">
              E2EE
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xs leading-relaxed">
            Private zero-knowledge encrypted messaging platform.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        {mode !== 'signup_success' && (
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/90 rounded-xl border border-slate-800/80 mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('code');
                setLocalError(null);
              }}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                mode === 'code'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Passcode</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('owner');
                setLocalError(null);
              }}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                mode === 'owner'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Owner</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setLocalError(null);
              }}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'text-cyan-400/80 hover:text-cyan-300'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>
          </div>
        )}

        {/* 1. PASSCODE MODE (For friends with a code from owner) */}
        {mode === 'code' && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Friend Access Code
                </label>
                <span className="text-[11px] text-slate-500">From Ghanishtha</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type={showCode ? 'text' : 'password'}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ENTER ACCESS CODE"
                  autoFocus
                  disabled={loading}
                  className="w-full pl-11 pr-11 py-3 bg-slate-950/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-600 font-mono tracking-widest text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all uppercase"
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  title={showCode ? 'Hide passcode' : 'Show passcode'}
                >
                  {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {(errorMsg || localError) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{localError || errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Unlock &amp; Enter</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick Helper for Random Visitors */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer underline"
              >
                Don't have a code? Click here to generate a passkey
              </button>
            </div>
          </form>
        )}

        {/* 2. GHANISHTHA OWNER MODE */}
        {mode === 'owner' && (
          <form onSubmit={handleOwnerSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-2.5">
              <Crown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Ghanishtha Owner Portal</p>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Enter master owner password to unlock admin controls.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Owner Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <input
                  type={showOwnerPass ? 'text' : 'password'}
                  value={ownerPass}
                  onChange={(e) => setOwnerPass(e.target.value)}
                  autoFocus
                  disabled={loading}
                  className="w-full pl-11 pr-11 py-3 bg-slate-950/90 border border-amber-500/40 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnerPass(!showOwnerPass)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  title={showOwnerPass ? 'Hide password' : 'Show password'}
                >
                  {showOwnerPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {(errorMsg || localError) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{localError || errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || !ownerPass.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <Crown className="w-4 h-4 fill-slate-950" />
                  <span>Login as Ghanishtha (Admin Dashboard)</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 3. SIGN UP FOR RANDOM PEOPLE (Auto-assigns random Passkey) */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
            <div className="text-center pb-1">
              <p className="text-xs text-slate-300">
                Sign up to get your personal encrypted <span className="text-cyan-400 font-semibold">Passkey</span> automatically.
              </p>
            </div>

            {/* Avatar picker */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border-2 border-cyan-400 shrink-0">
                <img src={signupAvatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                  {PRESET_AVATARS.map((av, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSignupAvatar(av)}
                      className={`w-7 h-7 rounded-full overflow-hidden border shrink-0 transition-transform cursor-pointer ${
                        signupAvatar === av ? 'border-cyan-400 scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={av} alt="preset" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={randomizeAvatar}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 cursor-pointer shrink-0"
                title="Randomize Avatar"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Your Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Sam"
                    className="w-full pl-8 pr-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  @Username <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                    <AtSign className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. sam26"
                    className="w-full pl-8 pr-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                About / Bio
              </label>
              <input
                type="text"
                value={signupBio}
                onChange={(e) => setSignupBio(e.target.value)}
                placeholder="Short bio for friends..."
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <AnimatePresence>
              {(errorMsg || localError) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{localError || errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || !signupName.trim() || !signupUsername.trim()}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Account &amp; Generate Passkey</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 4. SIGN UP SUCCESS SCREEN WITH ASSIGNED PASSKEY */}
        {mode === 'signup_success' && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <Check className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Welcome to G-Chat!</h3>
              <p className="text-xs text-slate-300 mt-1">
                Your account is ready. Here is your permanent secret passkey:
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-center justify-between">
              <span className="font-mono text-base sm:text-lg font-bold text-cyan-400 tracking-wider">
                {assignedPasskey}
              </span>
              <button
                type="button"
                onClick={handleCopyPasskey}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedPasskey ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              💡 Save this passkey in a safe place. You can use it to log back in anytime from any device!
            </p>

            <button
              type="button"
              onClick={() => onVerify(assignedPasskey)}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span>Continue to G-Chat</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Client-side AES-256-GCM Zero-Knowledge Security</span>
        </div>
      </motion.div>
    </div>
  );
};
