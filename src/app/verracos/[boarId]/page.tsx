
"use client";

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, PlusCircle, Droplet, MoreHorizontal, Syringe, XCircle, HeartPulse, Loader2 } from 'lucide-react';
import { format, parseISO, isValid, differenceInWeeks } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDoc, useUser, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type BoarEventType = 'Ingreso' | 'Eyaculado' | 'Monta Natural' | 'Tratamiento' | 'Vacunación' | 'Venta' | 'Muerte';

const eventIcons: { [key in BoarEventType]: React.ReactElement } = {
    "Ingreso": <PlusCircle className="h-5 w-5 text-green-500" />,
    "Eyaculado": <Droplet className="h-5 w-5 text-blue-500" />,
    "Monta Natural": <HeartPulse className="h-5 w-5 text-pink-500" />,
    "Tratamiento": <Syringe className="h-5 w-5 text-red-500" />,
    "Vacunación": <Syringe className="h-5 w-5 text-green-500" />,
    "Venta": <XCircle className="h-5 w-5" />,
    "Muerte": <XCircle className="h-5 w-5 text-destructive" />,
};

const allEventTypes: BoarEventType[] = ["Eyaculado", "Monta Natural", "Tratamiento", "Vacunación", "Venta", "Muerte"];

export default function BoarHistoryPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { user } = useUser();
    const boarId = params.boarId as string;
    
    const [farmId, setFarmId] = React.useState<string | null>(null);
    const [isEventFormOpen, setIsEventFormOpen] = React.useState(false);
    const [selectedEventType, setSelectedEventType] = React.useState<BoarEventType | null>(null);

    React.useEffect(() => {
        const stored = localStorage.getItem('farmInformation');
        if (stored) setFarmId(JSON.parse(stored).id);
    }, []);

    const boarRef = useMemoFirebase(() => {
        if (!db || !farmId || !boarId) return null;
        return doc(db, 'farms', farmId, 'boars', boarId);
    }, [farmId, boarId]);

    const { data: boar, isLoading } = useDoc<any>(boarRef);

    const openEventDialog = (eventType: BoarEventType) => {
        setSelectedEventType(eventType);
        setIsEventFormOpen(true);
    };

    const handleEventSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!boar || !selectedEventType || !farmId) return;

        const formData = new FormData(e.target as HTMLFormElement);
        
        const newEvent = {
            id: `evt-${new Date().getTime()}`,
            type: selectedEventType,
            date: formData.get('eventDate') as string,
            details: formData.get('details') as string || '',
            doses: Number(formData.get('doses')) || 0,
            dilutedVolume: Number(formData.get('dilutedVolume')) || 0,
            concentration: Number(formData.get('concentration')) || 0,
            motility: Number(formData.get('motility')) || 0,
            sowId: formData.get('sowId') as string || '',
            mounts: Number(formData.get('mounts')) || 0,
            product: formData.get('product') as string || '',
            dose: Number(formData.get('dose')) || 0,
        };

        const updatedEvents = [newEvent, ...(boar.events || [])];
        const updateData: any = { events: updatedEvents };
        
        if (['Venta', 'Muerte'].includes(selectedEventType)) {
            updateData.status = selectedEventType === 'Venta' ? 'Vendido' : 'Inactivo';
        }
        
        updateDocumentNonBlocking(boarRef!, updateData);

        toast({ title: "Evento Registrado", description: "Historial actualizado en la nube." });
        setIsEventFormOpen(false);
    };
    
    if (isLoading) return <AppLayout><div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div></AppLayout>;
    if (!boar) return <AppLayout><div className="p-20 text-center">Verraco no encontrado.</div></AppLayout>;

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.push('/verracos')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight">Hoja de Vida: {boar.id}</h1>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4" /> Agregar Evento</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {allEventTypes.map(type => (
                                <DropdownMenuItem key={type} onSelect={() => openEventDialog(type)}>
                                    <div className="flex items-center gap-2">
                                        {eventIcons[type]}
                                        <span>{type}</span>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                 <Card>
                    <CardHeader>
                        <CardTitle>Información General</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1">
                            <Label>Raza</Label>
                            <p className="font-semibold">{boar.breed}</p>
                        </div>
                        <div className="space-y-1">
                            <Label>Edad</Label>
                            <p className="font-semibold">{differenceInWeeks(new Date(), parseISO(boar.birthDate))} semanas</p>
                        </div>
                         <div className="space-y-1">
                            <Label>Peso Actual</Label>
                            <p className="font-semibold">{boar.weight} kg</p>
                        </div>
                        <div className="space-y-1">
                            <Label>Estado</Label>
                            <p className="font-semibold">{boar.status}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Eventos (Nube)</CardTitle>
                    </CardHeader>
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
                                {(boar.events || []).map((event: any) => (
                                    <TableRow key={event.id}>
                                        <TableCell>{format(parseISO(event.date), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {eventIcons[event.type as BoarEventType]}
                                                <span>{event.type}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {event.type === 'Eyaculado'
                                             ? `Dosis: ${event.doses || 'N/A'}, Vol: ${event.dilutedVolume || 'N/A'}ml`
                                             : event.details || 'N/A'
                                            }
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isEventFormOpen} onOpenChange={setIsEventFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar Evento: {selectedEventType}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEventSubmit} id="event-form" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="eventDate">Fecha</Label>
                            <Input id="eventDate" name="eventDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                        </div>
                        {selectedEventType === 'Eyaculado' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="doses">Número de Dosis</Label>
                                    <Input id="doses" name="doses" type="number" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dilutedVolume">Vol. Diluido (ml)</Label>
                                    <Input id="dilutedVolume" name="dilutedVolume" type="number" />
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="details">Notas / Causa</Label>
                            <Textarea id="details" name="details" />
                        </div>
                    </form>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsEventFormOpen(false)}>Cancelar</Button>
                        <Button type="submit" form="event-form">Guardar en la Nube</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
