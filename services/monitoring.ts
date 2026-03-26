
import { ref, set, update, push, remove } from 'firebase/database';
import { db } from './firebase';
import { Camera, AccessPoint, PublicDocument, ProcessedWorker, Status, ThirdPartyImport, PaymentImport, ThirdPartyPayment } from '../types';

const getNowFormatted = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const getResponsibleByWarehouse = (warehouse: string, currentResponsible: string | null): string => {
    const normalizedWarehouse = (warehouse || '').trim().toUpperCase();
    
    switch (normalizedWarehouse) {
        case 'GALPÃO G2': return 'ROBSON DIAS BRITO';
        case 'GALPÃO G3': return 'EDNEI RODRIGUES SOARES';
        case 'GALPÃO G5': return 'MOACIR ANDRADE NUNES';
        case 'GALPÃO PAVUNA': 
        case 'GALPÃO MERITI': 
        case 'GALPÃO LSP': 
            return 'MAURO BAPTISTA CERQUEIRA';
        case 'GALPÃO SP': return 'JOSENIAS SANTOS NASCIMENTO';
        case 'GALPÃO 4 ELOS RJ': return 'DANIEL CESAR MACHADO';
        case 'GALPÃO 4 ELOS ES': return 'SILVIA SANTOS';
        default: return currentResponsible || 'N/A';
    }
};

class MonitoringService {
  // --- Cameras ---
  async addCamera(camera: Camera, currentCameras: Camera[]) {
    const newCameras = [...currentCameras, camera];
    await set(ref(db, 'monitoramento/cameras'), newCameras);
  }

  async updateCamera(camera: Camera, currentCameras: Camera[]) {
    const newCameras = currentCameras.map(c => c.uuid === camera.uuid ? camera : c);
    await set(ref(db, 'monitoramento/cameras'), newCameras);
  }

  async deleteCamera(uuid: string, currentCameras: Camera[]) {
    const newCameras = currentCameras.filter(c => c.uuid !== uuid);
    await set(ref(db, 'monitoramento/cameras'), newCameras);
  }

  async toggleCameraStatus(uuid: string, currentCameras: Camera[]) {
    const target = currentCameras.find(c => c.uuid === uuid);
    if (!target) return null;
    
    const newStatus = target.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    const lastLog = getNowFormatted();
    const newCameras = currentCameras.map(c => 
        c.uuid === uuid ? { ...c, status: newStatus, lastLog } : c
    );
    await set(ref(db, 'monitoramento/cameras'), newCameras);
    return { name: target.name, newStatus };
  }

  async updateCameraTicket(uuid: string, ticket: string, currentCameras: Camera[]) {
    const newCameras = currentCameras.map(c => 
        c.uuid === uuid ? { ...c, ticket } : c
    );
    await set(ref(db, 'monitoramento/cameras'), newCameras);
  }

  async updateCameraObservation(uuid: string, observation: string, currentCameras: Camera[]) {
    const newCameras = currentCameras.map(c => 
        c.uuid === uuid ? { ...c, observation } : c
    );
    await set(ref(db, 'monitoramento/cameras'), newCameras);
  }

  async updateCameraRecordingTime(uuid: string, recordingTime: string, currentCameras: Camera[]) {
    const newCameras = currentCameras.map(c => 
        c.uuid === uuid ? { ...c, recordingTime } : c
    );
    await set(ref(db, 'monitoramento/cameras'), newCameras);
  }

  async resolveCameraIssue(uuid: string, currentCameras: Camera[]) {
    const target = currentCameras.find(c => c.uuid === uuid);
    if (!target) return;

    const lastLog = getNowFormatted();
    const newCameras = currentCameras.map(c => 
        c.uuid === uuid ? { ...c, status: 'ONLINE', ticket: '', observation: '', lastLog } : c
    );
    await set(ref(db, 'monitoramento/cameras'), newCameras);
  }

  async setWarehouseStatus(warehouse: string, status: Status, currentCameras: Camera[]) {
    const lastLog = getNowFormatted();
    const newCameras = currentCameras.map(c => 
        c.warehouse === warehouse ? { ...c, status: status, lastLog } : c
    );
    await set(ref(db, 'monitoramento/cameras'), newCameras);
  }

  // --- Access Points ---
  async addAccessPoint(ap: AccessPoint, currentAccess: AccessPoint[]) {
    const newAccess = [...currentAccess, ap];
    await set(ref(db, 'monitoramento/access_points'), newAccess);
  }

  async updateAccessPoint(ap: AccessPoint, currentAccess: AccessPoint[]) {
    const newAccess = currentAccess.map(a => a.uuid === ap.uuid ? ap : a);
    await set(ref(db, 'monitoramento/access_points'), newAccess);
  }

