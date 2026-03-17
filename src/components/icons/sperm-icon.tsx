import * as React from 'react';
import { cn } from '@/lib/utils';

export function SpermIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      {...props}
    >
      <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M10 9v1.8c0 2.2-1.8 4-4 4s-4-1.8-4-4V9" />
      <path d="M2 9h1" />
    </svg>
  );
}
