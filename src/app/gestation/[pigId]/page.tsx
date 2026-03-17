
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
import {
    ArrowLeft,
    Loader2,
    Heart,
    HeartHandshake,
    Activity,
    Stethoscope,
    Syringe,
    Baby,
    TriangleAlert,
    Ban,
    DollarSign,
    Skull,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useMemoFirebase } from '@/firebase';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function PigHistoryPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const pigId = params.pigId as string;
    
    const [farmId, setFarmId] = React.useState<string | null>(null);
    const [isAddEventOpen, setIsAddEventOpen] = React.useState(false);
    const [newEventType, setNewEventType] = React.useState<string>("Inseminación");
    const [newEventDate, setNewEventDate] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
    const [newEventDetails, setNewEventDetails] = React.useState<string>("");
    const [newEventTime, setNewEventTime] = React.useState<string>("");
    const [newEventBoarId1, setNewEventBoarId1] = React.useState<string>("");
    const [newEventBoarId2, setNewEventBoarId2] = React.useState<string>("");
    const [newEventBoarId3, setNewEventBoarId3] = React.useState<string>("");
    const [newEventLiveBorn, setNewEventLiveBorn] = React.useState<string>("");
    const [newEventStillborn, setNewEventStillborn] = React.useState<string>("");
    const [newEventMummified, setNewEventMummified] = React.useState<string>("");
    const [newEventPigletCount, setNewEventPigletCount] = React.useState<string>("");
    const [newEventWeaningWeight, setNewEventWeaningWeight] = React.useState<string>("");
    const [newEventAmount, setNewEventAmount] = React.useState<string>("");
    const [isSavingEvent, setIsSavingEvent] = React.useState(false);
    
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

    const eventTypeOptions = [
        { id: 'Inseminación', icon: Heart, label: 'Inseminación' },
        { id: 'Monta Natural', icon: HeartHandshake, label: 'Monta Natural' },
        { id: 'Celo', icon: Activity, label: 'Celo' },
        { id: 'Tratamiento', icon: Stethoscope, label: 'Tratamiento' },
        { id: 'Vacunación', icon: Syringe, label: 'Vacunación' },
        { id: 'Parto', icon: Baby, label: 'Parto' },
        { id: 'Aborto', icon: TriangleAlert, label: 'Aborto' },
        { id: 'Descarte', icon: Ban, label: 'Descarte' },
        { id: 'Venta', icon: DollarSign, label: 'Venta' },
        { id: 'Muerte', icon: Skull, label: 'Muerte' },
    ] as const;

    const isBreedingEvent = newEventType === 'Inseminación' || newEventType === 'Monta Natural';

    const resetAddEventForm = () => {
        setNewEventType("Inseminación");
        setNewEventDate(new Date().toISOString().slice(0, 10));
        setNewEventDetails("");
        setNewEventTime("");
        setNewEventBoarId1("");
        setNewEventBoarId2("");
        setNewEventBoarId3("");
        setNewEventLiveBorn("");
        setNewEventStillborn("");
        setNewEventMummified("");
        setNewEventPigletCount("");
        setNewEventWeaningWeight("");
        setNewEventAmount("");
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pigRef) return;
        setIsSavingEvent(true);

        try {
            const isoDate = new Date(`${newEventDate}T${newEventTime || '12:00'}:00`).toISOString();
            const baseEvent: any = {
                id: `evt-${Date.now()}`,
                type: newEventType,
                date: isoDate,
                time: newEventTime || undefined,
                details: newEventDetails?.trim() || undefined,
            };

            if (isBreedingEvent) {
                baseEvent.boars = [
                    newEventBoarId1?.trim() || null,
                    newEventBoarId2?.trim() || null,
                    newEventBoarId3?.trim() || null,
                ].filter(Boolean);
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

            if (newEventType === 'Venta') {
                baseEvent.amount = newEventAmount ? Number(newEventAmount) : undefined;
            }

            await updateDoc(pigRef, {
                events: arrayUnion(baseEvent),
                lastEvent: { type: newEventType, date: isoDate },
            });

            toast({ title: "Evento registrado", description: "Se guardó correctamente." });
            setIsAddEventOpen(false);
            resetAddEventForm();
        } catch (error) {
            console.error('Error saving event:', error);
            toast({
                variant: 'destructive',
                title: 'No se pudo guardar',
                description: 'Revisa permisos/reglas de Firestore o tu conexión e inténtalo de nuevo.',
            });
        } finally {
            setIsSavingEvent(false);
        }
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
                                        <p className="text-sm text-muted-foreground">{event.date}{event.time ? ` · ${event.time}` : ''}</p>
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
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nuevo Evento</DialogTitle>
                        <DialogDescription>
                            Selecciona el tipo de evento y completa los campos.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddEvent} className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Tipo de Evento</Label>
                            <div className="flex flex-wrap gap-2">
                                {eventTypeOptions.map((opt) => {
                                    const Icon = opt.icon;
                                    const active = newEventType === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setNewEventType(opt.id)}
                                            className={[
                                                "w-[84px] rounded-lg border px-2 py-2 text-left text-xs",
                                                active ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/40",
                                            ].join(" ")}
                                        >
                                            <div className="flex items-center justify-between">
                                                <Icon className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="mt-1 font-medium">{opt.label}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="event-date">Fecha del Evento</Label>
                            <Input
                                id="event-date"
                                type="date"
                                value={newEventDate}
                                onChange={(ev) => setNewEventDate(ev.target.value)}
                                required
                            />
                        </div>

                        {isBreedingEvent && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="event-time">Hora *</Label>
                                    <Input
                                        id="event-time"
                                        type="time"
                                        placeholder="Ej: 08:30"
                                        value={newEventTime}
                                        onChange={(ev) => setNewEventTime(ev.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="event-boar-1">Macho 1 *</Label>
                                    <Input
                                        id="event-boar-1"
                                        value={newEventBoarId1}
                                        onChange={(ev) => setNewEventBoarId1(ev.target.value)}
                                        placeholder="ID o código Macho 1"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="event-boar-2">Macho 2 *</Label>
                                    <Input
                                        id="event-boar-2"
                                        value={newEventBoarId2}
                                        onChange={(ev) => setNewEventBoarId2(ev.target.value)}
                                        placeholder="ID o código Macho 2"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="event-boar-3">Macho 3 (Opcional)</Label>
                                    <Input
                                        id="event-boar-3"
                                        value={newEventBoarId3}
                                        onChange={(ev) => setNewEventBoarId3(ev.target.value)}
                                        placeholder="ID o código Macho 3"
                                    />
                                </div>
                            </>
                        )}

                        {newEventType === 'Celo' && (
                            <div className="grid gap-2">
                                <Label htmlFor="event-time">Hora *</Label>
                                <Input
                                    id="event-time"
                                    type="time"
                                    value={newEventTime}
                                    onChange={(ev) => setNewEventTime(ev.target.value)}
                                    required
                                />
                            </div>
                        )}

                        {newEventType === 'Venta' && (
                            <div className="grid gap-2">
                                <Label htmlFor="event-amount">Valor ($)</Label>
                                <Input
                                    id="event-amount"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={newEventAmount}
                                    onChange={(ev) => setNewEventAmount(ev.target.value)}
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
                            <Button type="submit" disabled={isSavingEvent}>
                                {isSavingEvent ? 'Guardando...' : 'Guardar evento'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
