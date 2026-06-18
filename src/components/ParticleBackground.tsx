import React, { useEffect, useRef } from 'react';

export const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particles configuration
    const particles: Particle[] = [];
    const maxParticles = Math.min(100, Math.floor((width * height) / 10000)); // Responsive count
    const connectionDistance = 110;
    const mouseRadius = 160;

    const mouse = {
      x: null as number | null,
      y: null as number | null,
    };

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      isGold: boolean;
    }

    // Helper to generate a random particle
    const createParticle = (): Particle => {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4, // Slow drift
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.5 + 1.5,
        isGold: Math.random() > 0.4, // 60% Gold / Amber, 40% Blue/Slate
      };
    };

    // Initialize particles
    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle());
    }

    // Handle resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    // Handle mouse move
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Check current theme
      const isLight = document.body.classList.contains('light');
      
      // Update mix-blend-mode dynamically
      canvas.style.mixBlendMode = isLight ? 'normal' : 'screen';

      // Define colors based on theme
      // For light mode, use darker, more saturated colors for visibility
      // For dark mode, use brighter glowing colors
      const goldDotColor = isLight ? 'rgba(217, 119, 6, 0.45)' : 'rgba(245, 158, 11, 0.5)';
      const blueDotColor = isLight ? 'rgba(29, 78, 216, 0.45)' : 'rgba(59, 130, 246, 0.5)';
      
      const goldLineColor = isLight ? '217, 119, 6' : '245, 158, 11';
      const blueLineColor = isLight ? '29, 78, 216' : '59, 130, 246';

      // Update and draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Boundary collision
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Clamp inside bounds
        p.x = Math.max(0, Math.min(width, p.x));
        p.y = Math.max(0, Math.min(height, p.y));

        // Slight attraction to mouse
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseRadius) {
            // Soft pull effect
            const force = (mouseRadius - dist) / mouseRadius;
            p.x += (dx / dist) * force * 0.2;
            p.y += (dy / dist) * force * 0.2;
          }
        }

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.isGold ? goldDotColor : blueDotColor;
        ctx.fill();
      });

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            // Opacity falls off with distance
            const baseAlpha = isLight ? 0.32 : 0.24; // slightly higher base opacity in light mode
            const alpha = ((connectionDistance - dist) / connectionDistance) * baseAlpha;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            
            const rgb = p1.isGold ? goldLineColor : blueLineColor;
            ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
            ctx.lineWidth = isLight ? 0.9 : 0.8;
            ctx.stroke();
          }
        }

        // Connect to mouse
        if (mouse.x !== null && mouse.y !== null) {
          const dx = p1.x - mouse.x;
          const dy = p1.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouseRadius) {
            const baseMouseAlpha = isLight ? 0.45 : 0.35;
            const alpha = ((mouseRadius - dist) / mouseRadius) * baseMouseAlpha;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouse.x, mouse.y);
            
            const rgb = p1.isGold ? goldLineColor : blueLineColor;
            ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
            ctx.lineWidth = isLight ? 1.1 : 1.0;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};
