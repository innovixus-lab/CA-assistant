/**
 * Firestore message store.
 *
 * Collection: `messages`
 * Each document represents one inbound or outbound message.
 */

import { adminDb } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export interface Message {
  id?: string;
  channel: 'whatsapp' | 'email';
  direction: 'inbound' | 'outbound';
  sender: string;
  recipient?: string;
  subject?: string;       // email only
  body: string;
  snippet: string;
  hasAttachment: boolean;
  attachments?: Array<{ filename?: string; url?: string; contentType: string; size?: number }>;
  // Gemini-enriched fields (populated after /api/process-message)
  clientName?: string;
  category?: string;
  actionRequired?: boolean;
  processed: boolean;
  // Metadata
  externalId?: string;    // Twilio SID or email Message-ID
  timestamp: FirebaseFirestore.Timestamp | Date;
  createdAt: FirebaseFirestore.FieldValue | Date;
}

const COLLECTION = 'messages';

export async function saveMessage(msg: Omit<Message, 'id' | 'createdAt'>): Promise<string> {
  const ref = await adminDb.collection(COLLECTION).add({
    ...msg,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateMessage(id: string, data: Partial<Message>): Promise<void> {
  await adminDb.collection(COLLECTION).doc(id).update(data);
}

export async function getMessages(limit = 50): Promise<Message[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message));
}

export async function getMessageById(id: string): Promise<Message | null> {
  const doc = await adminDb.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Message;
}
