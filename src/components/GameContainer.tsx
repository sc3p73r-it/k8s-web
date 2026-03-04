import React, { useRef, useEffect } from 'react';
import type { LevelId } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
// import { Ship, Anchor, Box, Server, Copy, Radio, DoorOpen, BookOpen } from 'lucide-react';

interface GameContainerProps {
  currentLevel: LevelId;
  children: React.ReactNode;
  onNavigate: (level: LevelId) => void;
}

// Levels metadata kept for potential future use or reference
// const levels: { id: LevelId; label: string; icon: React.ElementType }[] = [
//   { id: 'intro', label: 'The Old World', icon: BookOpen },
//   { id: 'containers', label: 'Shipping Containers', icon: Box },
//   { id: 'kubernetes-intro', label: 'The Captain', icon: Anchor },
//   { id: 'pods', label: 'The Pods', icon: Ship },
//   { id: 'nodes', label: 'The Ships (Nodes)', icon: Server },
//   { id: 'replicasets', label: 'The Fleet', icon: Copy },
//   { id: 'services', label: 'Communication', icon: Radio },
//   { id: 'ingress', label: 'The Port', icon: DoorOpen },
// ];

export const GameContainer: React.FC<GameContainerProps> = ({ currentLevel, children }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentLevel]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pdso-950 to-slate-900 text-pdso-50 font-sans overflow-hidden flex flex-col">
      <div className="p-4 border-b border-pdso-700/40 bg-slate-900/70 backdrop-blur-sm flex justify-between items-center z-20">
        <h1 className="text-xl font-bold bg-gradient-to-r from-pdso-300 via-cyan-300 to-amber-300 bg-clip-text text-transparent">
          K8s Demo
        </h1>
        <span className="text-xs uppercase tracking-[0.2em] text-pdso-200/80">Interactive Lab</span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-8 relative z-10"
        >
          <div className="max-w-6xl mx-auto min-h-full flex flex-col items-center py-12">
             <AnimatePresence mode="wait">
                <motion.div
                  key={currentLevel}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="w-full"
                >
                  {children}
                </motion.div>
             </AnimatePresence>
          </div>
        </div>

        <div className="absolute inset-0 k8s-grid-bg pointer-events-none" />
        <div className="k8s-glow-orb absolute top-0 right-0 w-[28rem] h-[28rem] bg-cyan-400/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="k8s-glow-orb absolute bottom-0 left-0 w-[28rem] h-[28rem] bg-amber-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none [animation-delay:2s]" />
      </div>
    </div>
  );
};
