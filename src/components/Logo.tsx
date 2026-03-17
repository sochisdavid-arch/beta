import * as React from 'react';
import { cn } from '@/lib/utils';

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      {...props}
    >
      <rect width="100" height="100" fill="none" />
      <path d="M 25,40 C 10,30 15,10 30,20 Z" fill="#f9a8d4" />
      <path d="M 75,40 C 90,30 85,10 70,20 Z" fill="#f9a8d4" />
      <circle cx="50" cy="55" r="35" fill="#fbcfe8" />
      <ellipse cx="50" cy="65" rx="18" ry="12" fill="#f472b6" />
      <circle cx="44" cy="65" r="3" fill="#ec4899" />
      <circle cx="56" cy="65" r="3" fill="#ec4899" />
      <circle cx="38" cy="50" r="4" fill="#1e293b" />
      <circle cx="62" cy="50" r="4" fill="#1e293b" />
    </svg>
  );
}
