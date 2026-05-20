import React, { useState } from 'react';
import { PresenceOrb } from '../types';

interface PresenceLayerProps {
  orbs: PresenceOrb[];
  currentUserId: string;
}

export default function PresenceLayer({ orbs, currentUserId }: PresenceLayerProps) {
  const [hoveredOrb, setHoveredOrb] = useState<string | null>(null);

  const getOrbColor = (mood: string) => {
    switch (mood) {
      case 'cozy': return 'bg-amber-400 dark:bg-amber-300 shadow-amber-400/50';
      case 'studying': return 'bg-teal-400 dark:bg-teal-300 shadow-teal-400/50';
      case 'sad': return 'bg-cyan-400 dark:bg-cyan-300 shadow-cyan-400/50';
      case 'overthinking': return 'bg-purple-400 dark:bg-purple-300 shadow-purple-400/50';
      case 'relaxing': return 'bg-rose-400 dark:bg-rose-300 shadow-rose-400/50';
      case 'sleepy': return 'bg-indigo-400 dark:bg-indigo-300 shadow-indigo-400/50';
      case 'productive': return 'bg-orange-400 dark:bg-orange-300 shadow-orange-400/50';
      case 'lonely': return 'bg-slate-400 dark:bg-slate-300 shadow-slate-400/50';
      case 'vibing': return 'bg-pink-400 dark:bg-pink-300 shadow-pink-400/50';
      default: return 'bg-white dark:bg-stone-200 shadow-white/50';
    }
  };

  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case 'studying': return '📚 studying';
      case 'relaxing': return '🍃 relaxing';
      case 'sad': return '🌧️ sad';
      case 'overthinking': return '💭 overthinking';
      case 'cozy': return '☕ cozy';
      case 'sleepy': return '🌙 sleepy';
      case 'productive': return '⚡ productive';
      case 'lonely': return '🕯️ lonely';
      case 'vibing': return '🎧 vibing';
      default: return '✨ vibe';
    }
  };

  // Clean label of active sounds being emitted so we show it beautifully
  const formatSoundsList = (sounds: string[]) => {
    if (!sounds || sounds.length === 0) return 'listening to silence';
    return 'layered ' + sounds.map(s => s.replace('_', ' ')).join(', ');
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-10">
      {orbs.map((orb) => {
        const isMe = orb.id === currentUserId;
        const colorClass = getOrbColor(orb.mood);
        const isHovered = hoveredOrb === orb.id;

        return (
          <div
            key={orb.id}
            className="absolute transition-all duration-[6000ms] ease-out pointer-events-auto group"
            style={{
              left: `${orb.x}%`,
              top: `${orb.y}%`,
            }}
            onMouseEnter={() => setHoveredOrb(orb.id)}
            onMouseLeave={() => setHoveredOrb(null)}
          >
            {/* Pulsating Glowing Outer Ring */}
            <div className="relative flex items-center justify-center">
              <div
                className={`absolute w-7 h-7 rounded-full opacity-35 animate-ping ${colorClass}`}
                style={{ animationDuration: '3s' }}
              />
              <div
                className={`absolute w-12 h-12 rounded-full opacity-10 blur-md ${colorClass}`}
              />
              
              {/* Core Orb Indicator */}
              <button
                aria-label={`Orb for user from ${orb.country}`}
                className={`w-3.5 h-3.5 rounded-full border border-white dark:border-black/40 shadow-lg cursor-pointer transition-transform duration-300 transform group-hover:scale-150 relative z-20 ${colorClass}`}
              />

              {/* Tiny identity indicator if it represents the user themselves */}
              {isMe && (
                <span className="absolute -bottom-4 font-mono text-[9px] text-gray-400 dark:text-gray-500 tracking-wider">
                  you
                </span>
              )}
            </div>

            {/* Hover Tooltip / Interactive Glass Popover */}
            <div
              className={`absolute top-6 left-1/2 -translate-x-1/2 w-48 p-3 rounded-xl backdrop-blur-lg bg-white/70 dark:bg-black/65 border border-white/20 dark:border-stone-800/60 shadow-xl transition-all duration-300 z-30 pointer-events-none ${
                isHovered ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-2'
              }`}
            >
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-gray-900 dark:text-stone-100 truncate max-w-[100px]">
                    {orb.country}
                  </span>
                  {isMe && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-none">
                      me
                    </span>
                  )}
                </div>
                
                <span className="text-[11px] font-medium text-gray-500 dark:text-stone-400 capitalize">
                  {getMoodEmoji(orb.mood)}
                </span>
                
                <p className="text-[10px] leading-relaxed text-gray-400 dark:text-stone-500 line-clamp-2">
                  {formatSoundsList(orb.activeSounds)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
