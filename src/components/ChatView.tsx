import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Paperclip,
  Smile,
  ShieldCheck,
  Crown,
  File,
  Download,
  Play,
  Pause,
  Image as ImageIcon,
  CheckCheck,
  Lock,
  Menu,
  X,
  Sparkles,
  Info,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { User, EncryptedMessage, Attachment } from '../types';
import { decryptText, encryptText, encryptFilePayload, decryptFilePayload } from '../lib/crypto';

interface ChatViewProps {
  channelId: string;
  channelTitle: string;
  channelSubtitle?: string;
  targetUser?: User | null;
  currentUser: User;
  messages: EncryptedMessage[];
  onSendMessage: (payload: {
    ciphertext: string;
    iv: string;
    attachment?: Attachment;
    channelId: string;
    recipientId?: string;
    isEncrypted: boolean;
  }) => void;
  onSendReaction: (messageId: string, emoji: string) => void;
  onOpenSafetyModal: () => void;
  onOpenAboutOwner: () => void;
  onToggleMobileSidebar: () => void;
  onDeleteConversation?: (channelId: string) => Promise<void>;
  onViewUserProfile?: (user: User) => void;
  isOnline?: boolean;
}

const COMMON_EMOJIS = ['❤️', '🔥', '👍', '😂', '🔒', '👑', '🚀', '💯', '✨', '⚡'];

