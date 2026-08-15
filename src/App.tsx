import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, OwnerInfo, EncryptedMessage, AccessCode, Attachment } from './types';
import { AccessCodeModal } from './components/AccessCodeModal';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { AboutOwnerModal } from './components/AboutOwnerModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { SafetyNumberModal } from './components/SafetyNumberModal';
import { UserProfileModal } from './components/UserProfileModal';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';

const defaultOwner: OwnerInfo = {
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

export default function App() {
  const [accessCode, setAccessCode] = useState<string>(() => {
    return localStorage.getItem('fc_access_code') || '';
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo>(defaultOwner);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active channel state
  const [activeChannelId, setActiveChannelId] = useState<string>('lounge');
  const [activeChannelTitle, setActiveChannelTitle] = useState<string>('G-Chat Lounge');
  const [activeChannelSubtitle, setActiveChannelSubtitle] = useState<string>('#general • Encrypted Group Chat');
  const [activeTargetUser, setActiveTargetUser] = useState<User | null>(null);

  // Messages & Presence
  const [messages, setMessages] = useState<EncryptedMessage[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  // Modals state
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isFirstTimeProfile, setIsFirstTimeProfile] = useState(false);
  const [showAboutOwner, setShowAboutOwner] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<User | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  // 1. Initial Verification of Code on Mount or Code Change
  const verifyCode = useCallback(async (codeToVerify: string): Promise<boolean> => {
    setVerifyingCode(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToVerify }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Invalid or revoked access code');
        return false;
      }

      setAccessCode(codeToVerify);
      localStorage.setItem('fc_access_code', codeToVerify);

      // Reset active views so no leftover messages appear
      setActiveChannelId('lounge');
      setActiveChannelTitle('G-Chat Lounge');
      setActiveChannelSubtitle('#general • Encrypted Group Chat');
      setActiveTargetUser(null);
      setMessages([]);

      if (data.ownerInfo) {
        setOwnerInfo(data.ownerInfo);
      }

      if (data.isNewUser || !data.user) {
        // Needs initial profile setup
        setIsFirstTimeProfile(true);
        setShowProfileSetup(true);
      } else {
        setCurrentUser(data.user);
        setIsFirstTimeProfile(false);
      }

      return true;
    } catch (err: any) {
      setAuthError('Connection error. Please try again.');
      return false;
    } finally {
      setVerifyingCode(false);
    }
  }, []);

  // 1b. Owner direct login with password (ownerisgood)
  const handleOwnerLogin = async (password: string): Promise<boolean> => {
    setVerifyingCode(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/owner-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Invalid owner password');
        return false;
      }

      setAccessCode('GHANISHTHA-OWNER');
      localStorage.setItem('fc_access_code', 'GHANISHTHA-OWNER');

      // Reset active views
      setActiveChannelId('lounge');
      setActiveChannelTitle('G-Chat Lounge');
      setActiveChannelSubtitle('#general • Encrypted Group Chat');
      setActiveTargetUser(null);
      setMessages([]);

      if (data.ownerInfo) setOwnerInfo(data.ownerInfo);
      if (data.user) {
        setCurrentUser(data.user);
        setIsFirstTimeProfile(false);
      }

      return true;
    } catch (err: any) {
      setAuthError('Connection error. Please try again.');
      return false;
    } finally {
      setVerifyingCode(false);
    }
  };

  // 1c. Visitor Signup (Generates random passkey)
  const handleSignUp = async (userData: {
    name: string;
    username: string;
    avatar: string;
    bio: string;
    statusMessage: string;
  }): Promise<{ success: boolean; generatedPasskey?: string; error?: string }> => {
    setVerifyingCode(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to register account' };
      }

      setAccessCode(data.passkey);
      localStorage.setItem('fc_access_code', data.passkey);

      // Reset active views
      setActiveChannelId('lounge');
      setActiveChannelTitle('G-Chat Lounge');
      setActiveChannelSubtitle('#general • Encrypted Group Chat');
      setActiveTargetUser(null);
      setMessages([]);

      if (data.user) {
        setCurrentUser(data.user);
        setIsFirstTimeProfile(false);
      }

      return { success: true, generatedPasskey: data.passkey };
    } catch (err: any) {
      return { success: false, error: 'Connection error during signup' };
    } finally {
      setVerifyingCode(false);
    }
  };

  // Check saved access code on load
  useEffect(() => {
    if (accessCode) {
      verifyCode(accessCode);
    }
  }, []);

  // 2. Fetch owner info on startup
  useEffect(() => {
    fetch('/api/owner')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.name) setOwnerInfo(data);
      })
      .catch(() => {});
  }, []);

  // 3. WebSocket Real-time Connection Setup
  useEffect(() => {
    if (!currentUser) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let socket: WebSocket;

    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: 'AUTH',
            data: {
              code: accessCode,
              userId: currentUser.id,
            },
          })
        );

        // Start ping heartbeat
        pingIntervalRef.current = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'PING' }));
          }
        }, 20000);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          switch (payload.type) {
            case 'AUTH_OK': {
              if (payload.data?.onlineUserIds) {
                setOnlineUserIds(payload.data.onlineUserIds);
              }
              break;
            }

            case 'PRESENCE_SYNC': {
              if (payload.data?.onlineUserIds) {
                setOnlineUserIds(payload.data.onlineUserIds);
              }
              break;
            }

            case 'CHAT_MESSAGE': {
              const newMsg: EncryptedMessage = payload.data;
              setMessages((prev) => {
                // Deduplicate
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              break;
            }

            case 'REACTION_UPDATE': {
              const { messageId, reactions } = payload.data;
              setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
              );
              break;
            }

            case 'OWNER_UPDATED': {
              setOwnerInfo(payload.data);
              break;
            }

            case 'CONVERSATION_DELETED': {
              const deletedChannelId = payload.data?.channelId;
              if (deletedChannelId) {
                setMessages((prev) => prev.filter((m) => m.channelId !== deletedChannelId));
              }
              break;
            }

            case 'ACCOUNT_DELETED': {
              handleLogout();
              break;
            }
          }
        } catch (err) {
          console.error('WS message handling error:', err);
        }
      };

      socket.onerror = (err) => {
        console.warn('WebSocket connection notice:', err);
      };

      socket.onclose = () => {
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      };
    } catch (err) {
      console.error('Failed to instantiate WebSocket:', err);
    }

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [currentUser, accessCode]);

  // 4. Fetch Message History on Channel Switch (With privacy scoping headers)
  useEffect(() => {
    if (!currentUser) return;

    fetch(`/api/messages?channelId=${encodeURIComponent(activeChannelId)}`, {
      headers: {
        'x-user-id': currentUser.id,
        'x-access-code': accessCode,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch((err) => console.error('Error fetching messages:', err));
  }, [activeChannelId, currentUser, accessCode]);

  // 5. Send Message Handler
  const handleSendMessage = async (payload: {
    ciphertext: string;
    iv: string;
    attachment?: Attachment;
    channelId: string;
    recipientId?: string;
    isEncrypted: boolean;
  }) => {
    if (!currentUser) return;

    const newMsg: EncryptedMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channelId: payload.channelId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderUsername: currentUser.username,
      senderAvatar: currentUser.avatar,
      isOwner: currentUser.isOwner,
      recipientId: payload.recipientId,
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      attachment: payload.attachment,
      timestamp: Date.now(),
      isEncrypted: payload.isEncrypted,
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, newMsg]);

    // Send via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          data: newMsg,
        })
      );
    } else {
      // Fallback to REST
      fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-access-code': accessCode,
        },
        body: JSON.stringify(newMsg),
      }).catch(console.error);
    }
  };

  // 6. Send Reaction Handler
  const handleSendReaction = (messageId: string, emoji: string) => {
    if (!currentUser) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'REACTION_UPDATE',
          data: {
            messageId,
            emoji,
            userId: currentUser.id,
          },
        })
      );
    }
  };

  // 7. Save Profile Handler (Name, PPF, Username, Bio)
  const handleSaveProfile = async (profileData: {
    name: string;
    username: string;
    avatar: string;
    bio: string;
    statusMessage: string;
  }) => {
    const res = await fetch('/api/auth/save-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: accessCode,
        userId: currentUser?.id,
        ...profileData,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save profile');
    }

    if (data.user) {
      setCurrentUser(data.user);
    }
    if (data.ownerInfo) setOwnerInfo(data.ownerInfo);
    setShowProfileSetup(false);
    setIsFirstTimeProfile(false);
  };

  // 8. Update Owner Info Handler (Admin/Owner)
  const handleUpdateOwnerInfo = async (updated: OwnerInfo) => {
    const res = await fetch('/api/admin/owner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminCode: accessCode,
        ownerInfo: updated,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update owner information');
    }

    setOwnerInfo(data.ownerInfo);
  };

  // 9. Channel Selection
  const handleSelectChannel = (
    channelId: string,
    title: string,
    subtitle?: string,
    targetUser?: User | null
  ) => {
    setActiveChannelId(channelId);
    setActiveChannelTitle(title);
    setActiveChannelSubtitle(subtitle || '');
    setActiveTargetUser(targetUser || null);
  };

  // Direct line to Ghanishtha (for friends only)
  const handleDirectMessageOwner = () => {
    if (currentUser?.isOwner || currentUser?.username === 'ghanishtha') return;

    const ownerUserId = 'user-ghanishtha';
    const sorted = [currentUser?.id || 'guest', ownerUserId].sort();
    const dmId = `dm:${sorted[0]}:${sorted[1]}`;
    const statusText = ownerInfo.statusMessage || ownerInfo.bio || 'Online';
    handleSelectChannel(dmId, ownerInfo.name, `@${ownerInfo.username} - ${statusText}`, {
      id: ownerUserId,
      code: 'GHANISHTHA-OWNER',
      name: ownerInfo.name,
      username: ownerInfo.username,
      avatar: ownerInfo.avatar,
      bio: ownerInfo.bio,
      statusMessage: ownerInfo.statusMessage,
      isOwner: true,
      isAdmin: true,
      createdAt: '',
    });
  };

  // Direct line to any User from their Profile Modal
  const handleStartDirectMessage = (user: User) => {
    if (!currentUser || user.id === currentUser.id) return;

    try {
      const saved = localStorage.getItem(`fc_active_dms_${currentUser.id}`);
      const list: string[] = saved ? JSON.parse(saved) : [];
      if (!list.includes(user.id)) {
        list.push(user.id);
        localStorage.setItem(`fc_active_dms_${currentUser.id}`, JSON.stringify(list));
      }
    } catch {}

    const sorted = [currentUser.id, user.id].sort();
    const dmId = `dm:${sorted[0]}:${sorted[1]}`;
    const statusText =
      user.statusMessage ||
      user.bio ||
      (onlineUserIds.includes(user.id) || user.isOnline ? 'Online' : 'Offline');
    handleSelectChannel(dmId, user.name, `@${user.username} - ${statusText}`, user);
  };

  // Logout / Change Code
  const handleLogout = () => {
    localStorage.removeItem('fc_access_code');
    setAccessCode('');
    setCurrentUser(null);
    setMessages([]);
    setActiveChannelId('lounge');
    setActiveChannelTitle('G-Chat Lounge');
    setActiveChannelSubtitle('#general • Encrypted Group Chat');
    setActiveTargetUser(null);
    if (wsRef.current) wsRef.current.close();
  };

  // Delete / Clear Conversation in active channel
  const handleDeleteConversation = async (channelId: string) => {
    if (!currentUser) return;

    // Broadcast through WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'DELETE_CONVERSATION',
          data: { channelId },
        })
      );
    }

    // Call REST endpoint
    await fetch(`/api/conversations?channelId=${encodeURIComponent(channelId)}`, {
      method: 'DELETE',
      headers: {
        'x-access-code': accessCode,
        'x-user-id': currentUser.id,
      },
    });

    // Wipe locally
    setMessages((prev) => prev.filter((m) => m.channelId !== channelId));
  };

  // Delete User Account
  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    const res = await fetch('/api/auth/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: accessCode,
        userId: currentUser.id,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete account');
    }

    handleLogout();
  };

  // Filter messages for current channel view
  const currentChannelMessages = messages.filter((m) => {
    if (activeChannelId === 'lounge') return m.channelId === 'lounge';
    if (activeChannelId.startsWith('dm:')) {
      const parts = activeChannelId.split(':');
      const u1 = parts[1];
      const u2 = parts[2];
      return (
        m.channelId === `dm:${u1}:${u2}` ||
        m.channelId === `dm:${u2}:${u1}`
      );
    }
    return m.channelId === activeChannelId;
  });

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. If not logged in with access code */}
      {!currentUser && (
        <AccessCodeModal
          onVerify={verifyCode}
          onOwnerLogin={handleOwnerLogin}
          onSignUp={handleSignUp}
          loading={verifyingCode}
          errorMsg={authError}
        />
      )}

      {/* 2. Main Chatting Platform Layout */}
      {currentUser && (
        <>
          {/* Responsive Sidebar */}
          <Sidebar
            currentUser={currentUser}
            ownerInfo={ownerInfo}
            activeChannelId={activeChannelId}
            onSelectChannel={handleSelectChannel}
            onlineUserIds={onlineUserIds}
            onOpenAboutOwner={() => setShowAboutOwner(true)}
            onOpenAdminPanel={() => setShowAdminPanel(true)}
            onOpenProfileSetup={() => {
              setIsFirstTimeProfile(false);
              setShowProfileSetup(true);
            }}
            onViewUserProfile={(user) => setSelectedUserProfile(user)}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          {/* Backdrop for mobile drawer */}
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          {/* Active Chat Area */}
          <ChatView
            channelId={activeChannelId}
            channelTitle={activeChannelTitle}
            channelSubtitle={activeChannelSubtitle}
            targetUser={activeTargetUser}
            currentUser={currentUser}
            messages={currentChannelMessages}
            onSendMessage={handleSendMessage}
            onSendReaction={handleSendReaction}
            onOpenSafetyModal={() => setShowSafetyModal(true)}
            onOpenAboutOwner={() => setShowAboutOwner(true)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onDeleteConversation={handleDeleteConversation}
            onViewUserProfile={(user) => setSelectedUserProfile(user)}
            isOnline={
              activeTargetUser
                ? onlineUserIds.includes(activeTargetUser.id) || activeTargetUser.isOnline
                : true
            }
          />
        </>
      )}

      {/* 3. Profile Setup Modal (First time or manual edit) */}
      {showProfileSetup && (
        <ProfileSetupModal
          code={accessCode}
          initialName={currentUser?.name}
          initialUsername={currentUser?.username}
          initialAvatar={currentUser?.avatar}
          initialBio={currentUser?.bio}
          initialStatus={currentUser?.statusMessage}
          isOwner={currentUser?.isOwner || accessCode === 'GHANISHTHA-OWNER'}
          onSave={handleSaveProfile}
          isFirstTime={isFirstTimeProfile}
          onClose={() => setShowProfileSetup(false)}
        />
      )}

      {/* 4. About Owner Modal (Ghanishtha) */}
      {showAboutOwner && currentUser && (
        <AboutOwnerModal
          ownerInfo={ownerInfo}
          currentUser={currentUser}
          onClose={() => setShowAboutOwner(false)}
          onDirectMessage={handleDirectMessageOwner}
          onUpdateOwnerInfo={handleUpdateOwnerInfo}
        />
      )}

      {/* 5. Admin Panel Modal (Manage Access Codes & Friend Accounts) */}
      {showAdminPanel && currentUser && (
        <AdminPanelModal
          adminCode={accessCode}
          currentUser={currentUser}
          ownerInfo={ownerInfo}
          onClose={() => setShowAdminPanel(false)}
          onUpdateOwnerInfo={handleUpdateOwnerInfo}
          onUpdateAdminCode={(newCode) => {
            setAccessCode(newCode);
            localStorage.setItem('fc_access_code', newCode);
            if (currentUser) setCurrentUser({ ...currentUser, code: newCode });
          }}
        />
      )}

      {/* 6. User Profile Detail Modal (When clicking any player/user) */}
      {selectedUserProfile && currentUser && (
        <UserProfileModal
          user={selectedUserProfile}
          currentUser={currentUser}
          onClose={() => setSelectedUserProfile(null)}
          onStartDirectMessage={handleStartDirectMessage}
          onOpenAboutOwner={() => setShowAboutOwner(true)}
        />
      )}

      {/* 7. End-to-End Encryption Safety Number Verification Modal */}
      {showSafetyModal && (
        <SafetyNumberModal
          channelId={activeChannelId}
          channelName={activeChannelTitle}
          onClose={() => setShowSafetyModal(false)}
        />
      )}
    </div>
  );
}
