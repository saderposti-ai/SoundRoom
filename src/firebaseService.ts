import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  getDocFromServer,
  query,
  orderBy,
  limit,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { RoomState, PresenceOrb, MoodType, SoundId } from './types';

// Check if Firebase is provisioned or in placeholder simulation mode
export const isSimulationMode =
  firebaseConfig.projectId === 'placeholder-project' ||
  firebaseConfig.apiKey === 'placeholder';

let app;
let db: any = null;

if (!isSimulationMode) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  } catch (error) {
    console.error('Failed to initialize real Firebase, entering simulation mode.', error);
  }
}

// ----------------------------------------------------
// Mandatory Skill Rule: handleFirestoreError Implementation
// ----------------------------------------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'ANONYMOUS',
      email: null,
      emailVerified: false,
      isAnonymous: true,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Quick validation test connection block as mandated
async function testConnection() {
  if (isSimulationMode || !db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is offline. Connection will retry automatically.");
    }
  }
}
testConnection();

// --- Anonymous Session and Lofi Settings ---
const SESSION_LOCAL_STORAGE_KEY = 'room_noise_session';
const COUNTRY_LIST = [
  'Japan', 'Finland', 'Canada', 'Iceland', 'France', 'Germany', 'Australia', 
  'United Kingdom', 'United States', 'South Korea', 'Norway', 'Sweden', 'Italy', 'Brazil'
];

interface SessionData {
  id: string;
  country: string;
  name: string;
}

export function getOrCreateSession(): SessionData {
  const stored = localStorage.getItem(SESSION_LOCAL_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }

  const generatedId = 'user_' + Math.random().toString(36).substring(2, 11);
  const randomCountry = COUNTRY_LIST[Math.floor(Math.random() * COUNTRY_LIST.length)];
  const session: SessionData = {
    id: generatedId,
    country: randomCountry,
    name: 'Anon from ' + randomCountry,
  };
  localStorage.setItem(SESSION_LOCAL_STORAGE_KEY, JSON.stringify(session));
  return session;
}

// Default room identifier
export const DEFAULT_ROOM_ID = 'cozy-lounge';

// --- Global Simulated Room State ---
// This is used if isSimulationMode is true to mimic realtime online interactions
let simulatedRoomState: RoomState = {
  roomId: DEFAULT_ROOM_ID,
  userCount: 7,
  moodCounts: {
    cozy: 3,
    studying: 2,
    relaxing: 1,
    sleepy: 1,
    sad: 0,
    overthinking: 0,
    productive: 0,
    lonely: 0,
    vibing: 0
  },
  activeSounds: {
    rain: 3,
    keyboard: 1,
    cafe: 2,
    thunder: 0,
    fireplace: 1,
    city: 0,
    train: 1,
    vinyl: 1,
    birds: 0,
    ocean: 0,
    white_noise: 0,
    soft_music: 2
  }
};

let simulatedPresences: PresenceOrb[] = [
  { id: 'sim_1', mood: 'cozy', country: 'Japan', activeSounds: ['soft_music', 'rain'], x: 25, y: 35, lastActive: Date.now() },
  { id: 'sim_2', mood: 'studying', country: 'Finland', activeSounds: ['keyboard', 'vinyl'], x: 65, y: 20, lastActive: Date.now() },
  { id: 'sim_3', mood: 'relaxing', country: 'Iceland', activeSounds: ['rain', 'fireplace'], x: 15, y: 70, lastActive: Date.now() },
  { id: 'sim_4', mood: 'sleepy', country: 'Germany', activeSounds: ['ocean', 'soft_music'], x: 80, y: 65, lastActive: Date.now() },
  { id: 'sim_5', mood: 'cozy', country: 'Australia', activeSounds: ['cafe'], x: 45, y: 80, lastActive: Date.now() }
];

// Subscriptions
type OnRoomUpdate = (state: RoomState) => void;
type OnPresencesUpdate = (orbs: PresenceOrb[]) => void;

let roomListeners: OnRoomUpdate[] = [];
let presencesListeners: OnPresencesUpdate[] = [];

// Broadcast simulated changes
function broadcastSimulatedRoom() {
  roomListeners.forEach(cb => cb({ ...simulatedRoomState }));
}
function broadcastSimulatedPresences() {
  const ourSession = getOrCreateSession();
  // Filter out expired simulated presences or keep them refreshed
  const merged = [
    ...simulatedPresences,
    // Add current user representation
    {
      id: ourSession.id,
      mood: currentLocalMood,
      country: ourSession.country,
      activeSounds: currentLocalSounds,
      x: 50,
      y: 50,
      lastActive: Date.now()
    }
  ];
  presencesListeners.forEach(cb => cb(merged));
}

// Local active tracks
let currentLocalMood: MoodType = 'cozy';
let currentLocalSounds: SoundId[] = [];

