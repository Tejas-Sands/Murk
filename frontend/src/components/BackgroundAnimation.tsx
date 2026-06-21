'use client';

import React, { useEffect, useRef } from 'react';

interface Wave {
  yFactor: number;
  amplitude: number;
  frequency: number;
  speed: number;
  hueOffset: number;
  opacity: number;
}

export default function BackgroundAnimation() {
  const canvasBgRef = useRef<HTMLCanvasElement>(null);
  const canvasFgRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false, radius: 180 });

  useEffect(() => {
    const canvasBg = canvasBgRef.current;
    const canvasFg = canvasFgRef.current;
    if (!canvasBg || !canvasFg) return;

    const ctxBg = canvasBg.getContext('2d');
    const ctxFg = canvasFg.getContext('2d');
    if (!ctxBg || !ctxFg) return;

    let animationFrameId: number;
    let width = (canvasBg.width = canvasFg.width = window.innerWidth);
    let height = (canvasBg.height = canvasFg.height = window.innerHeight);
    let time = 0;

    // Particle class for the foreground canvas (floats on top of glass)
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      type: 'indigo' | 'purple';

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.35; // slow organic drift
        this.vy = (Math.random() - 0.5) * 0.35;
        this.size = Math.random() * 2 + 1;
        this.type = Math.random() > 0.5 ? 'indigo' : 'purple';
      }

      update(w: number, h: number) {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce on boundaries with slight padding
        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;

        // Mouse interaction: push away gently
        if (mouseRef.current.active) {
          const dx = this.x - mouseRef.current.x;
          const dy = this.y - mouseRef.current.y;
          const dist = Math.hypot(dx, dy);
          
          if (dist < mouseRef.current.radius) {
            const force = (mouseRef.current.radius - dist) / mouseRef.current.radius;
            this.x += (dx / dist) * force * 1.5;
            this.y += (dy / dist) * force * 1.5;
          }
        }
      }

      draw(context: CanvasRenderingContext2D, currentHue: number) {
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        
        // Dynamically shift particle color based on background waves
        const hueOffset = this.type === 'indigo' ? -15 : 15;
        const particleHue = (currentHue + hueOffset + 360) % 360;
        
        context.fillStyle = `hsla(${particleHue}, 75%, 70%, 0.45)`;
        context.shadowBlur = 5;
        context.shadowColor = `hsla(${particleHue}, 75%, 70%, 0.3)`;
        context.fill();
        context.shadowBlur = 0; // Reset shadow
      }
    }

    // Initialize particles based on screen area
    const particleCount = Math.min(Math.round((width * height) / 12000), 100);
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Background glowing orbs (depth layer under the glass)
    const orbs = [
      { x: width * 0.2, y: height * 0.3, radius: 300, color: 'blue', speedX: 0.06, speedY: 0.04 },
      { x: width * 0.8, y: height * 0.7, radius: 350, color: 'pink', speedX: -0.05, speedY: -0.06 },
      { x: width * 0.5, y: height * 0.5, radius: 250, color: 'purple', speedX: 0.03, speedY: -0.03 },
    ];

    // Wave layers configuration
    const waves: Wave[] = [
      {
        yFactor: 0.65,
        amplitude: 75,
        frequency: 0.003,
        speed: 0.005,
        hueOffset: -20, // Indigo shift
        opacity: 0.32,
      },
      {
        yFactor: 0.5,
        amplitude: 95,
        frequency: 0.002,
        speed: -0.003, // Moves left
        hueOffset: 0,   // Purple center
        opacity: 0.26,
      },
      {
        yFactor: 0.35,
        amplitude: 60,
        frequency: 0.004,
        speed: 0.007,
        hueOffset: 20,  // Magenta shift
        opacity: 0.20,
      },
    ];

    const handleResize = () => {
      if (!canvasBg || !canvasFg) return;
      width = canvasBg.width = canvasFg.width = window.innerWidth;
      height = canvasBg.height = canvasFg.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Main composite rendering loop
    const render = () => {
      time += 1;

      // Cycle base hue slowly between 215 (cool blue) and 305 (magenta/purple)
      const baseHue = 260 + Math.sin(time * 0.003) * 45;

      // -------------------------------------------------------------
      // 1. RENDER BACKGROUND CANVAS (Waves + Orbs under the glass)
      // -------------------------------------------------------------
      ctxBg.fillStyle = 'rgba(2, 4, 10, 1)'; // Deep void black
      ctxBg.fillRect(0, 0, width, height);

      // Draw glowing deep orbs
      orbs.forEach((orb) => {
        orb.x += orb.speedX;
        orb.y += orb.speedY;

        // Wrap around viewport boundaries
        if (orb.x - orb.radius > width) orb.x = -orb.radius;
        else if (orb.x + orb.radius < 0) orb.x = width + orb.radius;
        if (orb.y - orb.radius > height) orb.y = -orb.radius;
        else if (orb.y + orb.radius < 0) orb.y = height + orb.radius;

        const orbHue = (baseHue + (orb.color === 'pink' ? 30 : -30) + 360) % 360;
        const gradient = ctxBg.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        gradient.addColorStop(0, `hsla(${orbHue}, 80%, 55%, 0.05)`);
        gradient.addColorStop(0.5, `hsla(${orbHue}, 75%, 45%, 0.02)`);
        gradient.addColorStop(1, 'transparent');
        ctxBg.fillStyle = gradient;
        ctxBg.beginPath();
        ctxBg.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctxBg.fill();
      });

      // Draw wave layers
      waves.forEach((wave) => {
        ctxBg.beginPath();
        const centerY = height * wave.yFactor;
        const waveHue = (baseHue + wave.hueOffset + 360) % 360;

        for (let x = 0; x <= width; x += 4) {
          const y1 = Math.sin(x * wave.frequency + time * wave.speed) * wave.amplitude;
          const y2 = Math.cos(x * (wave.frequency * 0.45) - time * (wave.speed * 0.25)) * (wave.amplitude * 0.4);
          const y = centerY + y1 + y2;

          if (x === 0) {
            ctxBg.moveTo(x, y);
          } else {
            ctxBg.lineTo(x, y);
          }
        }

        ctxBg.lineTo(width, height);
        ctxBg.lineTo(0, height);
        ctxBg.closePath();

        const grad = ctxBg.createLinearGradient(0, centerY - wave.amplitude * 1.5, 0, height);
        grad.addColorStop(0, `hsla(${waveHue}, 85%, 55%, ${wave.opacity})`);
        grad.addColorStop(0.5, `hsla(${waveHue - 15}, 80%, 40%, ${wave.opacity * 0.4})`);
        grad.addColorStop(1, 'rgba(2, 4, 10, 0)');

        ctxBg.fillStyle = grad;
        ctxBg.fill();
      });

      // -------------------------------------------------------------
      // 2. RENDER FOREGROUND CANVAS (Interactive particles on top of glass)
      // -------------------------------------------------------------
      ctxFg.clearRect(0, 0, width, height);

      // Draw mouse radial glow
      if (mouseRef.current.active) {
        const mouseGradient = ctxFg.createRadialGradient(
          mouseRef.current.x,
          mouseRef.current.y,
          0,
          mouseRef.current.x,
          mouseRef.current.y,
          mouseRef.current.radius
        );
        mouseGradient.addColorStop(0, `hsla(${baseHue}, 85%, 70%, 0.12)`);
        mouseGradient.addColorStop(0.5, `hsla(${baseHue + 20}, 75%, 60%, 0.04)`);
        mouseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctxFg.fillStyle = mouseGradient;
        ctxFg.beginPath();
        ctxFg.arc(mouseRef.current.x, mouseRef.current.y, mouseRef.current.radius, 0, Math.PI * 2);
        ctxFg.fill();
      }

      // Update and draw particles
      ctxFg.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update(width, height);
        p1.draw(ctxFg, baseHue);

        // Draw node connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

          if (dist < 110) {
            const alpha = ((110 - dist) / 110) * 0.15;
            const linkHue = (baseHue + 360) % 360;
            ctxFg.strokeStyle = `hsla(${linkHue}, 70%, 75%, ${alpha})`;
            ctxFg.beginPath();
            ctxFg.moveTo(p1.x, p1.y);
            ctxFg.lineTo(p2.x, p2.y);
            ctxFg.stroke();
          }
        }

        // Draw connection to mouse
        if (mouseRef.current.active) {
          const mDist = Math.hypot(p1.x - mouseRef.current.x, p1.y - mouseRef.current.y);
          if (mDist < mouseRef.current.radius) {
            const alpha = ((mouseRef.current.radius - mDist) / mouseRef.current.radius) * 0.25;
            const linkHue = (baseHue + 20) % 360;
            ctxFg.strokeStyle = `hsla(${linkHue}, 70%, 75%, ${alpha})`;
            ctxFg.beginPath();
            ctxFg.moveTo(p1.x, p1.y);
            ctxFg.lineTo(mouseRef.current.x, mouseRef.current.y);
            ctxFg.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
      {/* Background canvas (waves + deep glowing orbs) */}
      <canvas ref={canvasBgRef} className="absolute inset-0 w-full h-full" />

      {/* Crystal Glass frosted overlay that diffuses background waves */}
      <div
        className="absolute inset-0 bg-[#02040a]/40 backdrop-blur-[70px] saturate-[135%]"
        style={{
          // Linear light reflection for realistic glass sheet gloss + grid refraction
          backgroundImage: `
            linear-gradient(135deg, rgba(255, 255, 255, 0.015) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.005) 100%),
            linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 80px 80px, 80px 80px',
        }}
      >
        {/* Subtle camera lens glares on crystal glass */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30 animate-pulse"
          style={{
            background: 'radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.06) 0%, transparent 60%)',
            animationDuration: '8s',
          }}
        />

        {/* Diagonal specular light refraction lines */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute left-[20%] top-0 w-[1px] h-full bg-gradient-to-b from-white/20 via-white/2 to-transparent" />
          <div className="absolute right-[20%] top-0 w-[1px] h-full bg-gradient-to-b from-white/20 via-white/2 to-transparent" />
          <div className="absolute left-0 top-[25%] w-full h-[1px] bg-gradient-to-r from-white/10 via-white/1 to-transparent" />
          <div className="absolute left-0 bottom-[35%] w-full h-[1px] bg-gradient-to-r from-white/10 via-white/1 to-transparent" />
        </div>
      </div>

      {/* Foreground canvas (interactive node network floating on top of glass) */}
      <canvas ref={canvasFgRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
