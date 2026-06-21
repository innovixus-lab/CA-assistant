/**
 * localStorage adapter — drop-in replacement for the Firestore client.
 *
 * Exports the exact same function signatures as the real Firestore version so
 * every component works without any changes.
 *
 * Real-time subscriptions are simulated via a custom DOM event
 * ("ls-change:<collection>") that is dispatched whenever a collection mutates.
 *
 * Switch back to Firestore by swapping this file with the original.
 */

// ─── Types (unchanged) ────────────────────────────────────────────────────────

export interface Employee {
  id?: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  password: string;          // plain text for local testing only
  assignedClientIds?: string[];
  createdAt?: { seconds: number };
}

// ─── Payment Request ──────────────────────────────────────────────────────────

export interface PaymentRequest {
  id?: string;
  clientId: string;
  clientName: string;
  amount: number;
  note: string;
  status: 'Pending' | 'Paid' | 'Cancelled';
  raisedBy: string;        // employee name
  raisedById: string;      // employee id
  month: string;           // "2026-05" — used for monthly grouping
  paidAt?: { seconds: number };
  createdAt?: { seconds: number };
}

export interface Client {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  pan: string;
  gst: string;
  status: 'Active' | 'Inactive';
  portalPin?: string;
  pendingPayment?: boolean;
  paymentAmount?: number;
  paymentNote?: string;
  createdAt?: { seconds: number };
}

export interface Task {
  id?: string;
  title: string;
  client: string;
  clientId?: string;
  assignee: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  due: string;
  notes?: string;
  createdAt?: { seconds: number };
}

export interface VaultDocument {
  id?: string;
  name: string;
  client: string;
  clientId?: string;
  type: string;
  size: string;
  date: string;
  status: 'Verified' | 'Pending Review';
  downloadUrl?: string;
  storagePath?: string;
  approvedForPortal?: boolean;
  portalNotified?: boolean;
  createdAt?: { seconds: number };
}

export interface Message {
  id?: string;
  channel: 'whatsapp' | 'email';
  direction: 'inbound' | 'outbound';
  sender: string;
  recipient?: string;
  subject?: string;
  body: string;
  snippet: string;
  hasAttachment: boolean;
  clientName?: string;
  category?: string;
  actionRequired?: boolean;
  processed: boolean;
  timestamp: { seconds: number } | Date;
  createdAt?: { seconds: number };
}

// ─── Core localStorage store ──────────────────────────────────────────────────

const KEYS = {
  clients:   'ls_clients',
  tasks:     'ls_tasks',
  documents: 'ls_documents',
  messages:  'ls_messages',
  employees: 'ls_employees',
  payments:  'ls_payments',
} as const;

type CollectionName = keyof typeof KEYS;

function now(): { seconds: number } {
  return { seconds: Math.floor(Date.now() / 1000) };
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Convert a name to a URL-safe slug, e.g. "Acme Corp" → "acme-corp" */
function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function read<T>(col: CollectionName): T[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS[col]) ?? '[]') as T[];
  } catch {
    return [];
  }
}

function write<T>(col: CollectionName, data: T[]): void {
  localStorage.setItem(KEYS[col], JSON.stringify(data));
  // Notify all active subscriptions for this collection
  window.dispatchEvent(new CustomEvent(`ls-change:${col}`));
}

/** Subscribe to a collection. Returns an unsubscribe function. */
function subscribe<T>(
  col: CollectionName,
  selector: (items: T[]) => T[],
  cb: (items: T[]) => void
): () => void {
  const notify = () => cb(selector(read<T>(col)));
  notify(); // emit immediately
  const handler = () => notify();
  window.addEventListener(`ls-change:${col}`, handler);
  return () => window.removeEventListener(`ls-change:${col}`, handler);
}

// ─── Seed demo data ───────────────────────────────────────────────────────────

