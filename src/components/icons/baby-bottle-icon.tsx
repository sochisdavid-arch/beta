
import * as React from 'react';
import { cn } from '@/lib/utils';

export function BabyBottleIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
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
        <path d="M13.436 2.592a2.126 2.126 0 0 0-2.872 0L3 10.32V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9.68l-7.564-7.728Z" />
        <path d="M8 12h8" />
        <path d="M8 16h8" />
        <path d="M12 4v2" />
        <path d="M10.43 4.88a2.126 2.126 0 0 0 3.14 0" />
    </svg>
  );
}
