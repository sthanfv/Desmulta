'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function MeshBackground() {
    return (
        <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
            {/* Primary Mesh Dots/Gradients */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2 }}
                className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-float"
            />

            <motion.div
                animate={{
                    x: [0, 40, 0],
                    y: [0, -60, 0],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute bottom-[20%] right-[-5%] w-[40%] h-[40%] bg-primary/10 blur-[100px] rounded-full"
            />

            <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-white/5 blur-[80px] rounded-full animate-pulse-slow" />

            {/* Noise Texture Overlay for iOS 17 Feel */}
            <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
    );
}
