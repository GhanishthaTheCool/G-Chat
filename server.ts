import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface User {
  id: string;
  code: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  statusMessage?: string;
  isOwner: boolean;
  isAdmin: boolean;
  createdAt: string;
  lastSeen?: string;
  isOnline?: boolean;
}

interface AccessCode {
  code: string;
  label?: string;
  userId?: string;
  userName?: string;
  userUsername?: string;
  isOwnerCode?: boolean;
  isAdminCode?: boolean;
  createdAt: string;
  isRevoked?: boolean;
}

interface OwnerInfo {
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

interface Attachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  encryptedDataUrl: string;
  type: 'image' | 'voice' | 'audio' | 'video' | 'document' | 'file';
  duration?: number;
}

interface EncryptedMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  isOwner: boolean;
  recipientId?: string;
  ciphertext: string;
  iv: string;
  salt?: string;
  timestamp: number;
  attachment?: Attachment;
  reactions?: Record<string, string[]>;
  isSystem?: boolean;
  isEncrypted: boolean;
}

interface StoreData {
  ownerInfo: OwnerInfo;
  accessCodes: AccessCode[];
  users: Record<string, User>; // userId -> User
  messages: EncryptedMessage[];
}

const defaultOwnerInfo: OwnerInfo = {
  name: 'Ghanishtha',
  username: 'ghanishtha',
  title: 'Platform Owner & Architect',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  bio: 'Hey friend! Welcome to our private encrypted sanctuary. Only verified members with access codes can enter. Drop me a direct message or share in the lounge!',
  statusMessage: '🛡️ E2EE Active • Direct line always open',
  contactEmail: 'ghanishtha@private.internal',
  skillsOrInterests: ['Zero Knowledge', 'Cryptography', 'UI Engineering', 'Private Networks'],
  socialLinks: {
    github: 'https://github.com',
    twitter: 'https://twitter.com',
    telegram: 'https://t.me',
  },
};

const initialCodes: AccessCode[] = [
  {
    code: 'GHANISHTHA-OWNER',
    label: 'Ghanishtha (Owner Master Code)',
    isOwnerCode: true,
    isAdminCode: true,
    createdAt: new Date().toISOString(),
    userId: 'user-ghanishtha',
    userName: 'Ghanishtha',
    userUsername: 'ghanishtha',
  },
  {
    code: 'ADMIN-SECRET-99',
    label: 'Secondary Admin Key',
    isAdminCode: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: 'FRIEND-8821',
    label: 'For Bestie (VIP Friend)',
    createdAt: new Date().toISOString(),
  },
  {
    code: 'FRIEND-4492',
    label: 'Friend Circle Pass #1',
    createdAt: new Date().toISOString(),
  },
  {
    code: 'SECRET-7710',
    label: 'Friend Circle Pass #2',
    createdAt: new Date().toISOString(),
  },
  {
    code: 'VIP-9930',
    label: 'Friend Circle Pass #3',
    createdAt: new Date().toISOString(),
  },
];

const initialOwnerUser: User = {
  id: 'user-ghanishtha',
  code: 'GHANISHTHA-OWNER',
  name: 'Ghanishtha',
  username: 'ghanishtha',
  avatar: defaultOwnerInfo.avatar,
  bio: defaultOwnerInfo.bio,
  statusMessage: defaultOwnerInfo.statusMessage,
  isOwner: true,
  isAdmin: true,
  createdAt: new Date().toISOString(),
  lastSeen: new Date().toISOString(),
  isOnline: true,
};

let store: StoreData = {
  ownerInfo: defaultOwnerInfo,
  accessCodes: initialCodes,
  users: {
    'user-ghanishtha': initialOwnerUser,
  },
  messages: [
    {
      id: 'msg-welcome-sys-1',
      channelId: 'lounge',
      senderId: 'user-ghanishtha',
      senderName: 'Ghanishtha',
      senderUsername: 'ghanishtha',
      senderAvatar: defaultOwnerInfo.avatar,
      isOwner: true,
      ciphertext: 'Welcome to our private end-to-end encrypted friends lounge! Messages and shared files are protected with client-side AES-256-GCM. Tap on me above to message me directly.',
      iv: 'system-init-iv',
      timestamp: Date.now() - 3600000,
      isEncrypted: false,
      isSystem: true,
    },
  ],
};

// Load persistent data from disk if available
function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.ownerInfo) store.ownerInfo = { ...defaultOwnerInfo, ...parsed.ownerInfo };
      if (Array.isArray(parsed.accessCodes)) {
        // Ensure owner code is always present
        const hasOwner = parsed.accessCodes.some((c: AccessCode) => c.isOwnerCode);
        if (!hasOwner) {
          parsed.accessCodes.unshift(initialCodes[0]);
        }
        store.accessCodes = parsed.accessCodes;
      }
      if (parsed.users) store.users = parsed.users;
      if (Array.isArray(parsed.messages)) store.messages = parsed.messages;
      console.log('Successfully loaded persisted store from disk.');
    } else {
      saveStore();
    }
  } catch (err) {
    console.error('Error loading store.json:', err);
  }
}

