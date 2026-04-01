
import { ref, set } from 'firebase/database';
import { db } from './firebase';
import { Note, ShiftNote } from '../types';

class OrganizerService {
  // --- Notes ---
  async addNote(note: Note, currentNotes: Note[], userId: string) {
    await set(ref(db, `monitoramento/organizer/notes/${userId}`), [note, ...currentNotes]);
  }

  async toggleNote(id: string, currentNotes: Note[], userId: string) {
    const newNotes = currentNotes.map(n => n.id === id ? { ...n, completed: !n.completed } : n);
    await set(ref(db, `monitoramento/organizer/notes/${userId}`), newNotes);
  }

  async editNote(id: string, content: string, currentNotes: Note[], userId: string) {
    const newNotes = currentNotes.map(n => n.id === id ? { ...n, content } : n);
    await set(ref(db, `monitoramento/organizer/notes/${userId}`), newNotes);
  }

  async deleteNote(id: string, currentNotes: Note[], userId: string) {
    const newNotes = currentNotes.filter(n => n.id !== id);
    await set(ref(db, `monitoramento/organizer/notes/${userId}`), newNotes);
  }

  // --- Shift Notes (Plantão) ---
  async addShiftNote(note: ShiftNote, currentNotes: ShiftNote[] = []) {
    await set(ref(db, 'monitoramento/organizer/shift_notes'), [note, ...currentNotes]);
  }

  async deleteShiftNote(id: string, currentNotes: ShiftNote[]) {
    const newNotes = currentNotes.filter(n => n.id !== id);
    await set(ref(db, 'monitoramento/organizer/shift_notes'), newNotes);
  }
}

export const organizerService = new OrganizerService();
