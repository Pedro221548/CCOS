
import { ref, set, update, push, remove } from 'firebase/database';
import { db } from './firebase';
import { Camera, AccessPoint, PublicDocument, ProcessedWorker, Status, ThirdPartyImport, Alarm } from '../types';

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

  async toggleCameraStatus(uuid: string, currentCameras: Camera[]) {
    const target = currentCameras.find(c => c.uuid === uuid);
    if (!target) return null;
    const newStatus = target.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    const newCameras = currentCameras.map(c => c.uuid === uuid ? { ...c, status: newStatus } : c);
    await set(ref(db, 'monitoramento/cameras'), newCameras);
    return { name: target.name, newStatus };
  }

  async setWarehouseStatus(warehouse: string, status: Status, currentCameras: Camera[]) {
    const newCameras = currentCameras.map(c => c.warehouse === warehouse ? { ...c, status: status } : c);
    await set(ref(db, 'monitoramento/cameras'), newCameras);
  }

  // --- Bulk Operations (Import) ---
  async importData(cameras: Camera[], accessPoints: AccessPoint[], alarms: Alarm[]) {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    await set(ref(db, 'monitoramento/cameras'), cameras);
    await set(ref(db, 'monitoramento/access_points'), accessPoints);
    await set(ref(db, 'monitoramento/alarms'), alarms); // Salva alarmes em nó próprio
    await update(ref(db, 'monitoramento/metadata'), { lastSync: formattedTime });
  }

  async fullReset() {
    await set(ref(db, 'monitoramento'), {
        cameras: [],
        alarms: [],
        access_points: [],
        documents: [],
        third_party_imports: {},
        metadata: { lastSync: '-' }
    });
  }
}

export const monitoringService = new MonitoringService();
