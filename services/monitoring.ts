
import { ref, set, update, push, remove } from 'firebase/database';
import { db } from './firebase';
import { Camera, AccessPoint, PublicDocument, ProcessedWorker, Status, ThirdPartyImport } from '../types';

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
    const newCameras = currentCameras.map(c => 
        c.uuid === uuid ? { ...c, status: newStatus } : c
    );
    await set(ref(db, 'monitoramento/cameras'), newCameras);
    return { name: target.name, newStatus };
  }

  // Atualiza o ticket de uma câmera específica
  async updateCameraTicket(uuid: string, ticket: string, currentCameras: Camera[]) {
    const newCameras = currentCameras.map(c => 
        c.uuid === uuid ? { ...c, ticket } : c
    );
    await set(ref(db, 'monitoramento/cameras'), newCameras);
  }

  // Resolve o problema: define como ONLINE e limpa o ticket
  async resolveCameraIssue(uuid: string, currentCameras: Camera[]) {
    const target = currentCameras.find(c => c.uuid === uuid);
    if (!target) return;

    const newCameras = currentCameras.map(c => 
        c.uuid === uuid ? { ...c, status: 'ONLINE', ticket: '' } : c
    );
    await set(ref(db, 'monitoramento/cameras'), newCameras);
  }

  // Bulk update for Warehouse
  async setWarehouseStatus(warehouse: string, status: Status, currentCameras: Camera[]) {
    const newCameras = currentCameras.map(c => 
        c.warehouse === warehouse ? { ...c, status: status } : c
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
    const newAccess = currentAccess.map(ap => 
        ap.uuid === uuid ? { ...ap, status: newStatus } : ap
    );
    await set(ref(db, 'monitoramento/access_points'), newAccess);
    return { name: target.name, newStatus };
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

  // --- Bulk Operations (Import) ---
  async importData(cameras: Camera[], accessPoints: AccessPoint[]) {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    await set(ref(db, 'monitoramento/cameras'), cameras);
    await set(ref(db, 'monitoramento/access_points'), accessPoints);
    await update(ref(db, 'monitoramento/metadata'), { lastSync: formattedTime });
  }

  // NOVO: Salva como um lote para manter histórico
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

  // NOVO: Exclui um lote específico
  async deleteThirdPartyImport(importId: string) {
      await remove(ref(db, `monitoramento/third_party_imports/${importId}`));
  }

  async fullReset() {
    await set(ref(db, 'monitoramento'), {
        cameras: [],
        accessPoints: [],
        documents: [],
        third_party_imports: {}, // Limpa o histórico
        metadata: { lastSync: '-' },
        organizer: { notes: [], meetings: [], events: [] }
    });
  }
}

export const monitoringService = new MonitoringService();
