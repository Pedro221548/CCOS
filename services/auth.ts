
import { auth, db, firebaseConfig } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  getAuth,
  createUserWithEmailAndPassword,
  updatePassword
} from 'firebase/auth';
import { ref, get, set, remove, update, onValue, Unsubscribe, query, orderByChild, equalTo } from 'firebase/database';
import { initializeApp, deleteApp } from 'firebase/app';
import { User, UserRole } from '../types';

class AuthService {
  // Observe auth state changes AND Realtime Database changes
  subscribeToAuthChanges(callback: (user: User | null) => void): Unsubscribe {
    let dbUnsubscribe: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // 1. Clean up previous DB listener if user changed/logged out
      if (dbUnsubscribe) {
        dbUnsubscribe();
        dbUnsubscribe = null;
      }

      if (firebaseUser) {
        try {
          // 2. Setup Realtime Listener for the specific user profile
          const userRef = ref(db, `users/${firebaseUser.uid}`);
          
          const unsubscribe = onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
              // USUÁRIO EXISTE NO BANCO: Usa os dados oficiais e atualiza em tempo real
              const userData = snapshot.val();
              callback({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: userData.name || 'Usuário',
                role: userData.role || 'viewer',
                status: userData.status || 'active',
                allowedWarehouses: userData.allowedWarehouses || [], // CORREÇÃO: Carregar permissões
                photoURL: userData.photoURL || '',
                bannerURL: userData.bannerURL || '',
                jobTitle: userData.jobTitle || '',
                bio: userData.bio || ''
              });
            } else {
              // USUÁRIO NÃO EXISTE NO BANCO (Fallback / Primeira criação manual)
              const isOwner = firebaseUser.email === 'admin@ccos.com'; 
              
              const memoryUser: User = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  name: firebaseUser.displayName || 'Usuário (Visitante)',
                  role: isOwner ? 'admin' : 'viewer',
                  status: 'active',
                  allowedWarehouses: []
              };
              
              callback(memoryUser);
            }
          });

          dbUnsubscribe = unsubscribe;

        } catch (error) {
          console.error("Error fetching user profile:", error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });

    // Return a master unsubscribe function to clean up both listeners
    return () => {
        authUnsubscribe();
        if (dbUnsubscribe) dbUnsubscribe();
    };
  }

  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async logout() {
    await signOut(auth);
  }

  // --- Profile Management ---

  async updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
    const userRef = ref(db, `users/${uid}`);
    // Use update to merge fields, ensures we don't overwrite existing role/email if not passed
    await update(userRef, data);
  }

  async updateUserPassword(newPassword: string): Promise<void> {
    if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
    } else {
        throw new Error("Usuário não autenticado.");
    }
  }

  // --- Admin Methods (Protected by Database Rules) ---

  async addUser(newUser: { email: string; password: string; name: string; role: UserRole; allowedWarehouses?: string[] }): Promise<void> {
    // Cria uma instância secundária do App para criar o Auth User
    // sem deslogar o Admin atual.
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
    const secondaryAuth = getAuth(secondaryApp);

    try {
      // 1. Cria a autenticação (Firebase Auth)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.password);
      const uid = userCredential.user.uid;

      // 2. Registra o papel e dados no Realtime Database
      await set(ref(db, `users/${uid}`), {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: 'active',
        allowedWarehouses: newUser.allowedWarehouses || [],
        createdAt: new Date().toISOString(),
        photoURL: '',
        jobTitle: 'Membro da Equipe',
        bio: ''
      });

      // Cleanup da sessão secundária
      await signOut(secondaryAuth);
    } catch (error) {
      throw error;
    } finally {
      await deleteApp(secondaryApp);
    }
  }

  async removeUser(uid: string): Promise<void> {
    // 1. Remove User Profile
    await remove(ref(db, `users/${uid}`));

    // 2. Remove Private Messages involving this user (Cascade Delete)
    try {
        const privateMsgsRef = ref(db, 'private_messages');
        const snapshot = await get(privateMsgsRef);
        if (snapshot.exists()) {
            const updates: any = {};
            snapshot.forEach((child) => {
                if (child.key && child.key.includes(uid)) {
                    updates[child.key] = null;
                }
            });
            if (Object.keys(updates).length > 0) {
                await update(privateMsgsRef, updates);
            }
        }
    } catch (e) {
        console.error("Error cleaning private messages:", e);
    }

    // 3. Remove Public Messages sent by this user
    try {
        const publicMsgsQuery = query(ref(db, 'messages'), orderByChild('senderId'), equalTo(uid));
        const pubSnapshot = await get(publicMsgsQuery);
        if (pubSnapshot.exists()) {
            const updates: any = {};
            pubSnapshot.forEach((child) => {
                updates[child.key as string] = null;
            });
            await update(ref(db, 'messages'), updates);
        }
    } catch (e) {
        console.error("Error cleaning public messages:", e);
    }

    // 4. Remove Tasks Assigned to this user
    try {
        const tasksQuery = query(ref(db, 'tasks'), orderByChild('assignedToId'), equalTo(uid));
        const taskSnapshot = await get(tasksQuery);
        if (taskSnapshot.exists()) {
            const updates: any = {};
            taskSnapshot.forEach((child) => {
                updates[child.key as string] = null;
            });
            await update(ref(db, 'tasks'), updates);
        }
    } catch (e) {
        console.error("Error cleaning tasks:", e);
    }
  }

  async listUsers(): Promise<User[]> {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map(key => ({
        uid: key,
        ...data[key],
        name: data[key].name || 'Sem Nome', 
        email: data[key].email || '',
        allowedWarehouses: data[key].allowedWarehouses || []
      }));
    }
    return [];
  }
}

export const authService = new AuthService();
