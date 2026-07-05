'use client';

import * as React from 'react';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10 opacity-0" />;
  }

  const currentTheme = (theme === 'system' ? resolvedTheme : theme) as 'light' | 'dark';

  return (
    <div className="relative group rounded-full overflow-hidden border border-white/5 active:scale-90 transition-transform">
      <AnimatedThemeToggler 
        variant="circle" 
        theme={currentTheme}
        onThemeChange={setTheme}
        className="flex items-center justify-center rounded-full w-10 h-10 hover:bg-white/10 dark:hover:bg-black/20 transition-colors"
      />
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}
