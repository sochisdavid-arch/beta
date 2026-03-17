
"use client";

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeft, PlusCircle, ChevronDown, MoreHorizontal, Loader2 } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useUser, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function PigHistoryPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const pigId = params.pigId as string;
    
    const [farmId, setFarmId] = React.useState<string | null>(null);
    
    React.useEffect(() => {
        const stored = localStorage.getItem('farmInformation');
        if (stored) setFarmId(JSON.parse(stored).id);
    }, []);

    // Hook de Firebase para obtener el animal específico
    const pigRef = useMemoFirebase(() => {
        if (!db || !farmId || !pigId) return null;
        return doc(db, 'farms', farmId, 'pigs', pigId);
    }, [farmId, pigId]);

    const { data: pig, isLoading } = useDoc<any>(pigRef);

    if (isLoading) return <AppLayout><div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div></AppLayout>;
    if (!pig) return <AppLayout><div className="p-20 text-center">Animal no encontrado.</div></AppLayout>;

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/gestation')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Hoja de Vida: {pig.id}</h1>
                </div>

                <Card>
                    <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div><Label>Raza</Label><p className="font-semibold">{pig.breed}</p></div>
                        <div><Label>Estado</Label><p><Badge>{pig.status}</Badge></p></div>
                        <div><Label>Peso Inicial</Label><p className="font-semibold">{pig.weight} kg</p></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Historial de Eventos</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {pig.events && pig.events.map((event: any, index: number) => (
                                <div key={`${event.id}-${index}`} className="flex gap-4 p-3 border rounded-lg bg-muted/30">
                                    <div className="flex-grow">
                                        <p className="font-bold">{event.type}</p>
                                        <p className="text-sm text-muted-foreground">{event.date}</p>
                                        <p className="text-sm mt-1">{event.details}</p>
                                    </div>
                                </div>
                            ))}
                            {(!pig.events || pig.events.length === 0) && (
                                <p className="text-muted-foreground text-center py-4">No hay eventos registrados en la nube.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