function saveStore() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving store.json:', err);
  }
}

loadStore();

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Increase payload limit for encrypted image & audio attachments
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // WebSocket Server
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Map<WebSocket, { userId: string; user: User }>();

  function broadcast(payload: any, filterFn?: (clientData: { userId: string; user: User }) => boolean) {
    const dataStr = JSON.stringify(payload);
    for (const [ws, clientData] of clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        if (!filterFn || filterFn(clientData)) {
          ws.send(dataStr);
        }
      }
    }
  }

  function getOnlineUserIds(): string[] {
    const ids = new Set<string>();
    for (const [, clientData] of clients.entries()) {
      ids.add(clientData.userId);
    }
    // Always mark owner active if needed or based on actual presence
    return Array.from(ids);
  }

  wss.on('connection', (ws) => {
    let currentUserId: string | null = null;

    ws.on('message', (messageRaw) => {
      try {
        const payload = JSON.parse(messageRaw.toString());
        switch (payload.type) {
          case 'AUTH': {
            const { code, userId } = payload.data || {};
            const user = Object.values(store.users).find((u) => u.code === code || u.id === userId);
            if (user) {
              currentUserId = user.id;
              user.isOnline = true;
              user.lastSeen = new Date().toISOString();
              clients.set(ws, { userId: user.id, user });

              ws.send(
                JSON.stringify({
                  type: 'AUTH_OK',
                  data: {
                    user,
                    onlineUserIds: getOnlineUserIds(),
                  },
                })
              );

              // Broadcast presence update
              broadcast({
                type: 'PRESENCE_SYNC',
                data: {
                  onlineUserIds: getOnlineUserIds(),
                  user,
                },
              });
            } else {
              ws.send(
                JSON.stringify({
                  type: 'AUTH_FAIL',
                  data: { error: 'Invalid or revoked code' },
                })
              );
            }
            break;
          }

          case 'CHAT_MESSAGE': {
            const msg: EncryptedMessage = payload.data;
            if (!msg || !msg.senderId) return;

            // Ensure sender is authenticated
            const sender = store.users[msg.senderId];
            if (sender) {
              msg.senderName = sender.name;
              msg.senderUsername = sender.username;
              msg.senderAvatar = sender.avatar;
              msg.isOwner = sender.isOwner;
            }

            msg.timestamp = Date.now();
            store.messages.push(msg);
            // Cap stored messages to 2000 to maintain high performance
            if (store.messages.length > 2000) {
              store.messages.shift();
            }
            saveStore();

            // Broadcast to relevant clients
            if (msg.channelId === 'lounge') {
              broadcast({
                type: 'CHAT_MESSAGE',
                data: msg,
              });
            } else if (msg.channelId.startsWith('dm:')) {
              // Direct message: route to recipient and sender
              const parts = msg.channelId.split(':');
              const userA = parts[1];
              const userB = parts[2];
              broadcast(
                {
                  type: 'CHAT_MESSAGE',
                  data: msg,
                },
                (cd) => cd.userId === userA || cd.userId === userB
              );
            }
            break;
          }

          case 'TYPING': {
            const { channelId, userId, username, isTyping } = payload.data || {};
            broadcast(
              {
                type: isTyping ? 'TYPING' : 'STOP_TYPING',
                data: { channelId, userId, username },
              },
              (cd) => cd.userId !== currentUserId
            );
            break;
          }

          case 'REACTION_UPDATE': {
            const { messageId, emoji, userId } = payload.data || {};
            const targetMsg = store.messages.find((m) => m.id === messageId);
            if (targetMsg) {
              targetMsg.reactions = targetMsg.reactions || {};
              const currentUsers = targetMsg.reactions[emoji] || [];
              const index = currentUsers.indexOf(userId);
              if (index > -1) {
                currentUsers.splice(index, 1);
                if (currentUsers.length === 0) delete targetMsg.reactions[emoji];
              } else {
                currentUsers.push(userId);
                targetMsg.reactions[emoji] = currentUsers;
              }
              saveStore();

              broadcast({
                type: 'REACTION_UPDATE',
                data: {
                  messageId,
                  reactions: targetMsg.reactions,
                },
              });
            }
            break;
          }

          case 'DELETE_CONVERSATION': {
            const { channelId } = payload.data || {};
            if (channelId) {
              if (channelId === 'lounge') {
                store.messages = store.messages.filter((m) => m.channelId !== 'lounge');
              } else if (channelId.startsWith('dm:')) {
                const parts = channelId.split(':');
                const u1 = parts[1];
                const u2 = parts[2];
                store.messages = store.messages.filter(
                  (m) =>
                    m.channelId !== `dm:${u1}:${u2}` &&
                    m.channelId !== `dm:${u2}:${u1}`
                );
              } else {
                store.messages = store.messages.filter((m) => m.channelId !== channelId);
              }
              saveStore();
              broadcast({
                type: 'CONVERSATION_DELETED',
                data: { channelId },
              });
            }
            break;
          }

          case 'PING': {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      if (currentUserId && clients.has(ws)) {
        const user = store.users[currentUserId];
        if (user) {
          user.isOnline = false;
          user.lastSeen = new Date().toISOString();
        }
        clients.delete(ws);

        broadcast({
          type: 'PRESENCE_SYNC',
          data: {
            onlineUserIds: getOnlineUserIds(),
            userId: currentUserId,
          },
        });
      }
    });
  });

  // REST API Endpoints

  // 0. Dedicated Owner Password Login (Password: ownerisgood)
  app.post('/api/auth/owner-login', (req, res) => {
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    const cleanPass = password.trim();
    if (cleanPass !== 'ownerisgood') {
      res.status(401).json({ error: 'Incorrect Owner Password. Access denied.' });
      return;
    }

    // Retrieve or initialize Ghanishtha Owner user
    let ownerUser = store.users['user-ghanishtha'];
    let ownerCode = store.accessCodes.find((c) => c.isOwnerCode);

    if (!ownerCode) {
      ownerCode = {
        code: 'GHANISHTHA-OWNER',
        label: 'Ghanishtha (Owner Master Code)',
        isOwnerCode: true,
        isAdminCode: true,
        createdAt: new Date().toISOString(),
        userId: 'user-ghanishtha',
        userName: store.ownerInfo.name,
        userUsername: store.ownerInfo.username,
      };
      store.accessCodes.unshift(ownerCode);
    }

    if (!ownerUser) {
      ownerUser = {
        id: 'user-ghanishtha',
        code: ownerCode.code,
        name: store.ownerInfo.name || 'Ghanishtha',
        username: store.ownerInfo.username || 'ghanishtha',
        avatar: store.ownerInfo.avatar || defaultOwnerInfo.avatar,
        bio: store.ownerInfo.bio || defaultOwnerInfo.bio,
        statusMessage: store.ownerInfo.statusMessage || defaultOwnerInfo.statusMessage,
        isOwner: true,
        isAdmin: true,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        isOnline: true,
      };
      store.users['user-ghanishtha'] = ownerUser;
    } else {
      ownerUser.isOnline = true;
      ownerUser.lastSeen = new Date().toISOString();
      ownerUser.isOwner = true;
      ownerUser.isAdmin = true;
    }

    saveStore();

    broadcast({
      type: 'PRESENCE_SYNC',
      data: {
        onlineUserIds: getOnlineUserIds(),
        user: ownerUser,
      },
    });

    res.json({
      success: true,
      user: ownerUser,
      accessCode: ownerCode,
      isOwner: true,
      isAdmin: true,
      ownerInfo: store.ownerInfo,
    });
  });

  // 0.5 Random Visitor Self Sign-Up with auto-assigned random Passkey
  app.post('/api/auth/signup', (req, res) => {
    const { name, username, avatar, bio, statusMessage } = req.body;
    if (!name || !username) {
      res.status(400).json({ error: 'Name and @username are required' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername || cleanUsername.length < 2) {
      res.status(400).json({ error: 'Please choose a valid username handle (at least 2 letters/numbers)' });
      return;
    }

    // Check if username is already taken
    const existing = Object.values(store.users).find((u) => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      res.status(400).json({ error: `Username @${cleanUsername} is already taken. Please choose another.` });
      return;
    }

    // Generate unique random passkey (e.g. GCHAT-4819)
    let randomPasskey = '';
    let attempts = 0;
    while (attempts < 100) {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const candidate = `GCHAT-${randNum}`;
      if (!store.accessCodes.some((c) => c.code.toUpperCase() === candidate)) {
        randomPasskey = candidate;
        break;
      }
      attempts++;
    }

    if (!randomPasskey) {
      randomPasskey = `GCHAT-${Date.now().toString().slice(-4)}`;
    }

    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const finalAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

    const newUser: User = {
      id: userId,
      code: randomPasskey,
      name: name.trim(),
      username: cleanUsername,
      avatar: finalAvatar,
      bio: bio?.trim() || 'G-Chat member 🔒',
      statusMessage: statusMessage?.trim() || 'Online and ready to chat',
      isOwner: false,
      isAdmin: false, // Random sign-ups NEVER get admin privileges
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isOnline: true,
    };

    const newCodeRecord: AccessCode = {
      code: randomPasskey,
      label: `Passkey for @${cleanUsername}`,
      userId: newUser.id,
      userName: newUser.name,
      userUsername: newUser.username,
      isOwnerCode: false,
      isAdminCode: false, // Standard member
      createdAt: new Date().toISOString(),
      isRevoked: false,
    };

    store.users[userId] = newUser;
    store.accessCodes.push(newCodeRecord);
    saveStore();

    broadcast({
      type: 'PRESENCE_SYNC',
      data: {
        onlineUserIds: getOnlineUserIds(),
        user: newUser,
      },
    });

    res.json({
      success: true,
      user: newUser,
      accessCode: newCodeRecord,
      generatedPasskey: randomPasskey,
      isOwner: false,
      isAdmin: false,
      ownerInfo: store.ownerInfo,
    });
  });

  // 1. Verify Access Code
  app.post('/api/auth/verify-code', (req, res) => {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Code is required' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();

    // Check if entered owner password directly
    if (code.trim() === 'ownerisgood') {
      let ownerUser = store.users['user-ghanishtha'];
      let ownerCode = store.accessCodes.find((c) => c.isOwnerCode) || initialCodes[0];
      if (ownerUser) {
        ownerUser.isOnline = true;
        ownerUser.lastSeen = new Date().toISOString();
      }
      res.json({
        success: true,
        isNewUser: false,
        user: ownerUser || initialOwnerUser,
        accessCode: ownerCode,
        isOwner: true,
        isAdmin: true,
        ownerInfo: store.ownerInfo,
      });
      return;
    }

    const foundCode = store.accessCodes.find(
      (c) => c.code.toUpperCase() === cleanCode && !c.isRevoked
    );

    if (!foundCode) {
      res.status(401).json({ error: 'Invalid or revoked access code. Please verify with the Owner.' });
      return;
    }

    // Check if user already exists with this code
    let user = Object.values(store.users).find(
      (u) => u.code.toUpperCase() === cleanCode
    );

    const isOwner = Boolean(foundCode.isOwnerCode || cleanCode === 'GHANISHTHA-OWNER');
    const isAdmin = Boolean(isOwner || foundCode.isAdminCode);

    if (!user) {
      // First time entering with this code!
      // Return flag indicating profile needs initial setup
      res.json({
        success: true,
        isNewUser: true,
        accessCode: foundCode,
        isOwner,
        isAdmin,
        ownerInfo: store.ownerInfo,
      });
      return;
    }

    user.isOnline = true;
    user.lastSeen = new Date().toISOString();
    saveStore();

    res.json({
      success: true,
      isNewUser: false,
      user,
      accessCode: foundCode,
      isOwner,
      isAdmin,
      ownerInfo: store.ownerInfo,
    });
  });

  // 2. Save or Update User Profile (Name, Username, PPF, Bio, Status)
  app.post('/api/auth/save-profile', (req, res) => {
    const { code, userId, name, username, avatar, bio, statusMessage } = req.body;
    if (!name || !username) {
      res.status(400).json({ error: 'Name and username are required' });
      return;
    }

    const cleanCode = (code || '').trim().toUpperCase();
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');

    if (!cleanUsername || cleanUsername.length < 2) {
      res.status(400).json({ error: 'Please choose a valid username handle (at least 2 letters/numbers)' });
      return;
    }

    // Find existing user by userId or by code
    let user = (userId && store.users[userId])
      ? store.users[userId]
      : Object.values(store.users).find((u) => cleanCode && u.code.toUpperCase() === cleanCode);

    let foundCode = store.accessCodes.find(
      (c) => cleanCode && c.code.toUpperCase() === cleanCode && !c.isRevoked
    );

    if (!user && !foundCode && cleanCode !== 'GHANISHTHA-OWNER' && cleanCode !== 'OWNERISGOOD') {
      res.status(401).json({ error: 'Invalid access code or session' });
      return;
    }

    // Check if username is already taken by a different user
    const existingUserWithUsername = Object.values(store.users).find(
      (u) => u.username.toLowerCase() === cleanUsername && u.id !== (user?.id)
    );

    if (existingUserWithUsername) {
      res.status(400).json({ error: `Username @${cleanUsername} is already taken by another friend.` });
      return;
    }

    const isOwner = Boolean(
      (user && user.isOwner) ||
      (foundCode && foundCode.isOwnerCode) ||
      cleanCode === 'GHANISHTHA-OWNER' ||
      cleanCode === 'OWNERISGOOD'
    );
    const isAdmin = Boolean(isOwner || (user && user.isAdmin) || (foundCode && foundCode.isAdminCode));

    if (!user) {
      const newId = isOwner ? 'user-ghanishtha' : `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      user = {
        id: newId,
        code: foundCode ? foundCode.code : (cleanCode || 'MEMBER-CODE'),
        name: name.trim(),
        username: cleanUsername,
        avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
        bio: bio !== undefined ? bio.trim() : 'Encrypted friend member 🔒',
        statusMessage: statusMessage !== undefined ? statusMessage.trim() : 'Online and ready to chat',
        isOwner,
        isAdmin,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        isOnline: true,
      };
      store.users[user.id] = user;
    } else {
      user.name = name.trim();
      user.username = cleanUsername;
      if (avatar) user.avatar = avatar;
      if (bio !== undefined) user.bio = bio.trim();
      if (statusMessage !== undefined) user.statusMessage = statusMessage.trim();
      user.lastSeen = new Date().toISOString();
      user.isOnline = true;
    }

    // Update code record metadata if found
    if (foundCode) {
      foundCode.userId = user.id;
      foundCode.userName = user.name;
      foundCode.userUsername = user.username;
    }

    // If owner updated their profile, keep store.ownerInfo synced
    if (isOwner) {
      store.ownerInfo.name = user.name;
      store.ownerInfo.username = user.username;
      store.ownerInfo.avatar = user.avatar;
      store.ownerInfo.bio = user.bio;
      store.ownerInfo.statusMessage = user.statusMessage || store.ownerInfo.statusMessage;
    }

    saveStore();

    // Broadcast user profile update to all connected clients
    broadcast({
      type: 'PRESENCE_SYNC',
      data: {
        onlineUserIds: getOnlineUserIds(),
        user,
      },
    });

    res.json({
      success: true,
      user,
      ownerInfo: store.ownerInfo,
    });
  });

  // 3. Search and List All Users (for Searching by Username)
  app.get('/api/users', (req, res) => {
    const q = ((req.query.q as string) || '').toLowerCase().trim().replace(/^@/, '');
    const userList = Object.values(store.users).map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      avatar: u.avatar,
      bio: u.bio,
      statusMessage: u.statusMessage,
      isOwner: u.isOwner,
      isAdmin: u.isAdmin,
      isOnline: getOnlineUserIds().includes(u.id),
      lastSeen: u.lastSeen,
    }));

    if (!q) {
      res.json(userList);
      return;
    }

    const filtered = userList.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        (u.bio && u.bio.toLowerCase().includes(q))
    );
    res.json(filtered);
  });

  // 4. Get and Update Owner Info
  app.get('/api/owner', (_req, res) => {
    res.json(store.ownerInfo);
  });

  app.post('/api/admin/owner', (req, res) => {
    const { adminCode, ownerInfo } = req.body;
    const cleanAdminCode = (adminCode || '').trim().toUpperCase();
    const isAdmin = store.accessCodes.some(
      (c) =>
        c.code.toUpperCase() === cleanAdminCode &&
        (c.isOwnerCode || c.isAdminCode || cleanAdminCode === 'GHANISHTHA-OWNER') &&
        !c.isRevoked
    );

    if (!isAdmin) {
      res.status(403).json({ error: 'Unauthorized: Owner or Admin key required.' });
      return;
    }

    if (!ownerInfo) {
      res.status(400).json({ error: 'Owner info is required' });
      return;
    }

    store.ownerInfo = {
      ...store.ownerInfo,
      ...ownerInfo,
    };

    // Also update Ghanishtha user profile if exists
    const ownerUser = store.users['user-ghanishtha'];
    if (ownerUser) {
      ownerUser.name = store.ownerInfo.name;
      ownerUser.username = store.ownerInfo.username;
      ownerUser.avatar = store.ownerInfo.avatar;
      ownerUser.bio = store.ownerInfo.bio;
      ownerUser.statusMessage = store.ownerInfo.statusMessage;
    }

    saveStore();

    broadcast({
      type: 'OWNER_UPDATED',
      data: store.ownerInfo,
    });

    res.json({ success: true, ownerInfo: store.ownerInfo });
  });

  // Helper to verify admin privileges
  const checkIsAdmin = (req: express.Request): boolean => {
    const rawHeader = req.headers['x-admin-code'] || req.headers['x-access-code'] || req.body?.adminCode || req.query?.adminCode || '';
    const adminCode = (typeof rawHeader === 'string' ? rawHeader : rawHeader[0] || '').trim().toUpperCase();
    const rawUserId = req.headers['x-user-id'] || req.body?.userId || req.query?.userId || '';
    const userId = typeof rawUserId === 'string' ? rawUserId : rawUserId[0] || '';

    if (adminCode === 'GHANISHTHA-OWNER' || adminCode === 'OWNERISGOOD') return true;
    if (userId === 'user-ghanishtha') return true;
    if (userId && store.users[userId]?.isOwner) return true;
    if (userId && store.users[userId]?.isAdmin) return true;

    return store.accessCodes.some(
      (c) =>
        c.code.toUpperCase() === adminCode &&
        (c.isOwnerCode || c.isAdminCode) &&
        !c.isRevoked
    );
  };

  // 5. Admin Code Management Endpoints
  app.get('/api/admin/codes', (req, res) => {
    if (!checkIsAdmin(req)) {
      res.status(403).json({ error: 'Unauthorized: Owner or Admin privileges required.' });
      return;
    }

    res.json({
      codes: store.accessCodes,
      users: Object.values(store.users),
      usersCount: Object.keys(store.users).length,
      messagesCount: store.messages.length,
    });
  });

  // Add new access code
  app.post('/api/admin/codes', (req, res) => {
    if (!checkIsAdmin(req)) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const { code, label, isAdminCode } = req.body;
    let finalCode = (code || '').trim().toUpperCase();

    if (!finalCode) {
      // Auto-generate a secure memorable code: FRIEND-XXXX
      const randNum = Math.floor(1000 + Math.random() * 9000);
      finalCode = `FRIEND-${randNum}`;
    }

    if (store.accessCodes.some((c) => c.code.toUpperCase() === finalCode)) {
      res.status(400).json({ error: 'An access code with this value already exists' });
      return;
    }

    const newAccessCode: AccessCode = {
      code: finalCode,
      label: label?.trim() || 'Personal Access Code',
      isAdminCode: Boolean(isAdminCode),
      createdAt: new Date().toISOString(),
      isRevoked: false,
    };

    store.accessCodes.push(newAccessCode);
    saveStore();

    res.json({ success: true, accessCode: newAccessCode });
  });

  // Direct Friend Account Creation by Owner/Admin (Friend just types the passcode to enter)
  app.post('/api/admin/create-account', (req, res) => {
    if (!checkIsAdmin(req)) {
      res.status(403).json({ error: 'Unauthorized: Owner or Admin privileges required.' });
      return;
    }

    const { name, username, code, avatar, bio, statusMessage, isAdminUser } = req.body;
    if (!name || !username) {
      res.status(400).json({ error: 'Friend Name and @username are required' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername || cleanUsername.length < 2) {
      res.status(400).json({ error: 'Please choose a valid username handle (at least 2 letters/numbers)' });
      return;
    }

    // Check if username taken
    if (Object.values(store.users).some((u) => u.username.toLowerCase() === cleanUsername)) {
      res.status(400).json({ error: `Username @${cleanUsername} is already registered.` });
      return;
    }

    // Passcode validation / generation
    let finalCode = (code || '').trim().toUpperCase();
    if (!finalCode) {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      finalCode = `FRIEND-${cleanUsername.toUpperCase()}-${randNum}`;
    }

    if (store.accessCodes.some((c) => c.code.toUpperCase() === finalCode)) {
      res.status(400).json({ error: `Passcode ${finalCode} is already assigned. Please pick another.` });
      return;
    }

    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const finalAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

    const newUser: User = {
      id: userId,
      code: finalCode,
      name: name.trim(),
      username: cleanUsername,
      avatar: finalAvatar,
      bio: bio?.trim() || 'Added by Owner • G-Chat VIP',
      statusMessage: statusMessage?.trim() || 'Ready to chat',
      isOwner: false,
      isAdmin: Boolean(isAdminUser),
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isOnline: false,
    };

    const newCodeRecord: AccessCode = {
      code: finalCode,
      label: `Account for ${name.trim()} (@${cleanUsername})`,
      userId: newUser.id,
      userName: newUser.name,
      userUsername: newUser.username,
      isOwnerCode: false,
      isAdminCode: Boolean(isAdminUser),
      createdAt: new Date().toISOString(),
      isRevoked: false,
    };

    store.users[userId] = newUser;
    store.accessCodes.push(newCodeRecord);
    saveStore();

    broadcast({
      type: 'PRESENCE_SYNC',
      data: {
        onlineUserIds: getOnlineUserIds(),
        user: newUser,
      },
    });

    res.json({
      success: true,
      user: newUser,
      passcode: finalCode,
      accessCode: newCodeRecord,
    });
  });

  // Edit or change code value for a person
  app.put('/api/admin/codes/:oldCode', (req, res) => {
    if (!checkIsAdmin(req)) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const oldCodeClean = req.params.oldCode.trim().toUpperCase();
    const targetCode = store.accessCodes.find((c) => c.code.toUpperCase() === oldCodeClean);

    if (!targetCode) {
      res.status(404).json({ error: 'Access code not found' });
      return;
    }

    const { newCode, label, isRevoked } = req.body;
    if (newCode) {
      const cleanNew = newCode.trim().toUpperCase();
      if (cleanNew !== oldCodeClean && store.accessCodes.some((c) => c.code.toUpperCase() === cleanNew)) {
        res.status(400).json({ error: 'New code is already taken' });
        return;
      }
      // Update bound user if any
      const boundUser = Object.values(store.users).find((u) => u.code.toUpperCase() === oldCodeClean);
      if (boundUser) {
        boundUser.code = cleanNew;
      }
      targetCode.code = cleanNew;
    }

    if (label !== undefined) targetCode.label = label.trim();
    if (isRevoked !== undefined) targetCode.isRevoked = Boolean(isRevoked);

    saveStore();

    broadcast({
      type: 'CODE_UPDATED',
      data: targetCode,
    });

    res.json({ success: true, accessCode: targetCode });
  });

  // Delete/Revoke code and associated user account
  app.delete('/api/admin/codes/:code', (req, res) => {
    if (!checkIsAdmin(req)) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const codeToDelete = req.params.code.trim().toUpperCase();
    if (codeToDelete === 'GHANISHTHA-OWNER' || codeToDelete === 'OWNERISGOOD') {
      res.status(400).json({ error: 'Cannot delete the primary Owner code' });
      return;
    }

    // 1. Remove from accessCodes
    const targetCode = store.accessCodes.find((c) => c.code.toUpperCase() === codeToDelete);
    const idx = store.accessCodes.findIndex((c) => c.code.toUpperCase() === codeToDelete);
    if (idx > -1) {
      store.accessCodes.splice(idx, 1);
    }

    // 2. Find and delete associated user
    let targetUserId = targetCode?.userId;
    if (!targetUserId) {
      const boundUser = Object.values(store.users).find((u) => u.code.toUpperCase() === codeToDelete);
      if (boundUser) targetUserId = boundUser.id;
    }

    if (targetUserId && targetUserId !== 'user-ghanishtha') {
      delete store.users[targetUserId];

      // Disconnect and notify connected websockets
      for (const [ws, clientData] of clients.entries()) {
        if (clientData.userId === targetUserId) {
          try {
            ws.send(JSON.stringify({ type: 'ACCOUNT_DELETED' }));
            ws.close();
          } catch {}
          clients.delete(ws);
        }
      }
    }

    saveStore();

    broadcast({
      type: 'PRESENCE_SYNC',
      data: {
        onlineUserIds: getOnlineUserIds(),
        deletedUserId: targetUserId,
      },
    });

    res.json({ success: true, deletedUserId: targetUserId });
  });

  // Delete a user account directly by User ID from Admin Room
  app.delete('/api/admin/users/:userId', (req, res) => {
    if (!checkIsAdmin(req)) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const { userId } = req.params;
    if (userId === 'user-ghanishtha') {
      res.status(400).json({ error: 'Cannot delete the owner account' });
      return;
    }

    const targetUser = store.users[userId];
    if (targetUser) {
      const userCode = targetUser.code?.toUpperCase();
      delete store.users[userId];

      // Remove access code if tied
      if (userCode && userCode !== 'GHANISHTHA-OWNER') {
        const codeIdx = store.accessCodes.findIndex((c) => c.code.toUpperCase() === userCode);
        if (codeIdx > -1) {
          store.accessCodes.splice(codeIdx, 1);
        }
      }
      const codeByIdx = store.accessCodes.findIndex((c) => c.userId === userId && !c.isOwnerCode);
      if (codeByIdx > -1) {
        store.accessCodes.splice(codeByIdx, 1);
      }

      // Disconnect websocket
      for (const [ws, clientData] of clients.entries()) {
        if (clientData.userId === userId) {
          try {
            ws.send(JSON.stringify({ type: 'ACCOUNT_DELETED' }));
            ws.close();
          } catch {}
          clients.delete(ws);
        }
      }

      saveStore();

      broadcast({
        type: 'PRESENCE_SYNC',
        data: {
          onlineUserIds: getOnlineUserIds(),
          deletedUserId: userId,
        },
      });
    }

    res.json({ success: true });
  });

  // 6. Message History (Protected DM scoping)
  app.get('/api/messages', (req, res) => {
    const channelId = (req.query.channelId as string) || 'lounge';
    const reqUserId = (req.headers['x-user-id'] as string) || '';
    const reqAccessCode = ((req.headers['x-access-code'] as string) || '').trim().toUpperCase();

    // Identify user if possible
    let requestingUser = reqUserId ? store.users[reqUserId] : undefined;
    if (!requestingUser && reqAccessCode) {
      requestingUser = Object.values(store.users).find((u) => u.code.toUpperCase() === reqAccessCode);
    }

    let filtered: EncryptedMessage[] = [];

    if (channelId === 'lounge') {
      filtered = store.messages.filter((m) => m.channelId === 'lounge');
    } else if (channelId.startsWith('dm:')) {
      const parts = channelId.split(':');
      const u1 = parts[1];
      const u2 = parts[2];

      // Privacy check: If requesting DM, user must be one of the 2 participants
      if (requestingUser && requestingUser.id !== u1 && requestingUser.id !== u2 && !requestingUser.isOwner) {
        // Not a participant of this DM! Return empty array
        res.json([]);
        return;
      }

      // Match either orientation of the DM channel
      filtered = store.messages.filter(
        (m) =>
          m.channelId === `dm:${u1}:${u2}` ||
          m.channelId === `dm:${u2}:${u1}`
      );
    } else {
      filtered = store.messages.filter((m) => m.channelId === channelId);
    }

    res.json(filtered.slice(-200));
  });

  // 7. Post Message (REST fallback)
  app.post('/api/messages', (req, res) => {
    const msg: EncryptedMessage = req.body;
    if (!msg || !msg.senderId || !msg.ciphertext) {
      res.status(400).json({ error: 'Invalid message payload' });
      return;
    }

    const sender = store.users[msg.senderId];
    if (sender) {
      msg.senderName = sender.name;
      msg.senderUsername = sender.username;
      msg.senderAvatar = sender.avatar;
      msg.isOwner = sender.isOwner;
    }

    msg.timestamp = Date.now();
    store.messages.push(msg);
    if (store.messages.length > 2000) store.messages.shift();
    saveStore();

    broadcast({
      type: 'CHAT_MESSAGE',
      data: msg,
    });

    res.json({ success: true, message: msg });
  });

  // 8. Delete / Clear Conversation Endpoint
  app.delete('/api/conversations', (req, res) => {
    const channelId = (req.query.channelId as string) || '';
    if (!channelId) {
      res.status(400).json({ error: 'Channel ID is required' });
      return;
    }

    if (channelId === 'lounge') {
      store.messages = store.messages.filter((m) => m.channelId !== 'lounge');
    } else if (channelId.startsWith('dm:')) {
      const parts = channelId.split(':');
      const u1 = parts[1];
      const u2 = parts[2];
      store.messages = store.messages.filter(
        (m) =>
          m.channelId !== `dm:${u1}:${u2}` &&
          m.channelId !== `dm:${u2}:${u1}`
      );
    } else {
      store.messages = store.messages.filter((m) => m.channelId !== channelId);
    }

    saveStore();

    broadcast({
      type: 'CONVERSATION_DELETED',
      data: { channelId },
    });

    res.json({ success: true, channelId });
  });

  // 9. Delete User Account Endpoint
  app.post('/api/auth/delete-account', (req, res) => {
    const { userId, code } = req.body;
    let targetUser = userId ? store.users[userId] : undefined;
    if (!targetUser && code) {
      const cleanCode = (code || '').trim().toUpperCase();
      targetUser = Object.values(store.users).find((u) => u.code.toUpperCase() === cleanCode);
    }

    const finalUserId = targetUser ? targetUser.id : userId;

    if (targetUser) {
      // If owner account, protect the base owner record but reset customized state if requested
      if (targetUser.isOwner || finalUserId === 'user-ghanishtha') {
        targetUser.bio = defaultOwnerInfo.bio;
        targetUser.statusMessage = defaultOwnerInfo.statusMessage;
        saveStore();
        res.json({ success: true, message: 'Owner profile reset to defaults.' });
        return;
      }

      // Delete user from store
      delete store.users[finalUserId];
    }

    // Revoke or remove access code associated with this user
    const cleanCode = (code || targetUser?.code || '').trim().toUpperCase();
    if (cleanCode && cleanCode !== 'GHANISHTHA-OWNER') {
      const codeIdx = store.accessCodes.findIndex((c) => c.code.toUpperCase() === cleanCode);
      if (codeIdx > -1) {
        store.accessCodes.splice(codeIdx, 1);
      }
    }
    if (finalUserId) {
      const codeByIdx = store.accessCodes.findIndex((c) => c.userId === finalUserId && !c.isOwnerCode);
      if (codeByIdx > -1) {
        store.accessCodes.splice(codeByIdx, 1);
      }
    }

    // Disconnect active client sockets
    if (finalUserId) {
      for (const [ws, clientData] of clients.entries()) {
        if (clientData.userId === finalUserId) {
          try {
            ws.send(JSON.stringify({ type: 'ACCOUNT_DELETED' }));
            ws.close();
          } catch {}
          clients.delete(ws);
        }
      }
    }

    saveStore();

    broadcast({
      type: 'PRESENCE_SYNC',
      data: {
        onlineUserIds: getOnlineUserIds(),
        deletedUserId: finalUserId,
      },
    });

    res.json({ success: true });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🔒 Encrypted Chat Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