function seedIfEmpty() {
  // Version key — bump this to force a re-seed when slug IDs were introduced
  const SEED_VERSION = 'v5';
  if (localStorage.getItem('ls_seed_version') === SEED_VERSION && read('clients').length > 0) return;
  localStorage.setItem('ls_seed_version', SEED_VERSION);

  const ts = (offset = 0) => ({ seconds: Math.floor(Date.now() / 1000) - offset });

  // Use human-readable slug IDs so /portal/acme-corp works out of the box
  const clientIds = ['acme-corp', 'global-tech-solutions', 'indus-dynamics', 'zenith-logistics'];

  const clients: Client[] = [
    { id: clientIds[0], name: 'Acme Corp',             email: 'contact@acme.com',  phone: '+91 98765 43210', pan: 'AAAAA1111A', gst: '27AAAAA1111A1Z5', status: 'Active',   portalPin: '1234', pendingPayment: false, createdAt: ts(86400 * 10) },
    { id: clientIds[1], name: 'Global Tech Solutions',  email: 'admin@gt-sol.io',   phone: '+91 88888 00000', pan: 'BBBBB2222B', gst: '09BBBBB2222B2Z4', status: 'Active',   portalPin: '5678', pendingPayment: true,  paymentAmount: 12500, paymentNote: 'GST Filing Fee - May 2026', createdAt: ts(86400 * 8) },
    { id: clientIds[2], name: 'Indus Dynamics',         email: 'finance@indus.in',  phone: '+91 77777 11111', pan: 'CCCCC3333C', gst: '27CCCCC3333C3Z3', status: 'Inactive', portalPin: '9999', pendingPayment: false, createdAt: ts(86400 * 5) },
    { id: clientIds[3], name: 'Zenith Logistics',       email: 'ops@zenith.com',    phone: '+91 66666 22222', pan: 'DDDDD4444D', gst: '19DDDDD4444D4Z2', status: 'Active',   portalPin: '2468', pendingPayment: false, createdAt: ts(86400 * 2) },
  ];

  const tasks: Task[] = [
    { id: uid(), title: 'GST Return Filing - April', client: 'Acme Corp',            clientId: clientIds[0], assignee: 'Rajesh K.', status: 'Pending',     priority: 'High',   due: '2026-05-15', createdAt: ts(86400 * 3) },
    { id: uid(), title: 'TDS Reconciliation',        client: 'Global Tech Solutions', clientId: clientIds[1], assignee: 'Anita S.',  status: 'In Progress', priority: 'Medium', due: '2026-05-18', createdAt: ts(86400 * 2) },
    { id: uid(), title: 'Internal Audit Q1',         client: 'Indus Dynamics',        clientId: clientIds[2], assignee: 'Vikram M.', status: 'Pending',     priority: 'Low',    due: '2026-05-25', createdAt: ts(86400 * 1) },
    { id: uid(), title: 'Income Tax Assessment',     client: 'Zenith Logistics',      clientId: clientIds[3], assignee: 'Rajesh K.', status: 'Completed',   priority: 'High',   due: '2026-05-10', createdAt: ts(3600) },
  ];

  const documents: VaultDocument[] = [
    { id: uid(), name: 'pan_card_final.pdf',       client: 'Acme Corp',            clientId: clientIds[0], type: 'Identification', size: '1.2 MB', date: '2026-05-12', status: 'Verified',       approvedForPortal: true,  portalNotified: true,  createdAt: ts(86400 * 4) },
    { id: uid(), name: 'gst_certificate_2026.pdf', client: 'Acme Corp',            clientId: clientIds[0], type: 'Taxation',       size: '2.4 MB', date: '2026-05-10', status: 'Pending Review', approvedForPortal: false, portalNotified: false, createdAt: ts(86400 * 3) },
    { id: uid(), name: 'balance_sheet_fy25.xlsx',  client: 'Global Tech Solutions', clientId: clientIds[1], type: 'Financial',      size: '4.8 MB', date: '2026-05-08', status: 'Verified',       approvedForPortal: true,  portalNotified: false, createdAt: ts(86400 * 2) },
    { id: uid(), name: 'it_acknowledgement.zip',   client: 'Indus Dynamics',        clientId: clientIds[2], type: 'Income Tax',     size: '12.1 MB', date: '2026-05-05', status: 'Verified',      approvedForPortal: false, portalNotified: false, createdAt: ts(86400 * 1) },
  ];

  const messages: Message[] = [
    { id: uid(), channel: 'whatsapp', direction: 'inbound', sender: '+91 98765 43210', body: 'Please find attached my PAN card and GST certificate for review.', snippet: 'Please find attached my PAN card and GST certificate for review.', hasAttachment: true,  clientName: 'Acme Corp',            category: 'DOCUMENT_UPLOAD', actionRequired: true,  processed: true,  timestamp: ts(3600 * 2),  createdAt: ts(3600 * 2) },
    { id: uid(), channel: 'email',    direction: 'inbound', sender: 'ceo@startup.com', body: 'Financial statements for Q1 are ready. When can we discuss?',       snippet: 'Financial statements for Q1 are ready. When can we discuss?',       hasAttachment: false, clientName: 'Global Tech Solutions', category: 'GENERAL_QUERY',   actionRequired: false, processed: true,  timestamp: ts(3600 * 5),  createdAt: ts(3600 * 5) },
    { id: uid(), channel: 'whatsapp', direction: 'inbound', sender: '+91 88888 00000', body: 'Income certificates from my bank.',                                  snippet: 'Income certificates from my bank.',                                  hasAttachment: true,  clientName: 'Indus Dynamics',        category: 'DOCUMENT_UPLOAD', actionRequired: true,  processed: false, timestamp: ts(3600 * 8),  createdAt: ts(3600 * 8) },
    { id: uid(), channel: 'email',    direction: 'inbound', sender: 'ops@zenith.com',  body: 'Can you confirm the TDS filing deadline for this quarter?',          snippet: 'Can you confirm the TDS filing deadline for this quarter?',          hasAttachment: false, clientName: 'Zenith Logistics',      category: 'TAX',             actionRequired: true,  processed: false, timestamp: ts(3600 * 12), createdAt: ts(3600 * 12) },
  ];

  write('clients',   clients);
  write('tasks',     tasks);
  write('documents', documents);
  write('messages',  messages);

  const employees: Employee[] = [
    { id: 'rajesh-k',  name: 'Rajesh K.',  email: 'rajesh@finnca.com',  role: 'admin',    password: 'admin123',   assignedClientIds: clientIds, createdAt: ts(86400 * 30) },
    { id: 'anita-s',   name: 'Anita S.',   email: 'anita@finnca.com',   role: 'employee', password: 'anita123',   assignedClientIds: [clientIds[1], clientIds[3]], createdAt: ts(86400 * 20) },
    { id: 'vikram-m',  name: 'Vikram M.',  email: 'vikram@finnca.com',  role: 'employee', password: 'vikram123',  assignedClientIds: [clientIds[2]], createdAt: ts(86400 * 15) },
  ];
  write('employees', employees);

  const payments: PaymentRequest[] = [
    { id: uid(), clientId: clientIds[0], clientName: 'Acme Corp',            amount: 18000, note: 'GST Filing + ITR - April 2026',    status: 'Paid',      raisedBy: 'Rajesh K.', raisedById: 'rajesh-k', month: '2026-04', paidAt: ts(86400 * 5),  createdAt: ts(86400 * 12) },
    { id: uid(), clientId: clientIds[1], clientName: 'Global Tech Solutions', amount: 12500, note: 'GST Filing Fee - May 2026',         status: 'Pending',   raisedBy: 'Anita S.',  raisedById: 'anita-s',  month: '2026-05', createdAt: ts(86400 * 3) },
    { id: uid(), clientId: clientIds[3], clientName: 'Zenith Logistics',      amount: 9500,  note: 'TDS Reconciliation - April 2026',   status: 'Paid',      raisedBy: 'Anita S.',  raisedById: 'anita-s',  month: '2026-04', paidAt: ts(86400 * 8),  createdAt: ts(86400 * 15) },
    { id: uid(), clientId: clientIds[2], clientName: 'Indus Dynamics',        amount: 7500,  note: 'Internal Audit Q1 - March 2026',   status: 'Paid',      raisedBy: 'Vikram M.', raisedById: 'vikram-m', month: '2026-03', paidAt: ts(86400 * 20), createdAt: ts(86400 * 25) },
    { id: uid(), clientId: clientIds[0], clientName: 'Acme Corp',             amount: 15000, note: 'Annual Compliance Review',          status: 'Paid',      raisedBy: 'Rajesh K.', raisedById: 'rajesh-k', month: '2026-03', paidAt: ts(86400 * 22), createdAt: ts(86400 * 28) },
    { id: uid(), clientId: clientIds[1], clientName: 'Global Tech Solutions', amount: 11000, note: 'Quarterly GST Filing - Q4 2025',   status: 'Paid',      raisedBy: 'Anita S.',  raisedById: 'anita-s',  month: '2026-02', paidAt: ts(86400 * 35), createdAt: ts(86400 * 40) },
    { id: uid(), clientId: clientIds[2], clientName: 'Indus Dynamics',        amount: 6000,  note: 'Tax Advisory - Feb 2026',          status: 'Cancelled', raisedBy: 'Vikram M.', raisedById: 'vikram-m', month: '2026-02', createdAt: ts(86400 * 38) },
    { id: uid(), clientId: clientIds[3], clientName: 'Zenith Logistics',      amount: 8500,  note: 'Income Tax Assessment Filing',     status: 'Paid',      raisedBy: 'Rajesh K.', raisedById: 'rajesh-k', month: '2026-05', paidAt: ts(86400 * 1),  createdAt: ts(86400 * 4) },
  ];
  write('payments', payments);
}