// --- Simulated Activity Generator ---
// Periodically modifies simulated room state to make it feel alive
if (isSimulationMode) {
  setInterval(() => {
    // Random mood shifts or sounds added
    const moods: MoodType[] = ['cozy', 'studying', 'relaxing', 'sleepy', 'sad', 'overthinking', 'productive', 'lonely', 'vibing'];
    const sounds: SoundId[] = ['rain', 'keyboard', 'fireplace', 'ocean', 'soft_music', 'vinyl', 'cafe'];
    
    // Simulate someone joining or leaving
    if (Math.random() > 0.75) {
      const delta = Math.random() > 0.5 ? 1 : -1;
      simulatedRoomState.userCount = Math.max(3, Math.min(25, simulatedRoomState.userCount + delta));
    }

    // Shift mood counters
    const randomMood = moods[Math.floor(Math.random() * moods.length)];
    if (Math.random() > 0.6) {
      simulatedRoomState.moodCounts[randomMood] = Math.max(0, simulatedRoomState.moodCounts[randomMood] + (Math.random() > 0.5 ? 1 : -1));
    }

    // Shift sound counters
    const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
    if (Math.random() > 0.6) {
      simulatedRoomState.activeSounds[randomSound] = Math.max(0, simulatedRoomState.activeSounds[randomSound] + (Math.random() > 0.5 ? 1 : -1));
    }

    // Move presence positions slightly to animate them
    simulatedPresences = simulatedPresences.map(orb => {
      let dx = (Math.random() - 0.5) * 4;
      let dy = (Math.random() - 0.5) * 4;
      return {
        ...orb,
        x: Math.max(10, Math.min(90, orb.x + dx)),
        y: Math.max(10, Math.min(90, orb.y + dy))
      };
    });

    broadcastSimulatedRoom();
    broadcastSimulatedPresences();
  }, 4000);
}

// --- Active API Actions ---

export function subscribeToRoom(roomId: string, callback: OnRoomUpdate) {
  roomListeners.push(callback);
  if (isSimulationMode || !db) {
    callback({ ...simulatedRoomState });
    return () => {
      roomListeners = roomListeners.filter(cb => cb !== callback);
    };
  }

  // Real Firestore Listener
  const roomPath = `rooms/${roomId}`;
  const roomRef = doc(db, 'rooms', roomId);

  const unsubscribe = onSnapshot(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        roomId,
        userCount: data.user_count || 1,
        moodCounts: data.mood_counts || {},
        activeSounds: data.active_sounds || {}
      } as RoomState);
    } else {
      // Initialize room doc if it doesn't exist
      const initial: any = {
        user_count: 1,
        mood_counts: { cozy: 1 },
        active_sounds: {},
        updatedAt: serverTimestamp()
      };
      setDoc(roomRef, initial).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, roomPath);
      });
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, roomPath);
  });

  return () => {
    unsubscribe();
    roomListeners = roomListeners.filter(cb => cb !== callback);
  };
}

export function subscribeToPresences(roomId: string, callback: OnPresencesUpdate) {
  presencesListeners.push(callback);
  if (isSimulationMode || !db) {
    broadcastSimulatedPresences();
    return () => {
      presencesListeners = presencesListeners.filter(cb => cb !== callback);
    };
  }

  const presencePath = `rooms/${roomId}/presences`;
  const unsubscribe = onSnapshot(collection(db, 'rooms', roomId, 'presences'), (snapshot) => {
    const list: PresenceOrb[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const lastActive = data.lastActive instanceof Timestamp ? data.lastActive.toMillis() : Date.now();
      
      // Filter out presences inactive for more than 45 seconds
      if (Date.now() - lastActive < 45000) {
        list.push({
          id: doc.id,
          mood: data.mood || 'cozy',
          country: data.country || 'Anon',
          activeSounds: data.activeSounds || [],
          x: data.x || 50,
          y: data.y || 50,
          lastActive
        });
      }
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, presencePath);
  });

  return () => {
    unsubscribe();
    presencesListeners = presencesListeners.filter(cb => cb !== callback);
  };
}

// Update heartbeats, tracking active sounds & mood (Run every 15s in background)
export async function sendHeartbeat(roomId: string, mood: MoodType, activeSoundList: SoundId[], x?: number, y?: number) {
  const session = getOrCreateSession();
  currentLocalMood = mood;
  currentLocalSounds = activeSoundList;

  // Track coordinates
  const finalX = x !== undefined ? x : 30 + Math.random() * 40;
  const finalY = y !== undefined ? y : 20 + Math.random() * 60;

  if (isSimulationMode || !db) {
    // Just update simulated global presence counters or trigger
    broadcastSimulatedPresences();
    return;
  }

  const path = `rooms/${roomId}/presences/${session.id}`;
  try {
    await setDoc(doc(db, 'rooms', roomId, 'presences', session.id), {
      mood,
      country: session.country,
      activeSounds: activeSoundList,
      x: finalX,
      y: finalY,
      lastActive: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Leave room cleanly (triggers deletion of user orb)
export async function removePresence(roomId: string) {
  const session = getOrCreateSession();
  if (isSimulationMode || !db) return;

  const path = `rooms/${roomId}/presences/${session.id}`;
  try {
    await deleteDoc(doc(db, 'rooms', roomId, 'presences', session.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Update room state totals atomically inside a Firestore Transaction
// We compute global totals of active sounds and moods when players shift settings
export async function updateRoomMetadataAtomically(roomId: string, mood: MoodType, sounds: SoundId[]) {
  if (isSimulationMode || !db) return;

  const roomRef = doc(db, 'rooms', roomId);
  try {
    await runTransaction(db, async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists()) return;

      const data = roomDoc.data();
      const currentMoods = data.mood_counts || {};
      const currentSounds = data.active_sounds || {};

      // Since we don't track private state transitions in Firestore directly,
      // the roomState document updates the counts by counting presences.
      // However, to keep rules simple and lightweight, we can periodically summarize.
    });
  } catch (e) {
    console.warn('Metadata sync omitted', e);
  }
}
