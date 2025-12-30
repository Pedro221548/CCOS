
import { useState, useEffect, useRef } from 'react';
import { ref, query, limitToLast, onChildAdded } from 'firebase/database';
import { db } from '../services/firebase';
import { User, AppNotification } from '../types';

export const useChatNotifications = (user: User | null, activeTab: string, addNotification: (msg: string, type: AppNotification['type']) => void) => {
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const appStartTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!user) return;

    // Listen to the last message added to 'messages' (General Chat)
    const messagesRef = query(ref(db, 'messages'), limitToLast(1));
    
    const unsubscribe = onChildAdded(messagesRef, (snapshot) => {
        const msg = snapshot.val();
        if (!msg) return;

        // 1. Check timestamp
        const msgTime = new Date(msg.timestamp).getTime();
        if (msgTime <= appStartTimeRef.current) return;

        // 2. Check sender
        if (msg.senderId === user.uid) return;

        // 3. Check active tab
        if (activeTab !== 'chat') {
            setUnreadChatCount(prev => prev + 1);
            addNotification(`Nova mensagem de ${msg.senderName.split(' ')[0]} no Chat Geral`, 'message');
        }
    });

    return () => unsubscribe();
  }, [user, activeTab, addNotification]);

  const clearUnread = () => setUnreadChatCount(0);

  return { unreadChatCount, clearUnread };
};
