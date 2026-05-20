import React, { useEffect, useState } from 'react';
import { RoomThemeId } from '../types';

interface AmbientBackgroundProps {
  themeId: RoomThemeId;
}

export default function AmbientBackground({ themeId }: AmbientBackgroundProps) {
  const [thunderFlash, setThunderFlash] = useState(false);

  // Sync to custom window event triggered by the AudioEngine thunder strikes!
  useEffect(() => {
    const handleThunder = (event: Event) => {
      // Trigger lightning double-flash
      setThunderFlash(true);
      setTimeout(() => setThunderFlash(false), 120);
      setTimeout(() => {
        setThunderFlash(true);
        setTimeout(() => setThunderFlash(false), 240);
      }, 250);
    };

    window.addEventListener('room_thunder_strike', handleThunder);
    return () => {
      window.removeEventListener('room_thunder_strike', handleThunder);
    };
  }, []);

  const getOrbColors = () => {
    switch (themeId) {
      case 'rainy':
        return { orb1: 'bg-[#3b82f6]/10', orb2: 'bg-[#1e40af]/10' };
      case 'cafe':
        return { orb1: 'bg-[#f59e0b]/15', orb2: 'bg-[#ea580c]/10' };
      case 'latenight':
        return { orb1: 'bg-[#a855f7]/15', orb2: 'bg-[#d946ef]/10' };
      case 'nature':
        return { orb1: 'bg-[#10b981]/15', orb2: 'bg-[#065f46]/10' };
      case 'storm':
        return { orb1: 'bg-[#06b6d4]/15', orb2: 'bg-[#475569]/10' };
      case 'dreamy':
        return { orb1: 'bg-[#ec4899]/15', orb2: 'bg-[#f472b6]/15' };
      default:
        return { orb1: 'bg-indigo-400/10', orb2: 'bg-rose-400/10' };
    }
  };

  const orbsType = getOrbColors();

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none z-0">
      {/* Primary Dynamic Gradient Canvas - uses CSS Variables that transition smoothly */}
      <div
        className="absolute inset-0 w-full h-full bg-gradient-to-tr from-[var(--theme-gradient-start)] to-[var(--theme-gradient-end)] transition-all duration-[2000ms] ease-in-out"
      />

      {/* Layer 2: Soft Floating Animated Colored Orbs */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen blur-[110px]">
        <div className={`absolute top-[10%] left-[15%] w-[40vw] h-[40vw] max-w-[450px] ${orbsType.orb1} rounded-full animate-float transition-all duration-[2000ms]`} />
        <div className={`absolute bottom-[20%] right-[10%] w-[35vw] h-[35vw] max-w-[400px] ${orbsType.orb2} rounded-full animate-float-delayed transition-all duration-[2000ms]`} />
      </div>

      {/* Lightning Strike Flash Overlay */}
      <div
        className={`absolute inset-0 bg-white transition-opacity duration-75 pointer-events-none ${
          thunderFlash ? 'opacity-85' : 'opacity-0'
        }`}
      />
    </div>
  );
}
