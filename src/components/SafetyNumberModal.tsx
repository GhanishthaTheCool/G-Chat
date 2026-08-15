import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, CheckCircle2, Copy, Check, X, KeyRound, Cpu } from 'lucide-react';
import { generateSafetyNumber } from '../lib/crypto';

interface SafetyNumberModalProps {
  channelId: string;
  channelName: string;
  onClose: () => void;
}

export const SafetyNumberModal: React.FC<SafetyNumberModalProps> = ({
  channelId,
  channelName,
  onClose,
}) => {
  const [safetyNumber, setSafetyNumber] = useState('Loading...');
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    generateSafetyNumber(channelId).then((num) => setSafetyNumber(num));
  }, [channelId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(safetyNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 glow-emerald">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight">End-to-End Encryption Active</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Messages and files in <span className="text-emerald-400 font-medium">#{channelName}</span> are sealed with client-side AES-256-GCM.
          </p>
        </div>

        {/* Safety Number Display */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
            <KeyRound className="w-3.5 h-3.5 text-emerald-400" /> Channel Safety Fingerprint
          </span>

          <div className="font-mono text-xl sm:text-2xl font-extrabold text-white tracking-widest py-2 select-all text-center">
            {safetyNumber}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Fingerprint' : 'Copy Safety Number'}</span>
          </button>
        </div>

        {/* Cryptography Spec List */}
        <div className="mt-4 space-y-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Cryptographic Cipher
            </span>
            <span className="font-mono text-emerald-400 font-medium">AES-GCM-256</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Key Derivation
            </span>
            <span className="font-mono text-slate-300">PBKDF2-SHA256 (100k)</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Zero-Knowledge
            </span>
            <span className="text-emerald-400 font-medium">Server Blind</span>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => setVerified(!verified)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              verified
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{verified ? 'Marked as Verified' : 'Mark as Verified'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
