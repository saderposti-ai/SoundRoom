import React, { useEffect, useRef } from 'react';
import { SoundId, RoomThemeId } from '../types';

interface ParticleLayerProps {
  activeSounds: SoundId[];
  themeId: RoomThemeId;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  type: 'rain' | 'ember' | 'steam' | 'dust' | 'theme-dust' | 'dream-bubble' | 'spark';
}

export default function ParticleLayer({ activeSounds, themeId }: ParticleLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    // Fit canvas to display width
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const isRainActive = activeSounds.includes('rain') || activeSounds.includes('thunder');
    const isFireActive = activeSounds.includes('fireplace');
    const isCafeActive = activeSounds.includes('cafe');

    // Update and draw particles loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Spawning new particles based on active atmosphere generators
      if (isRainActive && Math.random() < 0.35) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -10,
          vx: (Math.random() * 0.5 - 0.25) - 0.5, // slight diagonal slant
          vy: 8 + Math.random() * 6,
          size: 1 + Math.random() * 1.5,
          alpha: 0.15 + Math.random() * 0.4,
          life: 0,
          maxLife: 200,
          color: 'rgba(156, 163, 175, ',
          type: 'rain',
        });
      }

      if (isFireActive && Math.random() < 0.25) {
        particles.push({
          x: Math.random() * canvas.width,
          y: canvas.height + 10,
          vx: Math.random() * 2 - 1.0,
          vy: -(1.5 + Math.random() * 2),
          size: 1.5 + Math.random() * 2.5,
          alpha: 0.4 + Math.random() * 0.5,
          life: 0,
          maxLife: 80 + Math.random() * 80,
          color: 'rgba(249, 115, 22, ', // Orange fiery glow
          type: 'ember',
        });
      }

      if (isCafeActive && Math.random() < 0.12) {
        particles.push({
          x: (0.2 + Math.random() * 0.6) * canvas.width,
          y: canvas.height + 10,
          vx: (Math.random() * 0.8 - 0.4),
          vy: -(0.6 + Math.random() * 0.5),
          size: 3 + Math.random() * 5,
          alpha: 0.08 + Math.random() * 0.12,
          life: 0,
          maxLife: 150 + Math.random() * 100,
          color: 'rgba(245, 158, 11, ', // Warm yellow ambient steam
          type: 'steam',
        });
      }

      // 2. Spawn customized atmospheric background theme particles based on active vibe
      const spawnChance = themeId === 'storm' ? 0.08 : themeId === 'dreamy' ? 0.06 : 0.05;
      const maxThemeParticles = themeId === 'dreamy' ? 60 : 100;

      if (Math.random() < spawnChance && particles.filter(p => p.type.startsWith('theme') || p.type === 'dream-bubble' || p.type === 'spark').length < maxThemeParticles) {
        let px = Math.random() * canvas.width;
        let py = Math.random() * canvas.height;
        let vx = (Math.random() * 0.4 - 0.2);
        let vy = (Math.random() * 0.4 - 0.2);
        let size = 1.0 + Math.random() * 2.0;
        let alpha = 0.05 + Math.random() * 0.15;
        let color = 'rgba(255, 255, 255, ';
        let type: 'theme-dust' | 'dream-bubble' | 'spark' = 'theme-dust';
        let maxLife = 180 + Math.random() * 180;

        switch (themeId) {
          case 'rainy':
            // Slow falling cool blue drops
            vy = 0.3 + Math.random() * 0.6;
            vx = -0.1 - Math.random() * 0.2;
            size = 1.2 + Math.random() * 1.5;
            alpha = 0.1 + Math.random() * 0.25;
            color = 'rgba(96, 165, 250, '; // Cool blue
            break;
          case 'cafe':
            // Floating warm beverage dust / mini embers drifting upwards
            vy = -0.2 - Math.random() * 0.4;
            vx = (Math.random() * 0.3 - 0.15);
            size = 1.0 + Math.random() * 2.0;
            alpha = 0.08 + Math.random() * 0.16;
            color = 'rgba(245, 158, 11, '; // Warm amber
            break;
          case 'latenight':
            // Twinkling purple / lavender tiny neon star points
            vx = (Math.random() * 0.2 - 0.1);
            vy = (Math.random() * 0.2 - 0.1);
            size = 1.0 + Math.random() * 1.8;
            alpha = 0.15 + Math.random() * 0.3;
            color = 'rgba(168, 85, 247, '; // Purple neon star dust
            type = 'spark';
            maxLife = 100 + Math.random() * 120;
            break;
          case 'nature':
            // Fluttering organic green leaf-like floaters (leaf-colored)
            vy = 0.1 + Math.random() * 0.3;
            vx = Math.sin(Date.now() / 1000) * 0.2 + (Math.random() * 0.3 - 0.15);
            size = 1.5 + Math.random() * 2.5;
            alpha = 0.08 + Math.random() * 0.2;
            color = 'rgba(16, 185, 129, '; // Forest green
            break;
          case 'storm':
            // High energy fast electric blue sparks popping and vanishing
            vx = (Math.random() * 4.0 - 2.0);
            vy = (Math.random() * 4.0 - 2.0);
            size = 1.2 + Math.random() * 2.2;
            alpha = 0.3 + Math.random() * 0.4;
            color = 'rgba(6, 182, 212, '; // Electric cyan spark
            type = 'spark';
            maxLife = 15 + Math.random() * 30; // Extremely short flash-pop
            break;
          case 'dreamy':
            // Broad blur highlight circles (soft bloom effect)
            vx = (Math.random() * 0.15 - 0.075);
            vy = -0.1 - Math.random() * 0.25; // float slow upwards
            size = 4.0 + Math.random() * 8.0; // Large and fuzzy
            alpha = 0.03 + Math.random() * 0.06; // Very low contrast bloom
            color = 'rgba(244, 114, 182, '; // Dreamy soft pink
            type = 'dream-bubble';
            maxLife = 240 + Math.random() * 180;
            break;
        }

        particles.push({
          x: px,
          y: py,
          vx,
          vy,
          size,
          alpha,
          life: 0,
          maxLife,
          color,
          type,
        });
      }

      // 3. Painting and animating each single particle
      particles = particles.filter(p => {
        if (p.type === 'rain' && !isRainActive) return false;
        if (p.type === 'ember' && !isFireActive) return false;
        if (p.type === 'steam' && !isCafeActive) return false;

        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // Calculate opacity based on life progression (fade in/out)
        let opacity = p.alpha;
        if (p.life < 15) {
          opacity = p.alpha * (p.life / 15);
        } else if (p.life > p.maxLife - 25) {
          opacity = p.alpha * ((p.maxLife - p.life) / 25);
        }

        if (opacity < 0) opacity = 0;

        ctx.beginPath();
        if (p.type === 'rain') {
          // Draw thin rain streaking line
          ctx.strokeStyle = p.color + opacity + ')';
          ctx.lineWidth = 1;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 1.5, p.y + p.vy * 1.5);
          ctx.stroke();
        } else if (p.type === 'dream-bubble') {
          // Draw soft blurry circles (bloom bloom)
          const radGrd = ctx.createRadialGradient(p.x, p.y, p.size * 0.1, p.x, p.y, p.size);
          radGrd.addColorStop(0, p.color + opacity + ')');
          radGrd.addColorStop(0.3, p.color + opacity * 0.4 + ')');
          radGrd.addColorStop(1, p.color + '0)');
          
          ctx.fillStyle = radGrd;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'spark') {
          // Draw star-like glowing cross or glowing diamond
          ctx.fillStyle = p.color + opacity + ')';
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          // Subtle neon light glow streak
          ctx.strokeStyle = p.color + opacity * 0.5 + ')';
          ctx.lineWidth = 1;
          ctx.moveTo(p.x - p.size * 1.8, p.y);
          ctx.lineTo(p.x + p.size * 1.8, p.y);
          ctx.moveTo(p.x, p.y - p.size * 1.8);
          ctx.lineTo(p.x, p.y + p.size * 1.8);
          ctx.stroke();
        } else {
          // Draw default circle particle
          ctx.fillStyle = p.color + opacity + ')';
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Keep particle if it's within boundary and lifetime is active
        return (
          p.life < p.maxLife &&
          p.x >= -30 &&
          p.x <= canvas.width + 30 &&
          p.y >= -30 &&
          p.y <= canvas.height + 30
        );
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [activeSounds, themeId]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none z-1"
    />
  );
}
