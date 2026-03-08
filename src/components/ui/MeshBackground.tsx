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
        className="absolute top-[-5%] left-[-5%] w-[60%] md:w-[45%] h-[60%] md:h-[45%] bg-primary/15 blur-[40px] md:blur-[120px] rounded-full animate-float will-change-transform translate-z-0"
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
        className="absolute bottom-[10%] right-[-10%] w-[50%] md:w-[40%] h-[50%] md:h-[40%] bg-primary/10 blur-[30px] md:blur-[80px] rounded-full will-change-transform translate-z-0"
      />

      <div className="absolute top-[15%] right-[5%] w-[45%] md:w-[35%] h-[45%] md:h-[35%] bg-white/5 blur-[30px] md:blur-[80px] rounded-full animate-pulse-slow will-change-transform translate-z-0" />

      {/* Noise Texture Overlay - Hardware Accelerated */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] translate-z-0" />
    </div>
  );
}
