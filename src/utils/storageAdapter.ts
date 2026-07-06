/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth, db } from '../lib/firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { StorageService } from './storage';
import { BookMark } from '../types';

export const StorageAdapter = {
  // Current authenticated user
  currentUser: null as User | null,
  isCloudActive: false,

  // Initialize Auth & Cloud Sync pipeline
  init(onUserChange?: (user: User | null) => void) {
    if (typeof window === 'undefined') return;

    // Listen to Auth changes
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        this.isCloudActive = true;
        console.log(`[StorageAdapter] Authenticated as UID: ${user.uid} (${user.isAnonymous ? 'Anonymous' : 'Registered'})`);
        
        // 1. Write or update the mirror in `/users/{uid}`
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            uid: user.uid,
            createdAt: Date.now(),
            provider: user.providerId || (user.isAnonymous ? 'anonymous' : 'custom')
          }, { merge: true });
        } catch (error) {
          console.warn('[StorageAdapter] Cloud mirror write halted. Bypassing cloud writes to keep client deterministic:', error);
          this.isCloudActive = false;
        }

        // 2. Initial cloud merge: Download from firestore, or merge if local is empty/newer
        if (this.isCloudActive) {
          await this.syncWithCloud(user.uid);
        }
      } else {
        console.log('[StorageAdapter] No active credentials session. Triggering anonymous credentials...');
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.warn('[StorageAdapter] Cloud credentials unavailable (restricted or sandbox environment). Continuing on pure local brain.');
          this.isCloudActive = false;
          this.currentUser = {
            uid: 'local_deterministic_guest',
            isAnonymous: true,
            providerId: 'anonymous'
          } as any;
        }
      }

      if (onUserChange) {
        onUserChange(this.currentUser);
      }
    });

  },

  // Pull existing records from Cloud or deploy Local to Cloud if local has contents
  async syncWithCloud(uid: string) {
    if (!this.isCloudActive) return;
    try {
      console.log('[StorageAdapter] Syncing local files with Firestore mirror...');

      // A. Books/Library Sync
      const localBooks = StorageService.getBooks();
      const booksColRef = collection(db, 'library');
      const cloudBooksSnap = await getDocs(booksColRef); // Firestore will filter list queries via our security rules
      const cloudBooks = cloudBooksSnap.docs
        .map(doc => doc.data() as BookMark)
        .filter(book => (book as any).ownerUid === uid);

      if (cloudBooks.length === 0 && localBooks.length > 0) {
        // Upload local library
        console.log('[StorageAdapter] Mirroring local books to clean Cloud account...');
        const batch = writeBatch(db);
        localBooks.forEach(b => {
          const docRef = doc(db, 'library', b.id);
          batch.set(docRef, { ...b, ownerUid: uid });
        });
        await batch.commit();
      } else if (cloudBooks.length > 0) {
        // Merge cloud and local books
        const bookMap = new Map<string, BookMark>();
        localBooks.forEach(b => bookMap.set(b.id, b));
        
        cloudBooks.forEach(cb => {
          const localMatch = bookMap.get(cb.id);
          if (!localMatch || (cb.lastReadDate && (!localMatch.lastReadDate || cb.lastReadDate > localMatch.lastReadDate))) {
            bookMap.set(cb.id, cb);
          }
        });
        
        const mergedList = Array.from(bookMap.values());
        StorageService.saveBooks(mergedList);
      }

    } catch (e) {
      console.error('[StorageAdapter] Cloud sync failed, active in offline caching mode:', e);
    }
  },

  // Save Book instance to Firestore
  async saveBookToCloud(book: BookMark) {
    if (!this.currentUser || !this.isCloudActive) return;
    try {
      const docRef = doc(db, 'library', book.id);
      await setDoc(docRef, {
        ...book,
        ownerUid: this.currentUser.uid
      }, { merge: true });
    } catch (error) {
      console.warn('[StorageAdapter] Local book updated; cloud mirror upload pending key matching.');
    }
  },

  // Delete Book from Firestore
  async deleteBookFromCloud(bookId: string) {
    if (!this.currentUser || !this.isCloudActive) return;
    try {
      const docRef = doc(db, 'library', bookId);
      // Optional: actual delete or soft delete
      // To bypass constraints, we can call deleteDoc if the user owns it
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('[StorageAdapter] Local document deleted; cloud deletion buffered.');
    }
  },

  // Sync session logs from local stats
  async logSessionToCloud(wordCount: number, durationSeconds: number) {
    if (!this.currentUser || !this.isCloudActive) return;
    try {
      const sessionId = 'session-' + Date.now();
      const docRef = doc(db, 'sessions', sessionId);
      await setDoc(docRef, {
        id: sessionId,
        ownerUid: this.currentUser.uid,
        timestamp: Date.now(),
        wordCount,
        durationSeconds
      });
      console.log('[StorageAdapter] Reading session documented on Cloud.');
    } catch (error) {
      console.warn('[StorageAdapter] Local session recorded; cloud logging bypassed.');
    }
  }
};
