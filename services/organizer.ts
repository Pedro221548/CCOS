
import { ref, set } from 'firebase/database';
import { db } from './firebase';
import { Note, ShiftNote } from '../types';

class OrganizerService {
  // --- Notes ---
  async addNote(note: Note, currentNotes: Note[]) {
    await set(ref(db, 'monitoramento/organizer/notes'), [note, ...currentNotes]);
  }

  async toggleNote(id: string, currentNotes: Note[]) {
    const newNotes = currentNotes.map(n => n.id === id ? { ...n, completed: !n.completed } : n);
    await set(ref(db, 'monitoramento/organizer/notes'), newNotes);
  }

  async editNote(id: string, content: string, currentNotes: Note[]) {
    const newNotes = currentNotes.map(n => n.id === id ? { ...n, content } : n);
    await set(ref(db, 'monitoramento/organizer/notes'), newNotes);
  }

  async deleteNote(id: string, currentNotes: Note[]) {
    const newNotes = currentNotes.filter(n => n.id !== id);
    await set(ref(db, 'monitoramento/organizer/notes'), newNotes);
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
