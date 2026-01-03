
import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import { AppData, ProcessedWorker, User, ThirdPartyImport, ShiftNote } from '../types';

// Fix: Added missing 'alarms' property to satisfy the AppData interface
const INITIAL_DATA: AppData = {
  cameras: [],
  alarms: [],
  accessPoints: [],
  documents: [],
  notes: [],
  shiftNotes: [],
  meetings: [],
  events: [],
  thirdPartyImports: [],
  lastSync: '-'
};

export const useAppData = (user: User | null) => {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [thirdPartyWorkers, setThirdPartyWorkers] = useState<ProcessedWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }

    // Refs
    const camerasRef = ref(db, 'monitoramento/cameras');
    // Fix: Added reference for alarms node in the database
    const alarmsRef = ref(db, 'monitoramento/alarms');
    const accessRef = ref(db, 'monitoramento/access_points');
    const documentsRef = ref(db, 'monitoramento/documents');
    const importsRef = ref(db, 'monitoramento/third_party_imports');
    const metadataRef = ref(db, 'monitoramento/metadata');
    const notesRef = ref(db, 'monitoramento/organizer/notes');
    const shiftNotesRef = ref(db, 'monitoramento/organizer/shift_notes');

    // Listeners
    const unsubCameras = onValue(camerasRef, (snap) => {
        setData(prev => ({ ...prev, cameras: snap.val() || [] }));
        setIsLoading(false);
    });

    // Fix: Added listener to sync alarms from Firebase Realtime Database
    const unsubAlarms = onValue(alarmsRef, (snap) => {
        setData(prev => ({ ...prev, alarms: snap.val() || [] }));
    });

    const unsubAccess = onValue(accessRef, (snap) => {
        setData(prev => ({ ...prev, accessPoints: snap.val() || [] }));
    });

    const unsubDocs = onValue(documentsRef, (snap) => {
        setData(prev => ({ ...prev, documents: snap.val() || [] }));
    });
    
    // Ouvinte de importações (Histórico)
    const unsubImports = onValue(importsRef, (snap) => {
        const val = snap.val();
        if (val) {
            const imports: ThirdPartyImport[] = Object.keys(val).map(key => ({
                id: key,
                ...val[key]
            })).sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());

            setData(prev => ({ ...prev, thirdPartyImports: imports }));

            const allWorkers: ProcessedWorker[] = [];
            imports.forEach(imp => {
                if (imp.workers) {
                    allWorkers.push(...imp.workers);
                }
            });
            setThirdPartyWorkers(allWorkers);
        } else {
            setData(prev => ({ ...prev, thirdPartyImports: [] }));
            setThirdPartyWorkers([]);
        }
    });

    const unsubMetadata = onValue(metadataRef, (snap) => {
        const meta = snap.val();
        if (meta && meta.lastSync) {
            setData(prev => ({ ...prev, lastSync: meta.lastSync }));
        }
    });

    const unsubNotes = onValue(notesRef, (snap) => setData(prev => ({ ...prev, notes: snap.val() || [] })));
    const unsubShiftNotes = onValue(shiftNotesRef, (snap) => setData(prev => ({ ...prev, shiftNotes: snap.val() || [] })));

    return () => {
        unsubCameras();
        // Fix: Added cleanup for the alarms listener
        unsubAlarms();
        unsubAccess();
        unsubDocs();
        unsubImports();
        unsubMetadata();
        unsubNotes();
        unsubShiftNotes();
    };
  }, [user]);

  return { data, thirdPartyWorkers, isLoading };
};
