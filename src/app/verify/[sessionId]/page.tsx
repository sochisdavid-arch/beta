
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyPage() {
    const router = useRouter();
    
    React.useEffect(() => {
        router.push('/dashboard');
    }, [router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <p>Redirigiendo...</p>
        </div>
    );
}