// Run seed immediately
seedIfEmpty();

// ─── Clients ──────────────────────────────────────────────────────────────────

export function subscribeClients(cb: (clients: Client[]) => void): () => void {
  return subscribe<Client>('clients', items =>
    [...items].sort((a, b) => a.name.localeCompare(b.name)), cb
  );
}

export async function getClients(): Promise<Client[]> {
  return [...read<Client>('clients')].sort((a, b) => a.name.localeCompare(b.name));
}

export async function addClient(data: Omit<Client, 'id' | 'createdAt'>): Promise<string> {
  // Use a slug derived from the name so portal URLs are human-readable,
  // e.g. "Acme Corp" → id "acme-corp" → /portal/acme-corp
  const baseSlug = toSlug(data.name) || uid();
  const existing = read<Client>('clients');
  // Ensure uniqueness by appending a counter if slug already taken
  let id = baseSlug;
  let counter = 2;
  while (existing.some(c => c.id === id)) {
    id = `${baseSlug}-${counter++}`;
  }
  existing.push({ ...data, id, createdAt: now() });
  write('clients', existing);
  return id;
}

export async function updateClient(id: string, data: Partial<Client>): Promise<void> {
  const items = read<Client>('clients').map(c => c.id === id ? { ...c, ...data } : c);
  write('clients', items);
}

