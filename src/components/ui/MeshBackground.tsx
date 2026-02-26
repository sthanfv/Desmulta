'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function MeshBackground() {
  return (
    <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none bg-background">
      {/* Primary Mesh Dots/Gradients - Optimized for Performance */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-primary/15 blur-[60px] md:blur-[120px] rounded-full animate-float will-change-transform"
      />

      <motion.div
        animate={{
          x: [0, 20, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[50px] md:blur-[100px] rounded-full will-change-transform"
      />

      <div className="absolute top-[15%] right-[5%] w-[35%] h-[35%] bg-white/5 blur-[40px] md:blur-[80px] rounded-full animate-pulse-slow will-change-transform" />

      {/* Noise Texture Overlay - Hardware Accelerated */}
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] translate-z-0" />
    </div>
  );
}
