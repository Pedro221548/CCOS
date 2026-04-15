
import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import { AppData, ProcessedWorker, User, ThirdPartyImport, ShiftNote, PaymentImport, ThirdPartyPayment } from '../types';

const INITIAL_DATA: AppData = {
  cameras: [],
  accessPoints: [],
  documents: [],
  notes: [],
  shiftNotes: [],
  meetings: [],
  events: [],
  thirdPartyImports: [],
  paymentImports: [],
  occurrenceImports: [],
  requestImports: [],
  attendanceRoster: [],
  lastSync: '-'
};

export const useAppData = (user: User | null) => {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [thirdPartyWorkers, setThirdPartyWorkers] = useState<ProcessedWorker[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<ThirdPartyPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }

    // Refs
    const camerasRef = ref(db, 'monitoramento/cameras');
    const accessRef = ref(db, 'monitoramento/access_points');
    const documentsRef = ref(db, 'monitoramento/documents');
    const rosterRef = ref(db, 'monitoramento/attendance_roster');
    const importsRef = ref(db, 'monitoramento/third_party_imports');
    const requestsRef = ref(db, 'monitoramento/request_imports');
    const paymentsRef = ref(db, 'monitoramento/payment_imports');
    const occurrencesRef = ref(db, 'monitoramento/occurrence_imports');
    const metadataRef = ref(db, 'monitoramento/metadata');
    const notesRef = ref(db, `monitoramento/organizer/notes/${user.uid}`);
    const shiftNotesRef = ref(db, 'monitoramento/organizer/shift_notes');

    // Listeners
    const unsubCameras = onValue(camerasRef, (snap) => {
        setData(prev => ({ ...prev, cameras: snap.val() || [] }));
        setIsLoading(false);
    });
    
    const unsubRequests = onValue(requestsRef, (snap) => {
        const val = snap.val();
        if (val) {
            const imports = Object.keys(val).map(key => ({
                id: key,
                ...val[key]
            })).sort((a: any, b: any) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
            setData(prev => ({ ...prev, requestImports: imports }));
        } else {
            setData(prev => ({ ...prev, requestImports: [] }));
        }
    });

    const unsubAccess = onValue(accessRef, (snap) => {
        setData(prev => ({ ...prev, accessPoints: snap.val() || [] }));
    });

    const unsubDocs = onValue(documentsRef, (snap) => {
        setData(prev => ({ ...prev, documents: snap.val() || [] }));
    });

    const unsubRoster = onValue(rosterRef, (snap) => {
        const val = snap.val();
        if (val) {
            const list = Object.keys(val).map(key => ({ id: key, ...val[key] }));
            setData(prev => ({ ...prev, attendanceRoster: list }));
        } else {
            setData(prev => ({ ...prev, attendanceRoster: [] }));
        }
    });
    
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

    const unsubPayments = onValue(paymentsRef, (snap) => {
        const val = snap.val();
        if (val) {
            const imports: PaymentImport[] = Object.keys(val).map(key => ({
                id: key,
                ...val[key]
            })).sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());

            setData(prev => ({ ...prev, paymentImports: imports }));

            const allPayments: ThirdPartyPayment[] = [];
            imports.forEach(imp => {
                if (imp.payments) {
                    allPayments.push(...imp.payments);
                }
            });
            setPaymentRecords(allPayments);
        } else {
            setData(prev => ({ ...prev, paymentImports: [] }));
            setPaymentRecords([]);
        }
    });

    const unsubOccurrences = onValue(occurrencesRef, (snap) => {
        const val = snap.val();
        if (val) {
            const imports = Object.keys(val).map(key => ({
                id: key,
                ...val[key]
            })).sort((a: any, b: any) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
            setData(prev => ({ ...prev, occurrenceImports: imports }));
        } else {
            setData(prev => ({ ...prev, occurrenceImports: [] }));
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
        unsubAccess();
        unsubDocs();
        unsubRoster();
        unsubImports();
        unsubPayments();
        unsubOccurrences();
        unsubMetadata();
        unsubNotes();
        unsubShiftNotes();
    };
  }, [user]);

  return { data, thirdPartyWorkers, paymentRecords, isLoading };
};
