import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse-slow rounded-md bg-muted/30 backdrop-blur-md glass animate-shimmer relative overflow-hidden',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
