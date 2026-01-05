
import { useEffect, useRef } from 'react';
import { ref, query, limitToLast, onChildAdded } from 'firebase/database';
import { db } from '../services/firebase';
import { notificationService } from '../services/notificationService';
import { User } from '../types';

export const useNotificationSounds = (user: User | null, onNewAlert?: (msg: string, type: 'info' | 'success' | 'alert') => void) => {
  const appStartTime = useRef(Date.now());
  const isFirstLoadTasks = useRef(true);
  const isFirstLoadNotes = useRef(true);
  const isFirstLoadFeedbacks = useRef(true);

  useEffect(() => {
    if (!user) return;

    // 1. MONITORAR NOVAS TAREFAS
    const tasksRef = query(ref(db, 'tasks'), limitToLast(1));
    const unsubTasks = onChildAdded(tasksRef, (snapshot) => {
      if (isFirstLoadTasks.current) {
        isFirstLoadTasks.current = false;
        return;
      }
      
      const task = snapshot.val();
      if (task.createdAt && new Date(task.createdAt).getTime() > appStartTime.current) {
         if (task.assignedToId === user.uid || user.role === 'admin') {
            notificationService.playNotificationSound();
            if (onNewAlert) onNewAlert(`Nova tarefa: ${task.title}`, 'info');
         }
      }
    });

    // 2. MONITORAR NOVOS RELATÓRIOS DE PLANTÃO (SHIFT NOTES)
    const shiftNotesRef = query(ref(db, 'monitoramento/organizer/shift_notes'), limitToLast(1));
    const unsubNotes = onChildAdded(shiftNotesRef, (snapshot) => {
      if (isFirstLoadNotes.current) {
        isFirstLoadNotes.current = false;
        return;
      }

      const note = snapshot.val();
      if (note.createdAt && new Date(note.createdAt).getTime() > appStartTime.current) {
        if (note.authorId !== user.uid) {
            notificationService.playNotificationSound();
            if (onNewAlert) onNewAlert(`${note.author} adicionou um novo registro de plantão`, 'success');
        }
      }
    });

    // 3. MONITORAR NOVOS FEEDBACKS (APENAS PARA ADMINS)
    if (user.role === 'admin') {
        const feedbacksRef = query(ref(db, 'monitoramento/feedbacks'), limitToLast(1));
        const unsubFeedbacks = onChildAdded(feedbacksRef, (snapshot) => {
            if (isFirstLoadFeedbacks.current) {
                isFirstLoadFeedbacks.current = false;
                return;
            }
            const fb = snapshot.val();
            if (fb.timestamp && new Date(fb.timestamp).getTime() > appStartTime.current) {
                notificationService.playNotificationSound();
                const typeLabel = fb.type === 'bug' ? 'Erro/Bug' : fb.type === 'suggestion' ? 'Sugestão' : 'Elogio';
                if (onNewAlert) onNewAlert(`Novo feedback (${typeLabel}) de ${fb.userName}`, 'alert');
            }
        });
        return () => {
            unsubTasks();
            unsubNotes();
            unsubFeedbacks();
        };
    }

    return () => {
      unsubTasks();
      unsubNotes();
    };
  }, [user, onNewAlert]);
};
