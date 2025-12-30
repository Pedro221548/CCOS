
import { useEffect, useRef } from 'react';
import { ref, query, limitToLast, onChildAdded } from 'firebase/database';
import { db } from '../services/firebase';
import { notificationService } from '../services/notificationService';
import { User } from '../types';

export const useNotificationSounds = (user: User | null) => {
  const appStartTime = useRef(Date.now());
  const isFirstLoadTasks = useRef(true);
  const isFirstLoadNotes = useRef(true);

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
      // Toca se a tarefa for nova E o usuário não for o criador (evitar eco do próprio som)
      // Ou se for atribuída ao usuário atual
      if (task.createdAt && new Date(task.createdAt).getTime() > appStartTime.current) {
         if (task.assignedToId === user.uid || user.role === 'admin') {
            notificationService.playNotificationSound();
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
        // Alerta para todos exceto quem escreveu
        if (note.authorId !== user.uid) {
            notificationService.playNotificationSound();
        }
      }
    });

    return () => {
      unsubTasks();
      unsubNotes();
    };
  }, [user]);
};