  async deleteAccessPoint(uuid: string, currentAccess: AccessPoint[]) {
    const newAccess = currentAccess.filter(a => a.uuid !== uuid);
    await set(ref(db, 'monitoramento/access_points'), newAccess);
  }

  async toggleAccessStatus(uuid: string, currentAccess: AccessPoint[]) {
    const target = currentAccess.find(a => a.uuid === uuid);
    if (!target) return null;
    
    const newStatus = target.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    const lastLog = getNowFormatted();
    const newAccess = currentAccess.map(ap => 
        ap.uuid === uuid ? { ...ap, status: newStatus, lastLog } : ap
    );
    await set(ref(db, 'monitoramento/access_points'), newAccess);
    return { name: target.name, newStatus };
  }

  async updateAccessPointTicket(uuid: string, ticket: string, currentAccess: AccessPoint[]) {
    const newAccess = currentAccess.map(a => 
        a.uuid === uuid ? { ...a, ticket } : a
    );
    await set(ref(db, 'monitoramento/access_points'), newAccess);
  }

  async updateAccessPointObservation(uuid: string, observation: string, currentAccess: AccessPoint[]) {
    const newAccess = currentAccess.map(a => 
        a.uuid === uuid ? { ...a, observation } : a
    );
    await set(ref(db, 'monitoramento/access_points'), newAccess);
  }

  async resolveAccessPointIssue(uuid: string, currentAccess: AccessPoint[]) {
    const target = currentAccess.find(a => a.uuid === uuid);
    if (!target) return;

    const lastLog = getNowFormatted();
    const newAccess = currentAccess.map(a => 
        a.uuid === uuid ? { ...a, status: 'ONLINE', ticket: '', observation: '', lastLog } : a
    );
    await set(ref(db, 'monitoramento/access_points'), newAccess);
  }

  // --- Documents ---
  async addDocument(doc: PublicDocument, currentDocs: PublicDocument[]) {
    const newDocs = [...currentDocs, doc];
    await set(ref(db, 'monitoramento/documents'), newDocs);
  }

  async deleteDocument(uuid: string, currentDocs: PublicDocument[]) {
    const newDocs = currentDocs.filter(d => d.uuid !== uuid);
    await set(ref(db, 'monitoramento/documents'), newDocs);
  }

  // --- Reset Operations ---
  async resetCameras() {
    await set(ref(db, 'monitoramento/cameras'), []);
  }

  async resetAccessPoints() {
    await set(ref(db, 'monitoramento/access_points'), []);
  }

  async resetThirdParty() {
    await set(ref(db, 'monitoramento/third_party_imports'), {});
  }

  async resetPayments() {
    await set(ref(db, 'monitoramento/payment_imports'), {});
  }

  // --- Bulk Operations (Import) ---
  async importData(cameras: Camera[], accessPoints: AccessPoint[]) {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    await set(ref(db, 'monitoramento/cameras'), cameras);
    await set(ref(db, 'monitoramento/access_points'), accessPoints);
    await update(ref(db, 'monitoramento/metadata'), { lastSync: formattedTime });
  }

  async addThirdPartyImport(workers: ProcessedWorker[], fileName: string) {
      const importRef = push(ref(db, 'monitoramento/third_party_imports'));
      const newImport: ThirdPartyImport = {
          id: importRef.key || Date.now().toString(),
          fileName: fileName,
          importedAt: new Date().toISOString(),
          count: workers.length,
          workers: workers
      };
      await set(importRef, newImport);
  }

  async addPaymentImport(payments: ThirdPartyPayment[], fileName: string) {
    const importRef = push(ref(db, 'monitoramento/payment_imports'));
    const newImport: PaymentImport = {
        id: importRef.key || Date.now().toString(),
        fileName: fileName,
        importedAt: new Date().toISOString(),
        count: payments.length,
        payments: payments
    };
    await set(importRef, newImport);
  }

  async deleteThirdPartyImport(importId: string) {
      await remove(ref(db, `monitoramento/third_party_imports/${importId}`));
  }

  async deletePaymentImport(importId: string) {
      await remove(ref(db, `monitoramento/payment_imports/${importId}`));
  }

  async fullReset() {
    await set(ref(db, 'monitoramento'), {
        cameras: [],
        access_points: [],
        documents: [],
        third_party_imports: {},
        payment_imports: {},
        metadata: { lastSync: '-' },
        organizer: { notes: [], meetings: [], events: [] }
    });
  }
}

export const monitoringService = new MonitoringService();
