import React, { useState, useEffect } from 'react';
import { Radio, Sparkles, Volume2, ShieldAlert } from 'lucide-react';
import { MoodType, SoundId, RoomThemeId, RoomState, PresenceOrb } from './types';
import { getOrCreateSession, subscribeToRoom, subscribeToPresences, sendHeartbeat, removePresence, isSimulationMode, DEFAULT_ROOM_ID } from './firebaseService';
import { audioEngine } from './audioEngine';
import { ROOM_THEMES } from './data';
import AmbientBackground from './components/AmbientBackground';
import ParticleLayer from './components/ParticleLayer';
import PresenceLayer from './components/PresenceLayer';
import Dashboard from './components/Dashboard';

interface ClickRipple {
  id: number;
  clientX: number;
  clientY: number;
}

export default function App() {
  const [isRoomEntered, setIsRoomEntered] = useState(false);
  const [roomId] = useState(DEFAULT_ROOM_ID);
  
  // Realtime subscription states populated by Firestore / Simulated engine
  const [roomState, setRoomState] = useState<RoomState>({
    roomId,
    userCount: 0,
    moodCounts: {} as Record<MoodType, number>,
    activeSounds: {} as Record<SoundId, number>
  });
  const [orbs, setOrbs] = useState<PresenceOrb[]>([]);

  // User private states
  const [currentMood, setCurrentMood] = useState<MoodType>('cozy');
  const [activeSounds, setActiveSounds] = useState<SoundId[]>([]);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [selectedTheme, setSelectedTheme] = useState<'auto' | RoomThemeId>('auto');

  // Theme support helpers
  const getThemeForMood = (mood: MoodType): RoomThemeId => {
    switch (mood) {
      case 'sad':
        return 'rainy';
      case 'cozy':
      case 'lonely':
        return 'cafe';
      case 'sleepy':
      case 'overthinking':
        return 'latenight';
      case 'relaxing':
      case 'studying':
        return 'nature';
      case 'productive':
        return 'storm';
      case 'vibing':
      default:
        return 'dreamy';
    }
  };

  const getActiveRoomTheme = (): RoomThemeId => {
    if (selectedTheme !== 'auto') {
      return selectedTheme;
    }
    
    // Auto mode: Calculate dominant mood
    if (orbs.length === 0) {
      return getThemeForMood(currentMood);
    }

    const counts: Record<MoodType, number> = {} as Record<MoodType, number>;
    orbs.forEach((o) => {
      counts[o.mood] = (counts[o.mood] || 0) + 1;
    });

    let maxCount = 0;
    let dominant: MoodType = currentMood;
    Object.entries(counts).forEach(([m, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominant = m as MoodType;
      }
    });

    return getThemeForMood(dominant);
  };

  const activeThemeId = getActiveRoomTheme();
  const themeDef = ROOM_THEMES.find(t => t.id === activeThemeId) || ROOM_THEMES[0];
  const themeVars = themeDef.light;

  const themeStyles = {
    '--theme-accent': themeVars.accent,
    '--theme-accent-rgb': themeVars.accentRgb,
    '--theme-gradient-start': themeVars.gradientStart,
    '--theme-gradient-end': themeVars.gradientEnd,
    '--theme-card-bg': themeVars.cardBg,
    '--theme-card-border': themeVars.cardBorder,
    '--theme-glow': themeVars.glow,
    '--theme-text-accent': themeVars.textAccent,
    '--theme-pulse-speed': themeVars.pulseSpeed,
  } as React.CSSProperties;

  // Position of our floating orb, starts with randomized offset coordinates
  const [myCoords, setMyCoords] = useState<{ x: number; y: number }>(() => {
    return {
      x: 30 + Math.random() * 40,
      y: 20 + Math.random() * 60
    };
  });

  // Tap ripple arrays
  const [ripples, setRipples] = useState<ClickRipple[]>([]);

  const session = getOrCreateSession();

  // 1. Synchronize master volume to the synthesizer engine
  useEffect(() => {
    audioEngine.setMasterVolume(isMutedState ? 0 : masterVolume);
  }, [masterVolume]);

  const [isMutedState, setIsMutedState] = useState(false);

  // 2. Room listener setup upon entering the space
  useEffect(() => {
    if (!isRoomEntered) return;

    // Trigger initial heartbeat immediately
    sendHeartbeat(roomId, currentMood, activeSounds, myCoords.x, myCoords.y);

    // Heartbeat reporting runner every 12 seconds
    const heartbeatTimer = setInterval(() => {
      sendHeartbeat(roomId, currentMood, activeSounds, myCoords.x, myCoords.y);
    }, 12000);

    // Document listeners
    const unsubRoom = subscribeToRoom(roomId, (updatedState) => {
      setRoomState(updatedState);
    });

    const unsubPresences = subscribeToPresences(roomId, (updatedOrbs) => {
      setOrbs(updatedOrbs);
    });

    // Cleanup presence cleanly on window close/tab unload
    const handleUnload = () => {
      removePresence(roomId);
    };
    
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeatTimer);
      unsubRoom();
      unsubPresences();
      window.removeEventListener('beforeunload', handleUnload);
      removePresence(roomId);
    };
  }, [isRoomEntered, currentMood, activeSounds, myCoords, roomId]);

  // Handle entry and start audio synthesized nodes
  const handleEnterLounge = async () => {
    audioEngine.init();
    await audioEngine.resumeContext();
    audioEngine.setMood(currentMood);
    setIsRoomEntered(true);
  };

  const handleMoodChange = (mood: MoodType) => {
    setCurrentMood(mood);
    audioEngine.setMood(mood);
    // Push updated heartbeat
    sendHeartbeat(roomId, mood, activeSounds, myCoords.x, myCoords.y);
  };

  const handleSoundToggle = (id: SoundId, enabled: boolean) => {
    if (enabled) {
      setActiveSounds((prev) => [...prev, id]);
      audioEngine.toggleSound(id, true);
      audioEngine.triggerSingleKeyPress();
    } else {
      setActiveSounds((prev) =>
        prev.filter((sound) => sound !== id)
      );

      // STOP SOUND COMPLETELY
      audioEngine.toggleSound(id, false);

      // extra safety
      audioEngine.setSoundVolume(id, 0);
    }
  };
  

  const handleSoundVolumeChange = (id: SoundId, volume: number) => {
    audioEngine.setSoundVolume(id, volume);
  };

  const handleClearAll = () => {
    audioEngine.stopAll();

    activeSounds.forEach((soundId) => {
      audioEngine.toggleSound(soundId, false);
      audioEngine.setSoundVolume(soundId, 0);
    });

    setActiveSounds([]);
    setCurrentMood('cozy');
    audioEngine.setMood('cozy');
    setSelectedTheme('auto');

    sendHeartbeat(roomId, 'cozy', [], myCoords.x, myCoords.y);
  };

  // Background clicking to reposition presence circle smoothly
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Return early if clicking inside nested interactive dashboard panel deck elements
    if (
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('main') ||
      (e.target as HTMLElement).closest('header') ||
      (e.target as HTMLElement).closest('input')
    ) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    setMyCoords({ x: xPercent, y: yPercent });

    // Instantly report presence heartbeat to coordinate updates
    sendHeartbeat(roomId, currentMood, activeSounds, xPercent, yPercent);

    // Create a gorgeous ripple ring expander
    const newRipple: ClickRipple = {
      id: Date.now() + Math.random(),
      clientX: e.clientX - rect.left,
      clientY: e.clientY - rect.top,
    };
    
    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 900);
  };

  return (
    <div
      onClick={isRoomEntered ? handleBackgroundClick : undefined}
      style={themeStyles}
      className="relative w-full min-h-screen select-none overflow-x-hidden flex flex-col items-center justify-center transition-all duration-[1500ms] theme-transition bg-white/10 text-gray-900"
    >
      {/* Dynamic Background Gradients, Twinkling Stars & Firework flashes */}
      <AmbientBackground themeId={activeThemeId} />

      {/* Dynamic Soundscape Particle Overlay (rain, fireplace sparks, cafe steam) */}
      <ParticleLayer activeSounds={activeSounds} themeId={activeThemeId} />

      {/* RIPPLES LAYER */}
      {ripples.map((rip) => (
        <div
          key={rip.id}
          className="click-ripple"
          style={{
            left: `${rip.clientX}px`,
            top: `${rip.clientY}px`,
            transform: 'translate(-50%, -50%)',
            borderColor: 'var(--theme-accent)',
          }}
        />
      ))}

      {/* ---------------- ENTRY LOUNGE SCREEN GATE ---------------- */}
      {!isRoomEntered ? (
        <section className="relative z-30 max-w-lg mx-4 sm:mx-auto p-6 md:p-8 rounded-3xl backdrop-blur-3xl bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] shadow-2xl text-center space-y-7 animate-scale-up theme-transition" style={{ boxShadow: 'var(--theme-glow)' }}>
          <div className="space-y-3.5">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-[var(--theme-accent)]/10 flex items-center justify-center text-[var(--theme-accent)] border border-[var(--theme-accent)]/10 animate-fade-in theme-transition">
              <Radio className="w-7 h-7 animate-pulse text-[var(--theme-accent)]" />
            </div>
            <h2 className="font-serif text-3xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Room Noise
            </h2>
            <p className="font-sans text-xs md:text-sm text-gray-500 leading-relaxed">
              Sit in a quiet shared digital room with strangers around the world. Layer procedural rain, fireplace snaps, train hums, and cozy synth pads to co-create a live collaborative soundscape.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleEnterLounge}
              style={{ backgroundColor: 'var(--theme-accent)' }}
              className="group relative w-full px-6 py-4 rounded-2xl text-white font-semibold shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm cursor-pointer overflow-hidden font-sans"
            >
              <span className="relative z-10 flex items-center justify-center space-x-2">
                <Sparkles className="w-4 h-4 text-white/80" />
                <span>Sit down quietly</span>
              </span>
            </button>
          </div>

          <footer className="pt-2 flex items-center justify-center gap-1.5 text-stone-500 text-[10px] font-mono uppercase tracking-widest">
            {isSimulationMode ? (
              <span className="text-[var(--theme-accent)] flex items-center gap-1 theme-transition">
                <ShieldAlert className="w-3.5 h-3.5" /> Simulation Mode Active
              </span>
            ) : (
              <span>Realtime database synchronised</span>
            )}
          </footer>
        </section>
      ) : (
        /* ---------------- CORE SHARED ROOM EXPERIENCE ---------------- */
        <div className="relative w-full min-h-screen flex flex-col justify-between pt-16 md:pt-20 select-none z-10">
          
          {/* Floating glowing user presence circles (orbs) */}
          <PresenceLayer orbs={orbs} currentUserId={session.id} />

          {/* Controls Dashboard Deck Panel */}
          <Dashboard
            roomState={roomState}
            orbs={orbs}
            currentMood={currentMood}
            onMoodChange={handleMoodChange}
            activeSounds={activeSounds}
            onSoundToggle={handleSoundToggle}
            onSoundVolumeChange={handleSoundVolumeChange}
            onClearAll={handleClearAll}
            masterVolume={masterVolume}
            onMasterVolumeChange={setMasterVolume}
            roomId={roomId}
            activeThemeId={activeThemeId}
            selectedTheme={selectedTheme}
            onThemeChange={setSelectedTheme}
          />

        </div>
      )}
    </div>
  );
}
