export interface User {
  id: string;
  code: string;
  name: string;
  username: string; // Unique handle e.g. @ghanishtha, @alex
  avatar: string;
  bio: string;
  statusMessage?: string;
  isOwner: boolean;
  isAdmin: boolean;
  createdAt: string;
  lastSeen?: string;
  isOnline?: boolean;
}

export interface AccessCode {
  code: string;
  label?: string; // e.g. "For Rahul", "VIP Friend"
  userId?: string;
  userName?: string;
  userUsername?: string;
  isOwnerCode?: boolean;
  isAdminCode?: boolean;
  createdAt: string;
  isRevoked?: boolean;
  maxUses?: number;
  timesUsed?: number;
}

export interface OwnerInfo {
  name: string;
  username: string;
  title: string;
  avatar: string;
  bio: string;
  statusMessage: string;
  contactEmail?: string;
  skillsOrInterests?: string[];
  socialLinks?: {
    github?: string;
    instagram?: string;
    twitter?: string;
    telegram?: string;
    custom?: string;
  };
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  encryptedDataUrl: string; // Base64 data (encrypted or decrypted preview)
  type: 'image' | 'voice' | 'audio' | 'video' | 'document' | 'file';
  duration?: number; // for voice/audio in seconds
}

export interface EncryptedMessage {
  id: string;
  channelId: string; // e.g. 'lounge' or 'dm:userIdA:userIdB'
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  isOwner: boolean;
  recipientId?: string; // For 1-on-1 DMs
  ciphertext: string; // AES-256-GCM encrypted base64 payload
  iv: string; // Base64 Initialization Vector
  salt?: string;
  timestamp: number;
  attachment?: Attachment;
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  isSystem?: boolean;
  isEncrypted: boolean;
}

export interface DecryptedMessage extends Omit<EncryptedMessage, 'ciphertext'> {
  decryptedContent: string;
  isDecrypted: boolean;
}

export interface WSPayload {
  type:
    | 'AUTH'
    | 'AUTH_OK'
    | 'AUTH_FAIL'
    | 'PRESENCE_SYNC'
    | 'USER_JOINED'
    | 'USER_LEFT'
    | 'CHAT_MESSAGE'
    | 'MESSAGE_ACK'
    | 'TYPING'
    | 'STOP_TYPING'
    | 'REACTION_UPDATE'
    | 'CODE_UPDATED'
    | 'OWNER_UPDATED'
    | 'PING'
    | 'PONG';
  userId?: string;
  data?: any;
  timestamp?: number;
}
