
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PigDoctorPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground animate-pulse">Redirigiendo al panel de control...</p>
    </div>
  );
}
