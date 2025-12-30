
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, ChatMessage, MessageType } from '../types';
import { ref, push, onValue, limitToLast, query, off, update, remove, orderByChild, equalTo, get } from 'firebase/database';
import { db } from '../services/firebase';
import { authService } from '../services/auth';
import { 
    Send, Settings, X, Search, MoreVertical, Edit2, Trash2, CornerUpLeft, 
    Copy, Download, Pin, FileText, CheckCheck, Play, PlusCircle, Mic, MapPin, Smile,
    ImageIcon, AlertCircle, ChevronLeft, ChevronDown, AlertTriangle, Hash
} from 'lucide-react';

// --- UTILS ---
const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
    
    if (isToday) return "Hoje";
    if (isYesterday) return "Ontem";
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
};

const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// --- SUB-COMPONENTS ---

const Avatar = ({ url, name, size = 'md', className = '' }: { url?: string, name?: string, size?: 'sm' | 'md' | 'lg' | 'xl', className?: string }) => {
    const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' };
    const safeName = name || '?';
    
    return (
        <div className={`relative shrink-0 ${className}`}>
            {url ? (
                <img src={url} alt={safeName} className={`${sizeClasses[size]} rounded-full object-cover border border-slate-700 shadow-sm`} />
            ) : (
                <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-slate-300 font-bold shadow-sm`}>
                    {safeName.charAt(0).toUpperCase()}
                </div>
            )}
        </div>
    );
};

const ImageViewer = ({ src, onClose }: { src: string, onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2 bg-black/50 rounded-full transition-colors">
            <X size={24} />
        </button>
        <img src={src} alt="Full size" className="max-w-full max-h-full rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
);

// --- MAIN CHAT COMPONENT ---

interface ChatProps {
  currentUser: User;
}

const Chat: React.FC<ChatProps> = ({ currentUser }) => {
  // Data State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // UI State
  const [newMessage, setNewMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Desktop default
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'MEDIA' | 'FILES'>('ALL');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  // Interaction State
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<{ type: MessageType, url: string, name: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  
  // Context Menu State (Click based, not hover)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Refined Delete State
  const [messageToDelete, setMessageToDelete] = useState<{ id: string, path: string } | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Pendency Modal
  const [showPendencyModal, setShowPendencyModal] = useState(false);
  const [pendencyForm, setPendencyForm] = useState({ title: '', link: '' });

  // Profile Edit
  const [showProfile, setShowProfile] = useState(false);
  const [editProfile, setEditProfile] = useState({ name: currentUser.name, jobTitle: currentUser.jobTitle || '', bio: currentUser.bio || '', photoURL: currentUser.photoURL || '', bannerURL: currentUser.bannerURL || '' });

  // --- INITIALIZATION ---
  useEffect(() => {
      authService.listUsers().then((list) => setUsersList(list.filter(u => u.uid !== currentUser.uid)));
      setEditProfile({ name: currentUser.name, jobTitle: currentUser.jobTitle || '', bio: currentUser.bio || '', photoURL: currentUser.photoURL || '', bannerURL: currentUser.bannerURL || '' });
  }, [currentUser]);

  // Click outside listener to close context menus
  useEffect(() => {
      const handleClickOutside = () => setActiveMenuId(null);
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // --- PATH LOGIC (Centralized) ---
  const currentChatPath = useMemo(() => {
      if (selectedUser) {
          const id1 = currentUser.uid;
          const id2 = selectedUser.uid;
          // Sort to ensure same path regardless of who is sender/receiver
          return `private_messages/${[id1, id2].sort().join('_')}`;
      }
      return 'messages';
  }, [selectedUser, currentUser.uid]);

  // --- READ STATUS LOGIC ---
  useEffect(() => {
      if (!selectedUser) return; // Only process read receipts for private chats for now

      const markAsRead = async () => {
          // 1. Mark Messages as Read
          const unreadMsgsQuery = query(
              ref(db, currentChatPath), 
              orderByChild('status'), 
              equalTo('sent') // or delivered
          );
          
          const snapshot = await get(unreadMsgsQuery);
          if (snapshot.exists()) {
              const updates: any = {};
              snapshot.forEach((child) => {
                  if (child.val().senderId !== currentUser.uid) { // Only mark incoming
                      updates[`${currentChatPath}/${child.key}/status`] = 'read';
                  }
              });
              if (Object.keys(updates).length > 0) await update(ref(db), updates);
          }

          // 2. Clear Notifications for this user
          // We search for notifications where 'senderId' matches selectedUser.uid and 'read' is false
          // Since Firebase Query is limited, we fetch user's notifications and filter
          const notifRef = ref(db, `notifications/${currentUser.uid}`);
          const notifSnapshot = await get(notifRef);
          if (notifSnapshot.exists()) {
              const notifUpdates: any = {};
              notifSnapshot.forEach((child) => {
                  const notif = child.val();
                  if (!notif.read && notif.type === 'message' && notif.message.includes(selectedUser.name.split(' ')[0])) {
                      notifUpdates[`notifications/${currentUser.uid}/${child.key}/read`] = true;
                  }
              });
              if (Object.keys(notifUpdates).length > 0) await update(ref(db), notifUpdates);
          }
      };

      markAsRead();
  }, [currentChatPath, selectedUser, currentUser.uid]);


  // --- MESSAGES LISTENER ---
  useEffect(() => {
    setMessages([]); // Clear on switch
    const messagesRef = query(ref(db, currentChatPath), limitToLast(150));
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            setMessages(list);
        } else {
            setMessages([]);
        }
    });

    return () => off(messagesRef);
  }, [currentChatPath]);

  // Scroll to bottom
  useEffect(() => {
      if (!searchTerm) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [messages, searchTerm, replyingTo, attachmentPreview]);

  // --- HANDLERS ---

  const handleSendMessage = async (e?: React.FormEvent) => {
      e?.preventDefault();
      
      const content = newMessage.trim();
      const hasAttachment = !!attachmentPreview;

      if (!content && !hasAttachment) return;

      const msgData: any = {
          senderId: currentUser.uid,
          senderName: currentUser.name,
          senderPhoto: currentUser.photoURL || '',
          text: hasAttachment ? (attachmentPreview?.name || 'Anexo') : content,
          type: hasAttachment ? attachmentPreview!.type : 'text',
          timestamp: new Date().toISOString(),
          status: 'sent',
      };

      if (hasAttachment && attachmentPreview?.url) {
          msgData.fileUrl = attachmentPreview.url;
      }

      if (replyingTo) {
          msgData.replyTo = { id: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderName };
      }

      try {
          if (editingMessageId) {
              await update(ref(db, `${currentChatPath}/${editingMessageId}`), { text: content, edited: true });
              setEditingMessageId(null);
          } else {
              // 1. Send Message
              await push(ref(db, currentChatPath), msgData);

              // 2. Send Notification (If private chat)
              if (selectedUser) {
                  const notificationData = {
                      recipientId: selectedUser.uid,
                      senderId: currentUser.uid,
                      senderName: currentUser.name,
                      message: `Nova mensagem de ${currentUser.name.split(' ')[0]}`,
                      type: 'message',
                      timestamp: new Date().toISOString(),
                      read: false,
                      linkTo: 'chat'
                  };
                  await push(ref(db, `notifications/${selectedUser.uid}`), notificationData);
              }
          }
          
          // Reset UI
          setNewMessage('');
          setReplyingTo(null);
          setAttachmentPreview(null);
          setShowAttachMenu(false);
      } catch (err) {
          console.error(err);
          alert("Erro ao enviar.");
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          if (evt.target?.result) {
              let type: MessageType = 'file';
              if (file.type.startsWith('image/')) type = 'image';
              else if (file.type.startsWith('video/')) type = 'video';
              
              setAttachmentPreview({
                  type,
                  url: evt.target.result as string,
                  name: file.name
              });
              setShowAttachMenu(false);
          }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
  };

  const handleLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
              const link = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
              setAttachmentPreview({ type: 'location', url: link, name: 'Localização Atual' });
              setShowAttachMenu(false);
          });
      }
  };

  const handleDelete = (e: React.MouseEvent, msgId: string) => {
      e.stopPropagation(); // Prevent closing menu immediately
      // Close menu
      setActiveMenuId(null);
      // Set delete state using the STABLE current path
      setMessageToDelete({ id: msgId, path: currentChatPath });
  };

  const confirmDeleteMessage = async () => {
      if (!messageToDelete) return;
      
      try {
          // Optimistic update
          setMessages(prev => prev.filter(m => m.id !== messageToDelete.id));
          
          await remove(ref(db, `${messageToDelete.path}/${messageToDelete.id}`));
          setMessageToDelete(null);
      } catch (err: any) {
          console.error(err);
          alert("Erro ao apagar mensagem: " + err.message);
      }
  };

  const handlePin = async (e: React.MouseEvent, msgId: string, current: boolean) => {
      e.stopPropagation();
      setActiveMenuId(null);
      await update(ref(db, `${currentChatPath}/${msgId}`), { pinned: !current });
  };

  const handleCreatePendency = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!pendencyForm.title) return;
      await push(ref(db, 'email_pendencies'), {
          title: pendencyForm.title,
          link: pendencyForm.link,
          status: 'pendente',
          createdBy: currentUser.name,
          timestamp: new Date().toISOString()
      });
      setShowPendencyModal(false);
      setPendencyForm({ title: '', link: '' });
      alert("Pendência criada!");
  };

  // --- RECORDING ---
  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
          mediaRecorder.onstop = () => {
              const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const reader = new FileReader();
              reader.readAsDataURL(blob); 
              reader.onloadend = () => {
                  setAttachmentPreview({ type: 'audio', url: reader.result as string, name: 'Mensagem de Voz' });
              };
              stream.getTracks().forEach(t => t.stop());
          };

          mediaRecorder.start();
          setIsRecording(true);
          setRecordingTime(0);
          timerRef.current = window.setInterval(() => setRecordingTime(p => p + 1), 1000);
      } catch { alert("Microfone indisponível."); }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
      }
  };

  const cancelRecording = () => {
      if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop(); // Stop stream
          audioChunksRef.current = []; 
          setIsRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
          setAttachmentPreview(null);
      }
  };

  // --- FILTER & GROUPING LOGIC ---
  const processedMessages = useMemo(() => {
      let filtered = messages;
      
      // Search
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          filtered = filtered.filter(m => m.text.toLowerCase().includes(lower) || m.senderName.toLowerCase().includes(lower));
      }

      // Type Filter
      if (filterType === 'MEDIA') filtered = filtered.filter(m => m.type === 'image' || m.type === 'video');
      if (filterType === 'FILES') filtered = filtered.filter(m => m.type === 'file');

      return filtered;
  }, [messages, searchTerm, filterType]);

  // --- RENDER HELPERS ---
  const highlightText = (text: string) => {
      if (!searchTerm) return text;
      const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
      return parts.map((part, i) => 
          part.toLowerCase() === searchTerm.toLowerCase() 
              ? <span key={i} className="bg-yellow-500/40 text-white rounded px-0.5">{part}</span> 
              : part
      );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden relative font-sans">
        
        {/* === LEFT SIDEBAR (CONTACTS) === */}
        <div className={`
            absolute md:static inset-y-0 left-0 z-30 w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white tracking-tight">Mensagens</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setShowProfile(true)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                            <Settings size={20} />
                        </button>
                    </div>
                </div>
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input 
                        type="text" 
                        placeholder="Pesquisar contatos..." 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {/* General Chat */}
                <button 
                    onClick={() => { setSelectedUser(null); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedUser === null ? 'bg-blue-600/10 border border-blue-600/20 shadow-md' : 'hover:bg-slate-800 border border-transparent'}`}
                >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${selectedUser === null ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <Hash size={24} />
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                        <div className="flex justify-between items-baseline">
                            <span className={`font-bold truncate ${selectedUser === null ? 'text-blue-400' : 'text-slate-200'}`}>Chat Geral</span>
                            <span className="text-[10px] text-slate-500">Agora</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">Canal oficial da equipe</p>
                    </div>
                </button>

                <div className="px-2 pt-4 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mensagens Diretas</div>
                
                {usersList.map(u => (
                    <button 
                        key={u.uid}
                        onClick={() => { setSelectedUser(u); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group ${selectedUser?.uid === u.uid ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50 border border-transparent'}`}
                    >
                        <div className="relative">
                            <Avatar url={u.photoURL} name={u.name} size="lg" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
                        </div>
                        <div className="flex-1 text-left overflow-hidden">
                            <div className="flex justify-between items-baseline">
                                <span className="font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{u.name}</span>
                            </div>
                            <p className="text-xs text-slate-500 truncate group-hover:text-slate-400">{u.jobTitle || 'Membro da Equipe'}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* === RIGHT AREA (CHAT) === */}
        <div className="flex-1 flex flex-col bg-slate-950 relative w-full h-full">
            
            {/* Header */}
            <div className="h-16 px-4 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-1 text-slate-400 hover:text-white"><ChevronLeft size={24} /></button>
                    {selectedUser ? (
                        <>
                            <Avatar url={selectedUser.photoURL} name={selectedUser.name} size="md" />
                            <div>
                                <h3 className="font-bold text-white leading-tight">{selectedUser.name}</h3>
                                <p className="text-[10px] text-emerald-500 font-medium">Online</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white"><Hash size={20}/></div>
                            <div>
                                <h3 className="font-bold text-white leading-tight">Chat Geral</h3>
                                <p className="text-[10px] text-slate-400">Todos os membros</p>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-1 md:gap-3">
                    <div className={`relative transition-all duration-300 ${showSearch ? 'w-48 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Buscar..." 
                            className="w-full bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5 text-xs text-white focus:outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onBlur={() => !searchTerm && setShowSearch(false)}
                        />
                    </div>
                    <button onClick={() => setShowSearch(!showSearch)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"><Search size={20}/></button>
                    <button onClick={() => setShowPendencyModal(true)} className="p-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-full transition-colors" title="Criar Pendência"><AlertCircle size={20}/></button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed" ref={messagesContainerRef}>
                <div className="max-w-4xl mx-auto flex flex-col justify-end min-h-full pb-2">
                    {processedMessages.map((msg, index) => {
                        const isMe = msg.senderId === currentUser.uid;
                        
                        // Grouping Logic
                        const prevMsg = processedMessages[index - 1];
                        const nextMsg = processedMessages[index + 1];
                        
                        const isFirstInSequence = !prevMsg || prevMsg.senderId !== msg.senderId || (new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() > 300000); // 5 min gap breaks sequence
                        const isLastInSequence = !nextMsg || nextMsg.senderId !== msg.senderId;
                        
                        // Date Separator Logic
                        const showDate = !prevMsg || formatMessageDate(prevMsg.timestamp) !== formatMessageDate(msg.timestamp);

                        return (
                            <React.Fragment key={msg.id}>
                                {showDate && (
                                    <div className="flex justify-center my-6 sticky top-2 z-10">
                                        <span className="bg-slate-800/80 backdrop-blur text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full border border-slate-700 shadow-sm">
                                            {formatMessageDate(msg.timestamp)}
                                        </span>
                                    </div>
                                )}

                                <div className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} group mb-1 ${isLastInSequence ? 'mb-4' : ''} animate-fade-in`}>
                                    {/* Avatar (only show on last message of sequence for other users) */}
                                    <div className="w-10 flex flex-col justify-end">
                                        {!isMe && isLastInSequence && <Avatar url={msg.senderPhoto} name={msg.senderName} size="md" />}
                                    </div>

                                    <div className={`max-w-[85%] sm:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        
                                        {/* Name (only first in sequence for others) */}
                                        {!isMe && isFirstInSequence && (
                                            <span className="text-[11px] font-bold text-slate-400 ml-1 mb-1">{msg.senderName}</span>
                                        )}

                                        {/* Bubble */}
                                        <div className={`
                                            relative px-3 py-2 shadow-sm text-sm break-words
                                            ${isMe 
                                                ? 'bg-blue-600 text-white rounded-l-2xl rounded-tr-2xl' 
                                                : 'bg-slate-800 text-slate-200 rounded-r-2xl rounded-tl-2xl'}
                                            ${!isFirstInSequence && isMe ? 'rounded-tr-md' : ''}
                                            ${!isLastInSequence && isMe ? 'rounded-br-md' : 'rounded-br-2xl'}
                                            ${!isFirstInSequence && !isMe ? 'rounded-tl-md' : ''}
                                            ${!isLastInSequence && !isMe ? 'rounded-bl-md' : 'rounded-bl-2xl'}
                                        `}>
                                            {/* Reply Context */}
                                            {msg.replyTo && (
                                                <div className={`mb-2 p-2 rounded bg-black/20 border-l-2 ${isMe ? 'border-blue-300' : 'border-slate-500'} text-xs overflow-hidden`}>
                                                    <p className="font-bold opacity-90">{msg.replyTo.senderName}</p>
                                                    <p className="opacity-70 truncate">{msg.replyTo.text}</p>
                                                </div>
                                            )}

                                            {/* Content Types */}
                                            {msg.type === 'text' && <p className="whitespace-pre-wrap leading-relaxed">{highlightText(msg.text)}</p>}
                                            
                                            {msg.type === 'image' && msg.fileUrl && (
                                                <div className="mt-1 mb-2">
                                                    <img 
                                                        src={msg.fileUrl} 
                                                        alt="Attachment" 
                                                        className="rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                        onClick={() => setViewingImage(msg.fileUrl!)}
                                                    />
                                                </div>
                                            )}

                                            {msg.type === 'audio' && msg.fileUrl && (
                                                <div className="flex items-center gap-3 min-w-[200px] py-2">
                                                    <div className="p-2 bg-white/20 rounded-full"><Play size={16} className="fill-current" /></div>
                                                    <audio src={msg.fileUrl} controls className="h-8 w-40 opacity-80" />
                                                </div>
                                            )}

                                            {msg.type === 'file' && msg.fileUrl && (
                                                <a href={msg.fileUrl} download={msg.text} className="flex items-center gap-3 bg-black/20 p-3 rounded-lg hover:bg-black/30 transition-colors my-1">
                                                    <FileText size={24} />
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="font-bold truncate">{msg.text}</p>
                                                        <p className="text-[10px] opacity-70">Clique para baixar</p>
                                                    </div>
                                                    <Download size={16} />
                                                </a>
                                            )}

                                            {/* Metadata Footer */}
                                            <div className="flex items-center justify-end gap-1 mt-1 opacity-70 select-none">
                                                {msg.pinned && <Pin size={10} className="fill-current" />}
                                                {msg.edited && <span className="text-[9px] italic">editado</span>}
                                                <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
                                                {isMe && <CheckCheck size={12} className={msg.status === 'read' ? 'text-blue-200' : ''} />}
                                            </div>

                                            {/* Reactions */}
                                            {msg.reactions && (
                                                <div className="absolute -bottom-3 right-2 flex gap-1">
                                                    {Object.keys(msg.reactions).map(emoji => (
                                                        <span key={emoji} className="bg-slate-700 border border-slate-600 text-xs px-1.5 rounded-full shadow-sm">{emoji}</span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Context Menu Trigger (Click Based) */}
                                            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === msg.id ? null : msg.id); }}
                                                    className="bg-black/30 hover:bg-black/50 rounded-full p-1 text-white backdrop-blur-sm"
                                                >
                                                    <ChevronDown size={12} />
                                                </button>
                                                
                                                {/* Click-based Menu */}
                                                {activeMenuId === msg.id && (
                                                    <div className="absolute right-0 top-6 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden py-1 animate-fade-in">
                                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setReplyingTo(msg); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex gap-2 text-slate-200"><CornerUpLeft size={14}/> Responder</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); navigator.clipboard.writeText(msg.text); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex gap-2 text-slate-200"><Copy size={14}/> Copiar</button>
                                                        <button onClick={(e) => handlePin(e, msg.id, !!msg.pinned)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex gap-2 text-slate-200"><Pin size={14}/> Fixar</button>
                                                        {isMe && (
                                                            <>
                                                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setNewMessage(msg.text); setEditingMessageId(msg.id); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex gap-2 text-slate-200"><Edit2 size={14}/> Editar</button>
                                                                <button onClick={(e) => handleDelete(e, msg.id)} className="w-full text-left px-3 py-2 text-xs hover:bg-rose-900/50 text-rose-400 flex gap-2"><Trash2 size={14}/> Apagar</button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="bg-slate-900 border-t border-slate-800 p-3 md:p-4 z-30">
                {/* Previews (Reply / Attachment) */}
                {(replyingTo || attachmentPreview) && (
                    <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg p-2 mb-2 animate-fade-in">
                        <div className="flex items-center gap-3 overflow-hidden">
                            {replyingTo && (
                                <div className="border-l-4 border-blue-500 pl-2">
                                    <span className="text-xs text-blue-400 font-bold block">Respondendo a {replyingTo.senderName}</span>
                                    <span className="text-xs text-slate-400 truncate block">{replyingTo.text}</span>
                                </div>
                            )}
                            {attachmentPreview && (
                                <div className="flex items-center gap-3">
                                    {attachmentPreview.type === 'image' ? (
                                        <img src={attachmentPreview.url} alt="Preview" className="h-10 w-10 object-cover rounded" />
                                    ) : (
                                        <div className="h-10 w-10 bg-slate-700 rounded flex items-center justify-center"><FileText size={20} /></div>
                                    )}
                                    <div>
                                        <span className="text-xs text-emerald-400 font-bold block">Anexando Arquivo</span>
                                        <span className="text-xs text-slate-400 truncate block">{attachmentPreview.name}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => { setReplyingTo(null); setAttachmentPreview(null); }} className="p-1 hover:bg-slate-700 rounded-full"><X size={16} /></button>
                    </div>
                )}

                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                    {/* Attachment Menu Button */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowAttachMenu(!showAttachMenu)} 
                            className={`p-3 rounded-full transition-colors ${showAttachMenu ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <PlusCircle size={24} />
                        </button>
                        
                        {/* Attach Menu Popup */}
                        {showAttachMenu && (
                            <div className="absolute bottom-14 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 flex flex-col gap-1 w-48 animate-fade-in z-50">
                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700 rounded-lg text-sm text-slate-200 transition-colors">
                                    <div className="bg-purple-500/20 p-1.5 rounded text-purple-400"><ImageIcon size={18}/></div> Galeria
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700 rounded-lg text-sm text-slate-200 transition-colors">
                                    <div className="bg-blue-500/20 p-1.5 rounded text-blue-400"><FileText size={18}/></div> Documento
                                </button>
                                <button onClick={handleLocation} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700 rounded-lg text-sm text-slate-200 transition-colors">
                                    <div className="bg-rose-500/20 p-1.5 rounded text-rose-400"><MapPin size={18}/></div> Localização
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                            </div>
                        )}
                    </div>

                    {/* Text Input or Recording UI */}
                    <div className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl flex items-center relative transition-colors focus-within:border-blue-500">
                        {isRecording ? (
                            <div className="flex-1 flex items-center justify-between px-4 py-3 text-rose-500 animate-pulse font-bold">
                                <div className="flex items-center gap-2"><Mic size={20} className="fill-current"/> <span>Gravando {recordingTime}s...</span></div>
                                <button onClick={cancelRecording} className="text-slate-400 text-xs hover:text-white uppercase">Cancelar</button>
                            </div>
                        ) : (
                            <>
                                <button className="pl-3 text-slate-500 hover:text-yellow-400 transition-colors" onClick={() => setNewMessage(p => p + '😊')}><Smile size={20}/></button>
                                <input 
                                    type="text" 
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Mensagem"
                                    className="flex-1 bg-transparent border-none text-white px-3 py-3 focus:outline-none placeholder-slate-500"
                                />
                            </>
                        )}
                    </div>

                    {/* Action Button (Mic or Send) */}
                    {(newMessage.trim() || attachmentPreview) ? (
                        <button onClick={() => handleSendMessage()} className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg transition-transform hover:scale-105">
                            <Send size={20} className="ml-0.5" />
                        </button>
                    ) : (
                        <button 
                            onMouseDown={startRecording} 
                            onMouseUp={stopRecording} 
                            className={`p-3 rounded-full shadow-lg transition-all ${isRecording ? 'bg-rose-600 text-white scale-110' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        >
                            <Mic size={20} />
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* --- MODALS --- */}
        {viewingImage && <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} />}
        
        {showPendencyModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-slate-900 border border-amber-500/30 rounded-xl shadow-2xl w-full max-w-md p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><AlertCircle className="text-amber-500" /> Nova Pendência</h3>
                    <form onSubmit={handleCreatePendency} className="space-y-4">
                        <input type="text" autoFocus required value={pendencyForm.title} onChange={e => setPendencyForm({...pendencyForm, title: e.target.value})} placeholder="Título" className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-amber-500 outline-none" />
                        <input type="text" value={pendencyForm.link} onChange={e => setPendencyForm({...pendencyForm, link: e.target.value})} placeholder="Link (Opcional)" className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-amber-500 outline-none" />
                        <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowPendencyModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button><button type="submit" className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold">Criar</button></div>
                    </form>
                </div>
            </div>
        )}

        {showProfile && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-fade-in">
                <div className="w-full max-w-md bg-slate-900 h-full border-l border-slate-800 shadow-2xl p-6">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-bold text-white">Meu Perfil</h2>
                        <button onClick={() => setShowProfile(false)}><X className="text-slate-400 hover:text-white" /></button>
                    </div>
                    {/* Simplified Profile View */}
                    <div className="flex flex-col items-center mb-6">
                        <Avatar url={currentUser.photoURL} name={currentUser.name} size="xl" className="mb-4" />
                        <h3 className="text-xl font-bold text-white">{currentUser.name}</h3>
                        <p className="text-slate-500">{currentUser.email}</p>
                    </div>
                    <div className="space-y-4">
                        <input type="text" value={editProfile.jobTitle} onChange={e => setEditProfile({...editProfile, jobTitle: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white placeholder-slate-600" placeholder="Cargo" />
                        <textarea value={editProfile.bio} onChange={e => setEditProfile({...editProfile, bio: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white h-24 resize-none placeholder-slate-600" placeholder="Bio" />
                        <button onClick={async () => { await authService.updateUserProfile(currentUser.uid, editProfile); setShowProfile(false); }} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors">Salvar Alterações</button>
                    </div>
                </div>
            </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {messageToDelete && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
                            <AlertTriangle className="text-rose-500" size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            Apagar Permanentemente?
                        </h3>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Você tem certeza que deseja excluir esta mensagem? <br/>
                            <span className="text-rose-400 font-semibold">Ela será removida do banco de dados para todos os usuários.</span>
                        </p>
                    </div>
                    <div className="flex justify-center gap-3">
                        <button 
                            onClick={() => setMessageToDelete(null)}
                            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium text-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmDeleteMessage}
                            className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-rose-900/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 size={16} /> Sim, Apagar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Chat;