export async function deleteClient(id: string): Promise<void> {
  write('clients', read<Client>('clients').filter(c => c.id !== id));
}

export async function getClientById(id: string): Promise<Client | null> {
  const all = read<Client>('clients');
  // Match by exact ID first, then fall back to slug match on name
  return all.find(c => c.id === id)
    ?? all.find(c => toSlug(c.name) === id.toLowerCase())
    ?? null;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function subscribeTasks(cb: (tasks: Task[]) => void): () => void {
  return subscribe<Task>('tasks', items =>
    [...items].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)), cb
  );
}

export async function addTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<string> {
  const id = uid();
  const items = read<Task>('tasks');
  items.push({ ...data, id, createdAt: now() });
  write('tasks', items);
  return id;
}

export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  const items = read<Task>('tasks').map(t => t.id === id ? { ...t, ...data } : t);
  write('tasks', items);
}

export async function deleteTask(id: string): Promise<void> {
  write('tasks', read<Task>('tasks').filter(t => t.id !== id));
}

// ─── Documents ────────────────────────────────────────────────────────────────

export function subscribeDocs(cb: (docs: VaultDocument[]) => void): () => void {
  return subscribe<VaultDocument>('documents', items =>
    [...items].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)), cb
  );
}

export async function addVaultDoc(data: Omit<VaultDocument, 'id' | 'createdAt'>): Promise<string> {
  const id = uid();
  const items = read<VaultDocument>('documents');
  items.push({ ...data, id, createdAt: now() });
  write('documents', items);
  return id;
}

export async function updateVaultDoc(id: string, data: Partial<VaultDocument>): Promise<void> {
  const items = read<VaultDocument>('documents').map(d => d.id === id ? { ...d, ...data } : d);
  write('documents', items);
}

export async function deleteVaultDoc(id: string): Promise<void> {
  write('documents', read<VaultDocument>('documents').filter(d => d.id !== id));
}

export function subscribePortalDocs(clientId: string, cb: (docs: VaultDocument[]) => void): () => void {
  return subscribe<VaultDocument>('documents', items =>
    [...items]
      .filter(d => d.clientId === clientId && d.approvedForPortal === true)
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)),
    cb
  );
}

