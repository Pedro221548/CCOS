
import { ref, set, update, push, remove } from 'firebase/database';
import { db } from './firebase';
import { Task, TaskAttachment, TaskStatus } from '../types';

class TaskService {
  async createTask(task: Omit<Task, 'id'>) {
    const newTaskRef = push(ref(db, 'tasks'));
    if (newTaskRef.key) {
        await set(newTaskRef, { ...task, id: newTaskRef.key });
    }
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, note?: string) {
    const updates: any = { status };
    if (status === 'in_progress') {
        updates.startedAt = new Date().toISOString();
    } else if (status === 'completed') {
        updates.completedAt = new Date().toISOString();
        if (note !== undefined) {
            updates.completionNote = note;
        }
    }
    await update(ref(db, `tasks/${taskId}`), updates);
  }

  async updateTaskNote(taskId: string, note: string) {
    await update(ref(db, `tasks/${taskId}`), { completionNote: note });
  }

  async addAttachment(taskId: string, attachment: TaskAttachment, currentAttachments: TaskAttachment[] = []) {
    const newAttachments = [...currentAttachments, attachment];
    await update(ref(db, `tasks/${taskId}`), { attachments: newAttachments });
  }

  async deleteTask(taskId: string) {
    await remove(ref(db, `tasks/${taskId}`));
  }
}

export const taskService = new TaskService();
