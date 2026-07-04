import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ShieldCheck, User as UserIcon } from 'lucide-react';
import type { User } from '../../types';

interface LanyardProps {
  user: User;
  isAdmin?: boolean;
}

const Lanyard: React.FC<LanyardProps> = ({ user, isAdmin }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!containerRef.current || !pathRef.current || !badgeRef.current) return;

    const points = 15;
    const stringLength = 150; // Shorter string for better profile layout
    const segmentLength = stringLength / points;

    let pts: { x: number; y: number; oldX: number; oldY: number; pinned: boolean }[] = [];
    
    // Initialize points
    for (let i = 0; i < points; i++) {
      pts.push({
        x: 0,
        y: i * segmentLength,
        oldX: 0,
        oldY: i * segmentLength,
        pinned: i === 0,
      });
    }

    let isDragging = false;
    let dragPos = { x: 0, y: 0 };
    
    // Initial drop animation offset
    pts.forEach(p => {
        if (!p.pinned) {
            p.x = (Math.random() - 0.5) * 50;
            p.oldX = p.x - (Math.random() - 0.5) * 10;
        }
    });

    const updatePhysics = () => {
      // Verlet integration
      for (let i = 0; i < points; i++) {
        let p = pts[i];
        if (!p.pinned) {
          let vx = (p.x - p.oldX) * 0.96; // friction
          let vy = (p.y - p.oldY) * 0.96;
          p.oldX = p.x;
          p.oldY = p.y;
          p.x += vx;
          p.y += vy;
          p.y += 0.8; // gravity
        }
      }

      // Interaction
      if (isDragging) {
        pts[points - 1].x += (dragPos.x - pts[points - 1].x) * 0.2;
        pts[points - 1].y += (dragPos.y - pts[points - 1].y) * 0.2;
      } else {
         // Add subtle sway
         pts[points - 1].x += Math.sin(Date.now() * 0.002) * 0.1;
      }

      // Constrain
      for (let iter = 0; iter < 8; iter++) {
        for (let i = 0; i < points - 1; i++) {
          let p1 = pts[i];
          let p2 = pts[i + 1];
          let dx = p2.x - p1.x;
          let dy = p2.y - p1.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          let diff = (segmentLength - dist) / dist;
          let offsetX = dx * diff * 0.5;
          let offsetY = dy * diff * 0.5;

          if (!p1.pinned) {
            p1.x -= offsetX;
            p1.y -= offsetY;
          }
          if (!p2.pinned) {
            p2.x += offsetX;
            p2.y += offsetY;
          }
        }
      }

      // Draw string path using bezier curves
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < points; i++) {
          d += ` L ${pts[i].x} ${pts[i].y}`;
      }
      pathRef.current!.setAttribute('d', d);

      // Update badge transform
      const lastPoint = pts[points - 1];
      const prevPoint = pts[points - 2];
      
      // Calculate rotation based on the last segment
      let angle = Math.atan2(lastPoint.y - prevPoint.y, lastPoint.x - prevPoint.x);
      // convert to degrees and adjust (straight down is 90 deg)
      let deg = (angle * 180) / Math.PI - 90;
      
      gsap.set(badgeRef.current, {
        x: lastPoint.x,
        y: lastPoint.y - 12, // Offset so the rope goes into the badge hole
        rotation: deg,
        transformOrigin: "50% 12px" // Rotate around the hole
      });

      animationRef.current = requestAnimationFrame(updatePhysics);
    };

    updatePhysics();

    let cachedRect: DOMRect | null = null;
    
    // Mouse handlers
    const handlePointerDown = (e: PointerEvent) => {
      cachedRect = containerRef.current!.getBoundingClientRect();
      const bx = e.clientX - cachedRect.left;
      const by = e.clientY - cachedRect.top;
      
      // check if clicking near the badge
      const last = pts[points-1];
      const dist = Math.hypot(bx - last.x, by - last.y);
      
      if (dist < 100) {
          isDragging = true;
          dragPos.x = bx;
          dragPos.y = by;
          document.body.style.cursor = 'grabbing';
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !cachedRect) return;
      dragPos.x = e.clientX - cachedRect.left;
      dragPos.y = e.clientY - cachedRect.top;
    };

    const handlePointerUp = () => {
      isDragging = false;
      document.body.style.cursor = 'default';
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute left-1/2 top-full mt-1 w-0 h-0 pointer-events-none hidden md:block z-[100] overflow-visible"
    >
      <svg className="absolute top-0 left-[-200px] w-[400px] h-[400px] overflow-visible" viewBox="-200 0 400 400">
        <path
          ref={pathRef}
          className="stroke-primary/80"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Clip at top */}
        <circle cx="0" cy="0" r="4" className="fill-primary/80" />
      </svg>
      
      <div 
        ref={badgeRef}
        className="absolute pointer-events-auto cursor-grab active:cursor-grabbing"
        style={{ left: 0, top: 0, marginLeft: '-70px' }}
      >
        <div className="w-[140px] h-[200px] bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl shadow-xl border border-white/20 dark:border-gray-700/50 flex flex-col items-center pt-8 pb-4 px-3 overflow-hidden relative hover:scale-[1.02] transition-transform duration-200">
          
          {/* Badge Hole */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full bg-black/10 dark:bg-black/30 border border-black/5 dark:border-white/10 shadow-inner" />
          
          {/* Accent Header */}
          <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-r from-primary to-accent opacity-20" />
          
          <div className="relative w-16 h-16 rounded-full border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-3 shadow-sm z-10 overflow-hidden">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-8 h-8 text-primary" />
            )}
          </div>
          
          <h3 className="text-sm font-bold text-center text-foreground leading-tight px-1 break-words line-clamp-2 w-full">
            {user?.name || user?.username || 'Student'}
          </h3>
          
          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
            {isAdmin ? 'Administrator' : 'Student ID'}
          </p>
          
          <div className="mt-auto flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
            {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            <span className="text-[10px] font-bold">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lanyard;
