
"use client";

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Syringe, Move, Banknote, PackagePlus, ShieldPlus, Skull, MoreHorizontal, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, parseISO, isValid } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useUser, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function LotePreceboDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const loteId = params.loteId as string;
    
    const [farmId, setFarmId] = React.useState<string | null>(null);
    const [isEventFormOpen, setIsEventFormOpen] = React.useState(false);
    const [selectedEventType, setSelectedEventType] = React.useState<string | null>(null);

    React.useEffect(() => {
        const stored = localStorage.getItem('farmInformation');
        if (stored) setFarmId(JSON.parse(stored).id);
    }, []);

    const batchRef = useMemoFirebase(() => {
        if (!db || !farmId || !loteId) return null;
        return doc(db, 'farms', farmId, 'batches', loteId);
    }, [farmId, loteId]);

    const { data: batch, isLoading } = useDoc<any>(batchRef);

    const handleEventSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!batch || !selectedEventType || !farmId) return;

        const formData = new FormData(e.target as HTMLFormElement);
        const newEvent = {
            id: `evt-${Date.now()}`,
            type: selectedEventType,
            date: formData.get('eventDate') as string,
            details: formData.get('details') as string || '',
            animalCount: Number(formData.get('animalCount')) || 0,
        };

        const updatedEvents = [newEvent, ...(batch.events || [])];
        updateDocumentNonBlocking(batchRef!, { events: updatedEvents });

        toast({ title: "Evento Guardado", description: "El evento se ha sincronizado en la nube." });
        setIsEventFormOpen(false);
    };

    if (isLoading) return <AppLayout><div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div></AppLayout>;
    if (!batch) return <AppLayout><div className="p-20 text-center">Lote no encontrado.</div></AppLayout>;

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
                    <h1 className="text-3xl font-bold tracking-tight">Detalle Lote: {batch.id}</h1>
                </div>

                <Card>
                    <CardHeader><CardTitle>Historial de Eventos (Nube)</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Detalles</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(batch.events || []).map((event: any) => (
                                    <TableRow key={event.id}>
                                        <TableCell>{format(parseISO(event.date), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>{event.type}</TableCell>
                                        <TableCell>{event.details || `Animales: ${event.animalCount}`}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
