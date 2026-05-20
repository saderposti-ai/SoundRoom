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
import { SoundId, MoodType, RoomThemeId, RoomState, PresenceOrb } from '../types';
import { audioEngine } from '../audioEngine';

interface DashboardProps {
  roomState: RoomState;
  orbs: PresenceOrb[];
  currentMood: MoodType;
  onMoodChange: (m: MoodType) => void;
  activeSounds: SoundId[];
  onSoundToggle: (id: SoundId, state: boolean) => void;
  onSoundVolumeChange: (id: SoundId, vol: number) => void;
  onClearAll: () => void;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  roomId: string;
  activeThemeId: RoomThemeId;
  selectedTheme: 'auto' | RoomThemeId;
  onThemeChange: (themeId: 'auto' | RoomThemeId) => void;
}

export default function Dashboard({
  roomState,
  orbs,
  currentMood,
  onMoodChange,
  activeSounds,
  onSoundToggle,
  onSoundVolumeChange,
  onClearAll,
  masterVolume,
  onMasterVolumeChange,
  roomId,
  activeThemeId,
  selectedTheme,
  onThemeChange
}: DashboardProps) {

  const [activeTab, setActiveTab] = useState<'sounds' | 'themes'>('sounds');

  const [isMuted, setIsMuted] = useState(false);
  const [savedMasterVolume, setSavedMasterVolume] = useState(masterVolume);

  // FIXED: reactive sound volumes state
  const [soundVolumes, setSoundVolumes] = useState<Record<string, number>>({});

  // Initialize sound volumes
  useEffect(() => {
    const initialVolumes: Record<string, number> = {};

    SOUND_DEFINITIONS.forEach((sound) => {
      initialVolumes[sound.id] = audioEngine.getSoundVolume(sound.id);
    });

    setSoundVolumes(initialVolumes);
  }, []);

  // Radio silence state
  const [radioCountdown, setRadioCountdown] = useState<number | null>(null);
  const [isRadioSilent, setIsRadioSilent] = useState(false);

  useEffect(() => {

    const triggerRadioMoment = () => {

      setRadioCountdown(5);

      const countdownInterval = setInterval(() => {

        setRadioCountdown((prev) => {

          if (prev === null) return null;

          if (prev <= 1) {

            clearInterval(countdownInterval);

            startRadioSilence();

            return null;
          }

          return prev - 1;

        });

      }, 1000);

    };

    const startRadioSilence = () => {

      setIsRadioSilent(true);

      const activeCopy = [...activeSounds];

      activeCopy.forEach((soundId) => {
        audioEngine.toggleSound(soundId, false);
      });

      setTimeout(() => {

        setIsRadioSilent(false);

        activeCopy.forEach((soundId) => {
          audioEngine.toggleSound(soundId, true);
        });

      }, 10000);

    };

    const macroTimer = setInterval(() => {

      if (
        activeSounds.length > 0 &&
        !isRadioSilent &&
        radioCountdown === null
      ) {
        triggerRadioMoment();
      }

    }, 150000);

    return () => clearInterval(macroTimer);

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

  const handleSliderChange = (
    soundId: SoundId,
    volume: number
  ) => {

    // Update React state FIRST
    setSoundVolumes((prev) => ({
      ...prev,
      [soundId]: volume
    }));

    // Update audio engine
    onSoundVolumeChange(soundId, volume);

  };

  const getGlobalSoundPlayers = (id: SoundId) => {
    return roomState.activeSounds?.[id] || 0;
  };

  const currentThemeDef =
    ROOM_THEMES.find(t => t.id === activeThemeId) ||
    ROOM_THEMES[0];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 z-20 pb-12 sm:px-6">

      {/* RADIO COUNTDOWN */}
      {radioCountdown !== null && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-2xl bg-amber-500/90 text-white backdrop-blur-md shadow-2xl flex items-center space-x-3 text-sm font-sans animate-fade-in border border-amber-400">
          <Radio className="w-5 h-5 animate-pulse" />
          <span>
            <strong>Radio Broadcast:</strong> Silent Moment in{' '}
            <strong>{radioCountdown}s</strong>
          </span>
        </div>
      )}

      {/* SILENT MODE */}
      {isRadioSilent && (
        <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in">

          <div className="p-8 rounded-3xl bg-neutral-900/50 border border-white/10 max-w-md text-center space-y-4 animate-scale-up">

            <Radio
              className="w-12 h-12 text-blue-400 mx-auto animate-ping"
              style={{ animationDuration: '3s' }}
            />

            <h3 className="font-serif text-2xl text-white">
              The Room goes Silent
            </h3>

            <p className="font-sans text-sm text-stone-400">
              Everyone online is listening together.
            </p>

          </div>

        </div>
      )}

      {/* HEADER */}
      <header
        className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl mb-6 backdrop-blur-xl bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] shadow-lg"
        style={{ boxShadow: 'var(--theme-glow)' }}
      >

        <div className="flex items-center space-x-3">

          <div className="p-2.5 rounded-2xl bg-black/5">
            <Radio className="w-5 h-5 animate-pulse text-[var(--theme-accent)]" />
          </div>

          <div>

            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Room Noise</span>
              <span>{currentThemeDef.emoji}</span>
            </h1>

            <p className="text-[11px] font-mono uppercase tracking-widest">
              {orbs.length} listening
            </p>

          </div>

        </div>

        {/* MASTER VOLUME */}
        <div className="flex items-center space-x-2 bg-black/5 dark:bg-white/10 px-4 py-2 rounded-2xl">

          <button
            onClick={toggleMasterMute}
            className="text-gray-700 dark:text-white"
          >
            {isMuted || masterVolume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-[var(--theme-accent)]" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={masterVolume}
            onChange={(e) => {
              onMasterVolumeChange(parseFloat(e.target.value));

              if (parseFloat(e.target.value) > 0) {
                setIsMuted(false);
              }
            }}
            className="premium-slider w-24"
          />

        </div>

      </header>

      {/* MAIN */}
      <main
        className="rounded-3xl backdrop-blur-3xl bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] shadow-2xl overflow-hidden"
        style={{ boxShadow: 'var(--theme-glow)' }}
      >

        {/* TABS */}
        <nav className="flex border-b border-black/5 dark:border-white/10">

          <button
            onClick={() => setActiveTab('sounds')}
            className={`flex-1 py-4 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              activeTab === 'sounds'
                ? 'border-b-2 border-[var(--theme-accent)]'
                : 'opacity-70'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Soundscape</span>
          </button>

          <button
            onClick={() => setActiveTab('themes')}
            className={`flex-1 py-4 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              activeTab === 'themes'
                ? 'border-b-2 border-[var(--theme-accent)]'
                : 'opacity-70'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Atmosphere</span>
          </button>

        </nav>

        <div className="p-4 sm:p-6 md:p-8">

          {/* SOUNDS TAB */}
          {activeTab === 'sounds' && (

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {SOUND_DEFINITIONS.map((sound) => {

                const isActive = activeSounds.includes(sound.id);

                const currentVol =
                  soundVolumes[sound.id] ?? 0.8;

                const activePeeps =
                  getGlobalSoundPlayers(sound.id);

                return (

                  <motion.div
                    key={sound.id}
                    className={`relative p-4 rounded-2xl border transition-all duration-300 ${
                      isActive
                        ? 'border-[var(--theme-accent)]'
                        : 'border-black/10 dark:border-white/10'
                    }`}
                    whileHover={{ scale: 1.01 }}
                  >

                    {/* TOP */}
                    <div className="flex items-start justify-between gap-4">

                      <div
                        onClick={() => onSoundToggle(sound.id, !isActive)}
                        className="flex items-start gap-3 cursor-pointer flex-1"
                      >

                        <span className="text-2xl">
                          {sound.emoji}
                        </span>

                        <div>

                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {sound.label}
                          </h3>

                          {activePeeps > 0 && (
                            <p className="text-[10px] mt-1 text-[var(--theme-accent)]">
                              {activePeeps} playing
                            </p>
                          )}

                        </div>

                      </div>

                      {/* TOGGLE */}
                      <button
                        onClick={() => onSoundToggle(sound.id, !isActive)}
                        className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-all ${
                          isActive
                            ? 'bg-[var(--theme-accent)]'
                            : 'bg-gray-300 dark:bg-neutral-700'
                        }`}
                      >

                        <motion.div
                          className="w-5 h-5 rounded-full bg-white shadow"
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

                    {/* SLIDER */}
                    {isActive && (

                      <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10">

                        <div className="flex items-center gap-3">

                          <Volume2 className="w-4 h-4 text-[var(--theme-accent)]" />

                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={currentVol}
                            onChange={(e) =>
                              handleSliderChange(
                                sound.id,
                                parseFloat(e.target.value)
                              )
                            }
                            className="premium-slider w-full"
                          />

                          <span className="text-[10px] font-mono w-8 text-right">
                            {Math.round(currentVol * 100)}%
                          </span>

                        </div>

                      </div>

                    )}

                  </motion.div>

                );

              })}

            </div>

          )}

          {/* THEMES TAB */}
          {activeTab === 'themes' && (

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

              <button
                onClick={() => onThemeChange('auto')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  selectedTheme === 'auto'
                    ? 'border-[var(--theme-accent)]'
                    : 'border-black/10 dark:border-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔄</span>
                  <span className="font-bold text-sm">
                    Collective Sync
                  </span>
                </div>
              </button>

              {ROOM_THEMES.map((theme) => {

                const isSelected =
                  selectedTheme === theme.id;

                return (

                  <button
                    key={theme.id}
                    onClick={() => onThemeChange(theme.id)}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-[var(--theme-accent)]'
                        : 'border-black/10 dark:border-white/10'
                    }`}
                  >

                    <div className="flex items-center gap-3">

                      <span className="text-2xl">
                        {theme.emoji}
                      </span>

                      <div>

                        <h3 className="font-semibold text-sm">
                          {theme.label}
                        </h3>

                        <p className="text-[10px] opacity-70 mt-1">
                          {theme.description}
                        </p>

                      </div>

                    </div>

                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <Check className="w-4 h-4 text-[var(--theme-accent)]" />
                      </div>
                    )}

                  </button>

                );

              })}

            </div>

          )}

        </div>

      </main>

    </div>
  );
}