
export type Status = 'ONLINE' | 'OFFLINE';
export type ChannelType = 'video' | 'alarm';

export type UserRole = 'admin' | 'viewer' | 'manager';
export type UserStatus = 'pending' | 'active' | 'blocked';

export interface User {
  uid: string; 
  email: string;
  name: string;
  role: UserRole;
  status?: UserStatus;
  allowedWarehouses?: string[]; 
  photoURL?: string;
  bannerURL?: string;
  jobTitle?: string;
  bio?: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId?: string; 
  senderName?: string;
  message: string;
  type: 'message' | 'alert' | 'info' | 'system' | 'success';
  timestamp: string;
  read: boolean;
  linkTo?: string; 
}

export interface Camera {
  uuid: string;        
  id: string;          
  name: string;        
  location: string;    
  module: string;      
  warehouse: string;   
  responsible: string; 
  status: Status;      
  ticket?: string;     
  channelType: ChannelType; // Novo campo para distinção
}

export interface AccessPoint {
  uuid: string;        
  id: string;
  name: string;
  type: string;
  location: string;
  warehouse: string;   
  status: Status;
  lastLog: string;
  latency?: string;    
}

export interface PublicDocument {
  uuid: string;
  name: string;        
  organ: string;       
  expirationDate: string; 
  status?: 'VALID' | 'WARNING' | 'EXPIRED'; 
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
  createdAt: string; 
}

export interface Meeting {
  id: string;
  title: string;
  date: string; 
  time: string; 
  participants: string;
  observations: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; 
  time: string; 
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
