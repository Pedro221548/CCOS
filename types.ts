
export type Status = 'ONLINE' | 'OFFLINE';

export type UserRole = 'admin' | 'viewer' | 'manager';
export type UserStatus = 'pending' | 'active' | 'blocked';

export interface User {
  uid: string; 
  email: string;
  name: string;
  role: UserRole;
  status?: UserStatus;
  allowedWarehouses?: string[]; // Array of Warehouse IDs allowed for Managers
  // Profile fields
  photoURL?: string;
  bannerURL?: string;
  jobTitle?: string;
  bio?: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId?: string; // Para mensagens
  senderName?: string;
  message: string;
  type: 'message' | 'alert' | 'info' | 'system' | 'success';
  timestamp: string;
  read: boolean;
  linkTo?: string; // Tab to open (e.g., 'chat', 'tasks')
}

export interface Camera {
  uuid: string;        // Unique internal ID
  id: string;          // ID_Camera
  name: string;        // Nome_Camera
  location: string;    // Localização
  module: string;      // Módulo
  warehouse: string;   // Galpão
  responsible: string; // Responsável
  status: Status;      // ONLINE / OFFLINE
  ticket?: string;     // Número do chamado/ticket
}

export interface Alarm {
  uuid: string;
  id: string;
  name: string;
  type: 'Entrada' | 'Saída' | 'Geral';
  location: string;
  warehouse: string;
  status: Status;
  responsible: string;
}

export interface AccessPoint {
  uuid: string;        // Unique internal ID
  id: string;
  name: string;
  type: string;
  location: string;
  warehouse: string;   // Galpão
  status: Status;
  lastLog: string;
  latency?: string;    // Ping result (e.g., '12ms' or 'timeout')
}

export interface PublicDocument {
  uuid: string;
  name: string;        // Ex: AVCB, Alvará
  organ: string;       // Ex: Corpo de Bombeiros, Prefeitura
  expirationDate: string; // YYYY-MM-DD
  status?: 'VALID' | 'WARNING' | 'EXPIRED'; // Calculated on runtime
}

export interface Note {
  id: string;
  content: string;
  completed: boolean;
  createdAt: string;
}

export interface ShiftNote {
  id: string;
  author: string;
  authorId: string;
  content: string;
  createdAt: string; // ISO string
}

export interface Meeting {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  participants: string;
  observations: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'location';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  fileUrl?: string;
  type: MessageType;
  timestamp: string;
  replyTo?: { id: string; text: string; senderName: string };
  reactions?: { [emoji: string]: string[] };
  edited?: boolean;
  pinned?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  important?: boolean;
}

export interface ProcessedWorker {
    id: string;
    name: string;
    company: string;
    unit: string;
    time: string;
    date: string;
    accessPoint: string;
    eventType: string;
}

export interface ThirdPartyImport {
    id: string;
    fileName: string;
    importedAt: string;
    count: number;
    workers: ProcessedWorker[];
}

export interface EmailPendency {
    id: string;
    title: string;
    link: string;
    status: 'pendente' | 'resolvido';
    createdBy: string;
    timestamp: string;
    resolvedBy?: string;
    resolvedAt?: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface TaskAttachment {
    name: string;
    url: string;
    type: 'image' | 'document';
}

export interface Task {
    id: string;
    title: string;
    description: string;
    createdBy: string;
    assignedToId: string;
    assignedToName: string;
    createdAt: string;
    dueDate: string;
    status: TaskStatus;
    attachments?: TaskAttachment[];
    startedAt?: string;
    completedAt?: string;
    completionNote?: string;
}

export interface AppData {
  cameras: Camera[];
  alarms: Alarm[];
  accessPoints: AccessPoint[];
  documents: PublicDocument[];
  notes: Note[];
  shiftNotes?: ShiftNote[];
  meetings: Meeting[];
  events: CalendarEvent[];
  thirdPartyImports?: ThirdPartyImport[];
  lastSync: string;
}

declare global {
  interface Window {
    XLSX: any;
  }
}
