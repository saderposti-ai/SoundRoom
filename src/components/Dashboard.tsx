import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Sliders,
  Radio,
  Check,
  Flame
} from 'lucide-react';
import { motion } from 'motion/react';
import { SOUND_DEFINITIONS, ROOM_THEMES } from '../data';
import { SoundId, MoodType, RoomThemeId, } from '../types';
import { audioEngine } from '../audioEngine';

interface DashboardProps {
  onMoodChange: (m: MoodType) => void;
  activeSounds: SoundId[];
  onSoundToggle: (id: SoundId, state: boolean) => void;
  onSoundVolumeChange: (id: SoundId, vol: number) => void;
  onClearAll: () => void;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  activeThemeId: RoomThemeId;
  selectedTheme: RoomThemeId;
  onThemeChange: (themeId: RoomThemeId) => void;
}

export default function Dashboard({
  activeSounds,
  onSoundToggle,
  onSoundVolumeChange,
  onClearAll,
  masterVolume,
  onMasterVolumeChange,
  activeThemeId,
  selectedTheme,
  onThemeChange
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'sounds' | 'themes'>('sounds');
  const [isMuted, setIsMuted] = useState(false);
  const [savedMasterVolume, setSavedMasterVolume] = useState(masterVolume);

  const [soundVolumes, setSoundVolumes] = useState<Record<string, number>>({});

  // Radio Moment countdown state
  const [radioCountdown, setRadioCountdown] = useState<number | null>(null);
  const [isRadioSilent, setIsRadioSilent] = useState(false);
  const [pausedSoundsForRadio, setPausedSoundsForRadio] = useState<SoundId[]>([]);

  // Periodically schedule random peaceful Silent Radio Moments (e.g. once every 3 minutes)
  useEffect(() => {
    const triggerRadioMoment = () => {
      // Step 1: Start 5-second countdown alert
      setRadioCountdown(5);
      const countdownInterval = setInterval(() => {
        setRadioCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(countdownInterval);
            // Step 2: Trigger silence
            startRadioSilence();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const startRadioSilence = () => {
      setIsRadioSilent(true);
      
      // Save currently active sounds and turn them off
      const activeCopy = [...activeSounds];
      setPausedSoundsForRadio(activeCopy);

      // Mute audio engine
      activeCopy.forEach((soundId) => {
        audioEngine.toggleSound(soundId, false);
      });

      // After 10 seconds, restore soundscape
      setTimeout(() => {
        setIsRadioSilent(false);
        activeCopy.forEach((soundId) => {
          audioEngine.toggleSound(soundId, true);
        });
        setPausedSoundsForRadio([]);
      }, 10000);
    };

    // Schedule next silent moment in 150 seconds
    const macroTimer = setInterval(() => {
      if (activeSounds.length > 0 && !isRadioSilent && radioCountdown === null) {
        triggerRadioMoment();
      }
    }, 150000);

    return () => {
      clearInterval(macroTimer);
    };
  }, [activeSounds, isRadioSilent, radioCountdown]);

  const toggleMasterMute = () => {
    if (isMuted) {
      onMasterVolumeChange(savedMasterVolume);
      setIsMuted(false);
    } else {
      setSavedMasterVolume(masterVolume);
      onMasterVolumeChange(0);
      setIsMuted(true);
    }
  };


  const currentThemeDef = ROOM_THEMES.find(t => t.id === activeThemeId) || ROOM_THEMES[0];

  const getDominantVibeSymbol = () => {
    return currentThemeDef.emoji;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 z-20 pb-12 sm:px-6">
      {/* ----------------- POPUP NOTIFICATIONS / ALERTS ----------------- */}
      {/* Radio Moment Countdown Alert */}
      {radioCountdown !== null && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-2xl bg-amber-500/90 text-white backdrop-blur-md shadow-2xl flex items-center space-x-3 text-sm font-sans animate-fade-in border border-amber-400">
          <Radio className="w-5 h-5 animate-pulse" />
          <span>
            <strong>Radio Broadcast:</strong> The room enters a Silent Moment in{' '}
            <strong>{radioCountdown}s</strong>...
          </span>
        </div>
      )}

      {/* Actual Radio Silence Active */}
      {isRadioSilent && (
        <div className="fixed inset-0 bg-neutral-950/70 z-50 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in pointer-events-auto">
          <div className="p-8 rounded-3xl bg-neutral-900/50 border border-white/10 max-w-md text-center space-y-4 animate-scale-up">
            <Radio className="w-12 h-12 text-blue-400 mx-auto animate-ping" style={{ animationDuration: '3s' }} />
            <h3 className="font-serif text-2xl text-stone-100 tracking-tight">The Room goes Silent.</h3>
            <p className="font-sans text-sm text-stone-400 leading-relaxed">
              A short silent pause lets the atmosphere breathe for a few seconds.
            </p>
            <div className="w-24 h-0.5 bg-neutral-800 mx-auto">
              <div className="h-full bg-blue-400 animate-shrink-progress" />
            </div>
          </div>
        </div>
      )}

      {/* ----------------- UPPER COMPACT FLOAT DECK ----------------- */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl mb-6 backdrop-blur-xl bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] shadow-lg select-none theme-transition" style={{ boxShadow: 'var(--theme-glow)' }}>
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-2xl bg-white/60 text-gray-800 border border-gray-200">
            <Radio className="w-5 h-5 animate-pulse text-[var(--theme-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-sans tracking-tight text-gray-900 flex items-center gap-2">
              <span>Room Noise</span>
              <span className="text-base select-none">{getDominantVibeSymbol()}</span>
            </h1>
            <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">
              Personal ambient soundscape
            </p>
          </div>
        </div>

        {/* Master Controls & Theme Switcher */}
        <div className="flex items-center space-x-4 w-full sm:w-auto justify-end">
          <div className="flex items-center space-x-2 bg-white/60 px-4 py-2.5 rounded-2xl border border-gray-200">
            <button
              onClick={toggleMasterMute}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Mute soundscape"
            >
              {isMuted || masterVolume === 0 ? <VolumeX className="w-4.5 h-4.5 text-red-500" /> : <Volume2 className="w-4.5 h-4.5 text-[var(--theme-accent)]" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVolume}
              onChange={(e) => {
                onMasterVolumeChange(parseFloat(e.target.value));
                if (parseFloat(e.target.value) > 0) setIsMuted(false);
              }}
              className="premium-slider w-20 md:w-24 cursor-pointer focus:outline-none"
              title="Master volume"
            />
          </div>
        </div>
      </header>

      {/* ----------------- CORE CONTROL GLASS DECK ----------------- */}
      <main className="rounded-3xl backdrop-blur-3xl bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] shadow-2xl overflow-hidden theme-transition" style={{ boxShadow: 'var(--theme-glow)' }}>
        
        {/* Navigation Sub-Tabs */}
        <nav className="flex border-b border-gray-200 bg-gray-100/70">
          <button
            onClick={() => setActiveTab('sounds')}
            className={`flex-1 py-4 text-xs font-semibold uppercase tracking-widest font-sans flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'sounds'
                ? 'text-gray-900 border-b-2 border-[var(--theme-accent)] font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sliders className="w-4 h-4 text-[var(--theme-accent)]" />
            <span>Soundscape</span>
          </button>

          <button
            onClick={() => setActiveTab('themes')}
            className={`flex-1 py-4 text-xs font-semibold uppercase tracking-widest font-sans flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'themes'
                ? 'text-gray-950 dark:text-white border-b-2 border-[var(--theme-accent)] font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Flame className="w-4 h-4 text-[var(--theme-accent)] animate-pulse" />
            <span>Atmosphere</span>
          </button>
        </nav>

        {/* Tab Contents */}
        <div className="p-4 sm:p-6 md:p-8">
          
          {/* SOUNDS TAB */}
          {activeTab === 'sounds' && (

            <div className="space-y-5">

              {/* TOP BAR */}
              <div className="flex items-center justify-between">

                <p className="text-xs text-gray-500 max-w-md leading-relaxed">
                  Enable and layer multiple ambient channels. Each sound is generated procedurally in your browser to match the room atmosphere.
                </p>

                
                  <button
                    onClick={onClearAll}
                    className="
                      px-4 py-2
                      rounded-xl
                      text-xs
                      font-bold
                      uppercase
                      tracking-widest
                      bg-red-500/10
                      border border-red-500/20
                      text-red-500
                      hover:bg-red-500/20
                      transition-all
                      cursor-pointer
                      whitespace-nowrap
                    "
                  >
                    Clear All
                  </button>
                

              </div>

              {/* SOUND GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
                {SOUND_DEFINITIONS.map((sound) => {
                  const isActive = activeSounds.includes(sound.id);
                  const currentVol = soundVolumes[sound.id] ?? audioEngine.getSoundVolume(sound.id);
              


                  return (
                    <motion.div
                      key={sound.id}
                      className={`relative p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                        isActive
                           ? 'bg-[var(--theme-card-bg)] border-[var(--theme-accent)] scale-[1.01] theme-transition'
                           : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-[var(--theme-accent)]/30'
                      }`}
                      style={isActive ? { boxShadow: 'var(--theme-glow)' } : undefined}
                      whileHover={{ scale: 1.015 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <div className="flex items-start justify-between gap-4 w-full">
                        <div
                          onClick={() => onSoundToggle(sound.id, !isActive)}
                          className="flex items-start space-x-3 cursor-pointer flex-1 min-w-0"
                        >
                          <span className="text-2xl flex-shrink-0 select-none">{sound.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                              <span>{sound.label}</span>
                              
                            </h3>
                          </div>
                        </div>

                        {/* Custom switch slider with Framer Motion */}
                        <div className="flex-shrink-0 flex items-center space-x-2">
                          {/* Pulsing visualizer bar if active */}
                          {isActive && (
                            <div className="flex items-end gap-[2px] h-3.5 px-0.5 select-none pointer-events-none">
                              <motion.div
                                className="w-[2px] bg-[var(--theme-accent)] rounded-full"
                                animate={{ height: [4, 12, 4] }}
                                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
                              />
                              <motion.div
                                className="w-[2px] bg-[var(--theme-accent)] rounded-full"
                                animate={{ height: [6, 15, 6] }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                              />
                              <motion.div
                                className="w-[2px] bg-[var(--theme-accent)] rounded-full animate-pulse"
                                animate={{ height: [5, 9, 5] }}
                                transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                              />
                            </div>
                          )}

                          <button
                            onClick={() => onSoundToggle(sound.id, !isActive)}
                            className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 border ${
                              isActive
                                ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)]'
                                : 'bg-gray-300 border-gray-300'
                            }`}
                            aria-label={`Toggle ${sound.label}`}
                          >
                            <motion.div
                              className="absolute top-[1px] left-[1px] w-[20px] h-[20px] rounded-full bg-white shadow-md"
                              animate={{
                                x: isActive ? 20 : 0
                              }}
                              transition={{
                                type: 'spring',
                                stiffness: 500,
                                damping: 30
                              }}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Slider controls & statistics */}
                      {isActive && (
                        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between space-x-4 animate-fade-in">
                          <div className="flex items-center space-x-2 flex-1">
                            <Volume2 className="w-3.5 h-3.5 text-[var(--theme-accent)] theme-transition" />
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={currentVol}
                              onChange={(e) => {
                                const vol = parseFloat(e.target.value);

                                setSoundVolumes((prev) => ({
                                  ...prev,
                                  [sound.id]: vol
                                }));

                                onSoundVolumeChange(sound.id, vol);
                              }}
                              className="premium-slider w-full cursor-pointer focus:outline-none"
                              title={`${sound.label} volume`}
                            />
                            <span className="font-mono text-[9px] font-bold text-[var(--theme-text-accent)] w-6 text-right theme-transition">
                              {Math.round(currentVol * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}

              </div>
            </div>
           
          )}



          {/* TAB 3: ATMOSPHERE THEME CONTROL */}
          {activeTab === 'themes' && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <span>Atmosphere Vibe Controller</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] font-mono uppercase tracking-wider theme-transition font-bold">
                    Theme Presets
                  </span>
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  ChooChoose an atmospheric preset to customize the mood and lighting of your personal space.
                </p>
              </div>

              {/* Grid of Atmosphere Themes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                

                {ROOM_THEMES.map((theme) => {
                  const isThemeSelected = selectedTheme === theme.id;
                  const isActiveRightNow = activeThemeId === theme.id;

                  return (
                    <button
                      key={theme.id}
                      onClick={() => onThemeChange(theme.id)}
                      className={`p-4 rounded-2xl flex flex-col items-start text-left border transition-all duration-300 relative cursor-pointer group ${
                        isThemeSelected
                          ? 'bg-[var(--theme-card-bg)] border-[var(--theme-accent)] border-2 shadow-md translate-y-[-2px] theme-transition'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-[var(--theme-accent)]/35'
                      }`}
                      style={isThemeSelected ? { boxShadow: 'var(--theme-glow)' } : undefined}
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="text-2.5xl select-none">{theme.emoji}</span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold leading-tight">{theme.label}</span>
                          {isActiveRightNow && (
                            <span className="text-[8px] font-mono text-[var(--theme-accent)] uppercase tracking-wider mt-0.5 animate-pulse theme-transition font-extrabold">Active now</span>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2 leading-relaxed flex-1">
                        {theme.description}
                      </p>
                      {isThemeSelected && (
                        <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-[var(--theme-accent)] text-white flex items-center justify-center shadow theme-transition border border-white/20">
                          <Check className="w-3 h-3 stroke-[2.5px]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Floating helpful user guide footer */}
      <footer className="text-center mt-6 text-[11px] text-gray-400 hover:text-gray-500 transition-colors font-sans select-none leading-relaxed">
        Layer ambient sounds, adjust volumes, and create your perfect atmosphere.
      </footer>
    </div>
  );
}