export async function getPortalDocs(clientId: string): Promise<VaultDocument[]> {
  return read<VaultDocument>('documents')
    .filter(d => d.clientId === clientId && d.approvedForPortal === true)
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function subscribeMessages(cb: (msgs: Message[]) => void, limitCount = 100): () => void {
  return subscribe<Message>('messages', items =>
    [...items]
      .sort((a, b) => {
        const ta = typeof a.timestamp === 'object' && 'seconds' in a.timestamp ? a.timestamp.seconds : 0;
        const tb = typeof b.timestamp === 'object' && 'seconds' in b.timestamp ? b.timestamp.seconds : 0;
        return tb - ta;
      })
      .slice(0, limitCount),
    cb
  );
}

export async function addMessage(data: Omit<Message, 'id' | 'createdAt'>): Promise<string> {
  const id = uid();
  const items = read<Message>('messages');
  items.push({ ...data, id, createdAt: now() });
  write('messages', items);
  return id;
}

export async function updateMessage(id: string, data: Partial<Message>): Promise<void> {
  const items = read<Message>('messages').map(m => m.id === id ? { ...m, ...data } : m);
  write('messages', items);
}

// ─── Employees ────────────────────────────────────────────────────────────────

export function subscribeEmployees(cb: (employees: Employee[]) => void): () => void {
  return subscribe<Employee>('employees', items =>
    [...items].sort((a, b) => a.name.localeCompare(b.name)), cb
  );
}

export async function getEmployees(): Promise<Employee[]> {
  return [...read<Employee>('employees')].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  return read<Employee>('employees').find(e => e.id === id) ?? null;
}

export async function authenticateEmployee(email: string, password: string): Promise<Employee | null> {
  const all = read<Employee>('employees');
  return all.find(e => e.email.toLowerCase() === email.toLowerCase() && e.password === password) ?? null;
}

/** Authenticate a CA (admin-role employee only). */
export async function authenticateCA(email: string, password: string): Promise<Employee | null> {
  const all = read<Employee>('employees');
  return (
    all.find(
      e =>
        e.role === 'admin' &&
        e.email.toLowerCase() === email.toLowerCase() &&
        e.password === password
    ) ?? null
  );
}

export async function addEmployee(data: Omit<Employee, 'id' | 'createdAt'>): Promise<string> {
  const id = toSlug(data.name) || uid();
  const items = read<Employee>('employees');
  items.push({ ...data, id, createdAt: now() });
  write('employees', items);
  return id;
}

export async function updateEmployee(id: string, data: Partial<Employee>): Promise<void> {
  const items = read<Employee>('employees').map(e => e.id === id ? { ...e, ...data } : e);
  write('employees', items);
}

export async function deleteEmployee(id: string): Promise<void> {
  write('employees', read<Employee>('employees').filter(e => e.id !== id));
}

// ─── Payment Requests ─────────────────────────────────────────────────────────

export function subscribePayments(cb: (payments: PaymentRequest[]) => void): () => void {
  return subscribe<PaymentRequest>('payments', items =>
    [...items].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)), cb
  );
}

export async function addPaymentRequest(data: Omit<PaymentRequest, 'id' | 'createdAt'>): Promise<string> {
  const id = uid();
  const items = read<PaymentRequest>('payments');
  items.push({ ...data, id, createdAt: now() });
  write('payments', items);
  return id;
}

export async function updatePaymentRequest(id: string, data: Partial<PaymentRequest>): Promise<void> {
  const items = read<PaymentRequest>('payments').map(p => p.id === id ? { ...p, ...data } : p);
  write('payments', items);
}

export async function deletePaymentRequest(id: string): Promise<void> {
  write('payments', read<PaymentRequest>('payments').filter(p => p.id !== id));
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const clients  = read<Client>('clients');
  const tasks    = read<Task>('tasks');
  const messages = read<Message>('messages')
    .sort((a, b) => {
      const ta = typeof a.timestamp === 'object' && 'seconds' in a.timestamp ? a.timestamp.seconds : 0;
      const tb = typeof b.timestamp === 'object' && 'seconds' in b.timestamp ? b.timestamp.seconds : 0;
      return tb - ta;
    })
    .slice(0, 50);

  return {
    totalClients:        clients.length,
    activeClients:       clients.filter(c => c.status === 'Active').length,
    pendingTasks:        tasks.filter(t => t.status === 'Pending').length,
    inProgressTasks:     tasks.filter(t => t.status === 'In Progress').length,
    totalMessages:       messages.length,
    unprocessedMessages: messages.filter(m => !m.processed).length,
    recentMessages:      messages.slice(0, 5),
  };
}