export const ChatView: React.FC<ChatViewProps> = ({
  channelId,
  channelTitle,
  channelSubtitle,
  targetUser,
  currentUser,
  messages,
  onSendMessage,
  onSendReaction,
  onOpenSafetyModal,
  onOpenAboutOwner,
  onToggleMobileSidebar,
  onDeleteConversation,
  onViewUserProfile,
  isOnline,
}) => {
  const [inputText, setInputText] = useState('');
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [decryptedFileCache, setDecryptedFileCache] = useState<Record<string, string>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [activePlayingAudio, setActivePlayingAudio] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Decrypt incoming messages in background using Web Crypto
  useEffect(() => {
    let isMounted = true;

    async function decryptAll() {
      for (const msg of messages) {
        if (!msg.isEncrypted || msg.isSystem) {
          if (!decryptedCache[msg.id]) {
            setDecryptedCache((prev) => ({ ...prev, [msg.id]: msg.ciphertext }));
          }
          continue;
        }

        if (!decryptedCache[msg.id]) {
          try {
            const dec = await decryptText(msg.ciphertext, msg.iv, msg.channelId);
            if (isMounted) {
              setDecryptedCache((prev) => ({ ...prev, [msg.id]: dec }));
            }
          } catch {
            if (isMounted) {
              setDecryptedCache((prev) => ({ ...prev, [msg.id]: '🔒 [Decrypted Message]' }));
            }
          }
        }

        // Decrypt attachment if present
        if (msg.attachment && !decryptedFileCache[msg.attachment.id]) {
          try {
            const decData = await decryptFilePayload(msg.attachment.encryptedDataUrl, msg.iv, msg.channelId);
            if (isMounted) {
              setDecryptedFileCache((prev) => ({ ...prev, [msg.attachment!.id]: decData }));
            }
          } catch {
            if (isMounted) {
              setDecryptedFileCache((prev) => ({ ...prev, [msg.attachment!.id]: msg.attachment!.encryptedDataUrl }));
            }
          }
        }
      }
    }

    decryptAll();
    return () => {
      isMounted = false;
    };
  }, [messages, channelId]);

  // Handle Text Submission
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    setInputText('');
    setShowEmojiPicker(false);

    try {
      // Encrypt with AES-256-GCM
      const enc = await encryptText(text, channelId);
      onSendMessage({
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        channelId,
        recipientId: targetUser?.id,
        isEncrypted: true,
      });
    } catch (err) {
      console.error('Failed to encrypt and send message:', err);
    }
  };

  // Handle File Upload (Drag-drop or Click)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('File size exceeds 20MB limit for in-memory E2EE sharing.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const isImage = file.type.startsWith('image/');
      const isVoice = file.type.startsWith('audio/');

      const attachmentType: Attachment['type'] = isImage ? 'image' : isVoice ? 'voice' : 'file';

      try {
        // Encrypt file payload with AES-256-GCM
        const encFile = await encryptFilePayload(base64Data, channelId);
        const encCaption = await encryptText(file.name, channelId);

        const attachment: Attachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          encryptedDataUrl: encFile.encryptedDataUrl,
          type: attachmentType,
        };

        onSendMessage({
          ciphertext: encCaption.ciphertext,
          iv: encFile.iv,
          attachment,
          channelId,
          recipientId: targetUser?.id,
          isEncrypted: true,
        });
      } catch (err) {
        console.error('File encryption failed:', err);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Audio player toggle
  const togglePlayAudio = (attId: string, dataUrl: string) => {
    if (activePlayingAudio === attId) {
      const currentAudio = audioElementsRef.current[attId];
      if (currentAudio) {
        currentAudio.pause();
        setActivePlayingAudio(null);
      }
      return;
    }

    // Stop any other playing audio
    if (activePlayingAudio && audioElementsRef.current[activePlayingAudio]) {
      audioElementsRef.current[activePlayingAudio].pause();
    }

    let audio = audioElementsRef.current[attId];
    if (!audio) {
      audio = new Audio(dataUrl);
      audioElementsRef.current[attId] = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((prev) => ({
            ...prev,
            [attId]: (audio.currentTime / audio.duration) * 100,
          }));
        }
      };

      audio.onended = () => {
        setActivePlayingAudio(null);
        setAudioProgress((prev) => ({ ...prev, [attId]: 0 }));
      };
    }

    audio.play();
    setActivePlayingAudio(attId);
  };

  const isOwnerConversation = targetUser?.isOwner || channelId === 'dm:user-ghanishtha' || targetUser?.username === 'ghanishtha';

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/95 relative overflow-hidden">
      {/* Top Conversation Header */}
      <header className="h-16 px-4 border-b border-slate-800/90 bg-slate-900/80 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger toggle */}
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 -ml-1 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Avatar or Group Icon */}
          <div
            className={`relative shrink-0 ${targetUser && onViewUserProfile ? 'cursor-pointer hover:opacity-90' : ''}`}
            onClick={() => {
              if (targetUser && onViewUserProfile) onViewUserProfile(targetUser);
            }}
            title={targetUser ? `View @${targetUser.username}'s Profile Details` : undefined}
          >
            {targetUser ? (
              <div className="relative">
                <img
                  src={targetUser.avatar}
                  alt={targetUser.name}
                  className="w-10 h-10 rounded-full object-cover bg-slate-800 border border-slate-700 hover:ring-2 hover:ring-emerald-400 transition-all"
                  referrerPolicy="no-referrer"
                />
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
                )}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold shadow-md">
                #
              </div>
            )}
          </div>

          <div
            className={`min-w-0 ${targetUser && onViewUserProfile ? 'cursor-pointer' : ''}`}
            onClick={() => {
              if (targetUser && onViewUserProfile) onViewUserProfile(targetUser);
            }}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-white truncate hover:text-emerald-400 transition-colors">{channelTitle}</h2>
              {isOwnerConversation && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold flex items-center gap-1 shrink-0">
                  <Crown className="w-3 h-3 text-amber-400" />
                  &lt;Owner&gt;
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate flex items-center gap-1">
              {targetUser ? (
                <>
                  <span className="text-emerald-400/90 shrink-0">@{targetUser.username}</span>
                  <span className="text-slate-500 shrink-0">-</span>
                  <span
                    className="text-slate-300 font-sans truncate"
                    title={targetUser.statusMessage || targetUser.bio || (isOnline ? 'Online' : 'Offline')}
                  >
                    {targetUser.statusMessage || targetUser.bio || (isOnline ? 'Online' : 'Offline')}
                  </span>
                </>
              ) : channelSubtitle ? (
                <span className="text-slate-400 font-sans truncate">{channelSubtitle}</span>
              ) : (
                <span className="text-slate-400 font-sans truncate">All verified friends</span>
              )}
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* E2EE Safety Number Pill */}
          <button
            type="button"
            onClick={onOpenSafetyModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer glow-emerald"
            title="View End-to-End Encryption Verification Fingerprint"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AES-256 E2EE</span>
          </button>

          {isOwnerConversation && (
            <button
              type="button"
              onClick={onOpenAboutOwner}
              className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
              title="About Owner (Ghanishtha)"
            >
              <Info className="w-4 h-4" />
            </button>
          )}

          {/* Delete / Clear Conversation Button */}
          {onDeleteConversation && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/30 transition-colors cursor-pointer"
              title="Delete / Clear Conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Banner at beginning of conversation */}
        <div className="flex flex-col items-center justify-center text-center my-6 py-4 px-3 rounded-2xl bg-slate-900/50 border border-slate-800/60 max-w-md mx-auto">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            End-to-End Encrypted Sanctuary
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
            Messages and files in this channel are encrypted client-side. No third party or server administrator can read your conversations.
          </p>
          <button
            type="button"
            onClick={onOpenSafetyModal}
            className="mt-2.5 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium underline cursor-pointer"
          >
            Verify Safety Number Fingerprint
          </button>
        </div>

        {/* Message Items */}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const textDecrypted = decryptedCache[msg.id] ?? '🔒 Decrypting...';
          const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          if (msg.isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-3">
                <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 max-w-md text-center shadow-sm">
                  <div className="flex items-center justify-center gap-1 text-amber-400 font-bold mb-0.5">
                    <Sparkles className="w-3 h-3" /> System Notice
                  </div>
                  {msg.ciphertext}
                </div>
              </div>
            );
          }

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 max-w-2xl ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar */}
              {!isMe && (
                <div
                  className={`shrink-0 pt-1 ${onViewUserProfile ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (onViewUserProfile) {
                      onViewUserProfile({
                        id: msg.senderId,
                        name: msg.senderName,
                        username: msg.senderUsername,
                        avatar: msg.senderAvatar,
                        isOwner: Boolean(msg.isOwner),
                        isAdmin: false,
                        code: '',
                        bio: '',
                        createdAt: '',
                      });
                    }
                  }}
                  title={`View @${msg.senderUsername}'s profile`}
                >
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    className="w-8 h-8 rounded-full object-cover bg-slate-800 border border-slate-700 hover:ring-2 hover:ring-emerald-400 transition-all"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-md`}>
                {/* Sender name label */}
                {!isMe && (
                  <div
                    className={`flex items-center gap-1.5 text-xs text-slate-400 mb-1 px-1 ${
                      onViewUserProfile ? 'cursor-pointer hover:text-white' : ''
                    }`}
                    onClick={() => {
                      if (onViewUserProfile) {
                        onViewUserProfile({
                          id: msg.senderId,
                          name: msg.senderName,
                          username: msg.senderUsername,
                          avatar: msg.senderAvatar,
                          isOwner: Boolean(msg.isOwner),
                          isAdmin: false,
                          code: '',
                          bio: '',
                          createdAt: '',
                        });
                      }
                    }}
                  >
                    <span className="font-semibold text-slate-200">{msg.senderName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">@{msg.senderUsername}</span>
                    {msg.isOwner && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px] font-bold">
                        Owner
                      </span>
                    )}
                  </div>
                )}

                {/* Bubble Container */}
                <div
                  className={`relative p-3.5 rounded-2xl shadow-md ${
                    isMe
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-tr-sm'
                      : 'bg-slate-900 border border-slate-800/90 text-slate-100 rounded-tl-sm'
                  }`}
                >
                  {/* Attachment rendering */}
                  {msg.attachment && (
                    <div className="mb-2">
                      {/* Image Attachment */}
                      {msg.attachment.type === 'image' && (
                        <div className="rounded-xl overflow-hidden max-w-xs border border-black/20 bg-slate-950/40">
                          <img
                            src={decryptedFileCache[msg.attachment.id] || msg.attachment.encryptedDataUrl}
                            alt={msg.attachment.name}
                            onClick={() =>
                              setSelectedImageModal(
                                decryptedFileCache[msg.attachment!.id] || msg.attachment!.encryptedDataUrl
                              )
                            }
                            className="max-h-60 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            referrerPolicy="no-referrer"
                          />
                          <div className="p-2 flex items-center justify-between text-[11px] bg-slate-950/80">
                            <span className="truncate max-w-[150px] text-slate-300">{msg.attachment.name}</span>
                            <a
                              href={decryptedFileCache[msg.attachment.id] || msg.attachment.encryptedDataUrl}
                              download={msg.attachment.name}
                              className="p-1 text-emerald-400 hover:text-emerald-300"
                              title="Download decrypted image"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Voice Note Attachment */}
                      {msg.attachment.type === 'voice' && (
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 min-w-[220px]">
                          <button
                            type="button"
                            onClick={() =>
                              togglePlayAudio(
                                msg.attachment!.id,
                                decryptedFileCache[msg.attachment!.id] || msg.attachment!.encryptedDataUrl
                              )
                            }
                            className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-md transition-transform hover:scale-105 cursor-pointer shrink-0"
                          >
                            {activePlayingAudio === msg.attachment.id ? (
                              <Pause className="w-4 h-4 fill-slate-950" />
                            ) : (
                              <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                            )}
                          </button>

                          <div className="flex-1">
                            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1 font-mono">
                              <span>Voice Note</span>
                              <span>{msg.attachment.duration ? `${msg.attachment.duration}s` : 'Audio'}</span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-400 transition-all duration-100"
                                style={{ width: `${audioProgress[msg.attachment.id] || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Generic File Attachment */}
                      {msg.attachment.type === 'file' && (
                        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <File className="w-5 h-5 text-emerald-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-white truncate">{msg.attachment.name}</p>
                              <p className="text-[10px] text-slate-400">{(msg.attachment.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <a
                            href={decryptedFileCache[msg.attachment.id] || msg.attachment.encryptedDataUrl}
                            download={msg.attachment.name}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors"
                            title="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text Message */}
                  {textDecrypted && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{textDecrypted}</p>
                  )}

                  {/* Footer (time + encryption checkmark) */}
                  <div className={`flex items-center gap-1.5 mt-1.5 text-[10px] ${isMe ? 'text-emerald-100/80 justify-end' : 'text-slate-400'}`}>
                    <span>{timeStr}</span>
                    <Lock className="w-2.5 h-2.5 opacity-70" title="AES-256 E2EE Verified" />
                    {isMe && <CheckCheck className="w-3 h-3 text-emerald-200" />}
                  </div>
                </div>

                {/* Reactions badge bar */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 px-1">
                    {Object.entries(msg.reactions).map(([emoji, userIdsRaw]) => {
                      const userIds = (userIdsRaw || []) as string[];
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => onSendReaction(msg.id, emoji)}
                          className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer transition-transform hover:scale-105 ${
                            userIds.includes(currentUser.id)
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                              : 'bg-slate-900/90 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px]">{userIds.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Quick reaction hover button */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex gap-1 px-1">
                  {['❤️', '🔥', '👍'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onSendReaction(msg.id, emoji)}
                      className="text-xs hover:scale-125 transition-transform p-0.5 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Drawer */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 left-4 right-4 sm:left-auto sm:right-16 z-20 p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-xs"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
              <span>Quick Reactions</span>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setInputText((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="w-10 h-10 rounded-xl bg-slate-950 hover:bg-slate-800 flex items-center justify-center text-lg transition-transform hover:scale-110 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Message Composer */}
      <div className="p-3 sm:p-4 border-t border-slate-800/90 bg-slate-900/90 backdrop-blur-md shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
            title="Share encrypted image or file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer shrink-0"
            title="Emojis"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Message Input Box */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Encrypted message to ${channelTitle}...`}
              className="w-full pl-4 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
            />
            <div className="absolute right-3 top-3.5 text-emerald-500/60 pointer-events-none" title="End-to-End Encrypted">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/40 transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            title="Send encrypted"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Delete Conversation Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white text-center">Delete Conversation?</h3>
            <p className="text-xs text-slate-400 text-center mt-1.5 leading-relaxed">
              This will permanently delete all messages and attachments in{' '}
              <span className="text-white font-medium">{channelTitle}</span> for both sides. This action cannot be undone.
            </p>

            <div className="flex items-center gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  if (!onDeleteConversation) return;
                  setDeleting(true);
                  try {
                    await onDeleteConversation(channelId);
                    setShowDeleteConfirm(false);
                  } catch (err: any) {
                    alert(err.message || 'Failed to delete conversation');
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {selectedImageModal && (
        <div
          className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImageModal}
              alt="Decrypted Full"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => setSelectedImageModal(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
