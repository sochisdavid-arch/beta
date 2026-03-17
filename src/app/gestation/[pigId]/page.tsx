
"use client";

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Loader2 } from 'lucide-react';
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
    const [isAddEventOpen, setIsAddEventOpen] = React.useState(false);
    const [newEventType, setNewEventType] = React.useState<string>("Observación");
    const [newEventDate, setNewEventDate] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
    const [newEventDetails, setNewEventDetails] = React.useState<string>("");
    const [newEventBoarId, setNewEventBoarId] = React.useState<string>("");
    const [newEventLiveBorn, setNewEventLiveBorn] = React.useState<string>("");
    const [newEventStillborn, setNewEventStillborn] = React.useState<string>("");
    const [newEventMummified, setNewEventMummified] = React.useState<string>("");
    const [newEventPigletCount, setNewEventPigletCount] = React.useState<string>("");
    const [newEventWeaningWeight, setNewEventWeaningWeight] = React.useState<string>("");
    
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

    const resetAddEventForm = () => {
        setNewEventType("Observación");
        setNewEventDate(new Date().toISOString().slice(0, 10));
        setNewEventDetails("");
        setNewEventBoarId("");
        setNewEventLiveBorn("");
        setNewEventStillborn("");
        setNewEventMummified("");
        setNewEventPigletCount("");
        setNewEventWeaningWeight("");
    };

    const handleAddEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pigRef) return;

        const isoDate = new Date(`${newEventDate}T12:00:00`).toISOString();
        const baseEvent: any = {
            id: `evt-${Date.now()}`,
            type: newEventType,
            date: isoDate,
            details: newEventDetails?.trim() || undefined,
        };

        if (newEventType === 'Inseminación' || newEventType === 'Monta Natural') {
            baseEvent.boarId = newEventBoarId?.trim() || undefined;
        }

        if (newEventType === 'Parto') {
            baseEvent.liveBorn = newEventLiveBorn ? Number(newEventLiveBorn) : 0;
            baseEvent.stillborn = newEventStillborn ? Number(newEventStillborn) : 0;
            baseEvent.mummified = newEventMummified ? Number(newEventMummified) : 0;
        }

        if (newEventType === 'Destete') {
            baseEvent.pigletCount = newEventPigletCount ? Number(newEventPigletCount) : 0;
            baseEvent.weaningWeight = newEventWeaningWeight ? Number(newEventWeaningWeight) : undefined;
        }

        const nextEvents = [...(pig.events || []), baseEvent];
        updateDocumentNonBlocking(pigRef, {
            events: nextEvents,
            lastEvent: { type: newEventType, date: isoDate },
        });

        toast({ title: "Evento registrado", description: "El evento se guardó en la nube." });
        setIsAddEventOpen(false);
        resetAddEventForm();
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4 justify-between">
                    <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/gestation')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Hoja de Vida: {pig.id}</h1>
                    </div>
                    <Button onClick={() => setIsAddEventOpen(true)}>
                        Registrar evento
                    </Button>
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

            <Dialog
                open={isAddEventOpen}
                onOpenChange={(open) => {
                    setIsAddEventOpen(open);
                    if (!open) resetAddEventForm();
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar evento</DialogTitle>
                        <DialogDescription>
                            Agrega un evento a la hoja de vida del animal y guárdalo en la nube.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddEvent} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="event-type">Tipo</Label>
                            <select
                                id="event-type"
                                className="h-10 rounded-md border bg-background px-3 text-sm"
                                value={newEventType}
                                onChange={(ev) => setNewEventType(ev.target.value)}
                            >
                                <option value="Observación">Observación</option>
                                <option value="Tratamiento">Tratamiento</option>
                                <option value="Inseminación">Inseminación</option>
                                <option value="Monta Natural">Monta Natural</option>
                                <option value="Parto">Parto</option>
                                <option value="Destete">Destete</option>
                                <option value="Baja">Baja</option>
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="event-date">Fecha</Label>
                            <Input
                                id="event-date"
                                type="date"
                                value={newEventDate}
                                onChange={(ev) => setNewEventDate(ev.target.value)}
                                required
                            />
                        </div>

                        {(newEventType === 'Inseminación' || newEventType === 'Monta Natural') && (
                            <div className="grid gap-2">
                                <Label htmlFor="event-boar">ID Macho (opcional)</Label>
                                <Input
                                    id="event-boar"
                                    value={newEventBoarId}
                                    onChange={(ev) => setNewEventBoarId(ev.target.value)}
                                    placeholder="Ej: BOAR-001"
                                />
                            </div>
                        )}

                        {newEventType === 'Parto' && (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="event-liveborn">Nacidos vivos</Label>
                                    <Input id="event-liveborn" type="number" min={0} value={newEventLiveBorn} onChange={(ev) => setNewEventLiveBorn(ev.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="event-stillborn">Nacidos muertos</Label>
                                    <Input id="event-stillborn" type="number" min={0} value={newEventStillborn} onChange={(ev) => setNewEventStillborn(ev.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="event-mummified">Momias</Label>
                                    <Input id="event-mummified" type="number" min={0} value={newEventMummified} onChange={(ev) => setNewEventMummified(ev.target.value)} />
                                </div>
                            </div>
                        )}

                        {newEventType === 'Destete' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="event-piglets">Destetados</Label>
                                    <Input id="event-piglets" type="number" min={0} value={newEventPigletCount} onChange={(ev) => setNewEventPigletCount(ev.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="event-weight">Peso destete (kg, opcional)</Label>
                                    <Input id="event-weight" type="number" min={0} step="0.1" value={newEventWeaningWeight} onChange={(ev) => setNewEventWeaningWeight(ev.target.value)} />
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="event-details">Detalles (opcional)</Label>
                            <Textarea
                                id="event-details"
                                value={newEventDetails}
                                onChange={(ev) => setNewEventDetails(ev.target.value)}
                                placeholder="Notas, causa, tratamiento, etc."
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsAddEventOpen(false)}>Cancelar</Button>
                            <Button type="submit">Guardar evento</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
