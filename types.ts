
export type Status = 'ONLINE' | 'OFFLINE';
export type ChannelType = 'video' | 'alarm';

export type UserRole = 'admin' | 'viewer' | 'manager' | 'provider' | 'hr';
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
  companyName?: string; // Para o perfil de Prestador
  permissions?: string[]; 
}

export interface TeamWorker {
  id: string;
  name: string;
  cpf: string;
  companyId: string;
  companyName: string;
  photoUrl: string;
  docFrontUrl?: string; 
  docBackUrl?: string;  
  documentUrl?: string; 
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AttendanceRoster {
  id: string;
  date: string;
  workerId: string;
  workerName: string;
  companyName: string;
  unit: string;
  checkedIn?: boolean;
  confirmedAt?: string;
  presence?: boolean;
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
  observation?: string; 
  channelType: ChannelType;
  lastLog?: string; 
  recordingTime?: string;
  warehouseManuallyEdited?: boolean;
}

export interface AccessPoint {
  uuid: string;        
  id: string;
  name: string;
  type: string;
  location: string;
  warehouse: string;   
  responsible: string; 
  status: Status;
  lastLog: string;
  latency?: string;    
  ticket?: string;     
  observation?: string; 
  warehouseManuallyEdited?: boolean;
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

export interface ThirdPartyPayment {
    id: string;
    workerName: string;
    company: string;
    unit: string;
    date: string;
    value: number;
    reference: string;
    category?: string;
}

export interface ThirdPartyRequest {
    id: string;
    supplierId: string;
    requestType: 'quantity' | 'person';
    quantity?: number;
    names?: string[];
    startDate: string;
    endDate: string;
    warehouse: string;
    requesterName: string;
    contactPhone: string;
    status: 'pending' | 'evaluated' | 'confirmed' | 'rejected' | 'completed';
    cost?: number;
    evaluatedAt?: string;
    confirmedAt?: string;
    confirmedByProviderUser?: string;
    createdAt: string;
}

export interface PaymentImport {
    id: string;
    fileName: string;
    importedAt: string;
    count: number;
    payments: ThirdPartyPayment[];
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
  paymentImports?: PaymentImport[];
  occurrenceImports?: OccurrenceImport[];
  requestImports?: OccurrenceImport[];
  attendanceRoster: AttendanceRoster[];
  lastSync: string;
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

export interface ProcessedWorker {
    id: string;
    name: string;
    company: string;
    unit: string;
    time: string;
    date: string; 
    accessPoint: string;
    eventType: string; 
    personGroup?: string;
}

export interface ThirdPartyImport {
    id: string;
    fileName: string;
    importedAt: string;
    count: number;
    workers: ProcessedWorker[];
    startDate?: string;
    endDate?: string;
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

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'audio' | 'location';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  type: MessageType;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  fileUrl?: string;
  pinned?: boolean;
  edited?: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  reactions?: {
    [emoji: string]: number;
  };
}

export interface AppFeedback {
  id: string;
  userId: string;
  userName: string;
  type: 'bug' | 'suggestion' | 'praise';
  content: string;
  timestamp: string;
  status: 'pending' | 'completed';
  adminReply?: string;
  repliedAt?: string;
}

export interface Occurrence {
    id: string;
    empresa: string;
    cliente: string;
    tipo: string;
    data: string;
    horario?: string;
    descricao: string;
    desconformidade?: string;
    iniciada?: string;
    concluida?: string;
    responsaveis?: string;
    status: string;
    
    // New fields from CRM/Task export
    tarefa?: string;
    ativo?: string;
    prazoFinal?: string;
    criadoPor?: string;
    participantes?: string;
    observadores?: string;
    tipoOcorrencia?: string;
    criadoEm?: string;
    modificadaEm?: string;
    fechadoEm?: string;
    duracaoPrevista?: string;
    tempoGasto?: string;
    marcadores?: string;
    lead?: string;
    contato?: string;
    negocio?: string;
    idTarefaPrincipal?: string;
    nomeTarefaPrincipal?: string;
    fluxo?: string;
    armazem?: string;
}

export interface OccurrenceImport {
    id: string;
    importedAt: string;
    importedBy: string;
    occurrences: Occurrence[];
}

declare global {
  interface Window {
    XLSX: any;
  }
}
