/**
 * In-memory hand-off between pages during client-side navigation (e.g. a note
 * typed in the combo dialog prefilling the contact form). Never persisted:
 * a reload clears it, and nothing here reaches the URL, storage or logs.
 */
let pendingNote: string | null = null;

export function setPendingNote(note: string) {
  pendingNote = note.trim() ? note.slice(0, 500) : null;
}

export function takePendingNote() {
  const n = pendingNote;
  pendingNote = null;
  return n;
}
