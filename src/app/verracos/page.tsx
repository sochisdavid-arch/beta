
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, User, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid, differenceInWeeks } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useUser, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const pigBreeds = ["Duroc", "Yorkshire", "Landrace", "Hampshire", "Pietrain", "PIC", "Topigs Norsvin", "Otro"];

export default function VerracosPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const [farmId, setFarmId] = React.useState<string | null>(null);

    React.useEffect(() => {
        const stored = localStorage.getItem('farmInformation');
        if (stored) setFarmId(JSON.parse(stored).id);
    }, []);

    const boarsQuery = useMemoFirebase(() => {
        if (!db || !farmId) return null;
        return collection(db, 'farms', farmId, 'boars');
    }, [farmId]);

    const { data: boars, isLoading } = useCollection<any>(boarsQuery);

    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingBoar, setEditingBoar] = React.useState<any | null>(null);

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!farmId || !user) return;

        const formData = new FormData(event.currentTarget);
        const id = formData.get('id') as string;

        const boarData = {
            id,
            farmId,
            breed: formData.get('breed') as string,
            birthDate: formData.get('birthDate') as string,
            arrivalDate: formData.get('arrivalDate') as string,
            weight: Number(formData.get('weight')),
            purchaseValue: Number(formData.get('purchaseValue')) || 0,
            status: editingBoar?.status || 'Activo',
            members: { [user.uid]: 'owner' },
            events: editingBoar?.events || [{ id: `evt-${Date.now()}`, type: 'Ingreso', date: formData.get('arrivalDate') as string, details: 'Ingreso inicial a la granja' }]
        };

        const boarRef = doc(db, 'farms', farmId, 'boars', id);
        setDocumentNonBlocking(boarRef, boarData, { merge: true });

        toast({ title: editingBoar ? 'Verraco Actualizado' : 'Verraco Agregado', description: `Los datos de ${id} se han guardado en la nube.` });
        setIsFormOpen(false);
        setEditingBoar(null);
    };

    if (isLoading) return <AppLayout><div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div></AppLayout>;

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Verracos (Nube)</h1>
                    <Button onClick={() => { setEditingBoar(null); setIsFormOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Agregar Verraco
                    </Button>
                </div>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Verracos Activos</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{(boars || []).filter(b => b.status === 'Activo').length}</div></CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID Verraco</TableHead>
                                    <TableHead>Raza</TableHead>
                                    <TableHead>Edad (Semanas)</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(boars || []).map(boar => (
                                    <TableRow key={boar.id} onClick={() => router.push(`/verracos/${boar.id}`)} className="cursor-pointer">
                                        <TableCell className="font-medium">{boar.id}</TableCell>
                                        <TableCell>{boar.breed}</TableCell>
                                        <TableCell>{differenceInWeeks(new Date(), parseISO(boar.birthDate))}</TableCell>
                                        <TableCell><Badge variant={boar.status === 'Activo' ? 'default' : 'secondary'}>{boar.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingBoar(boar); setIsFormOpen(true); }}><MoreHorizontal className="h-4 w-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{editingBoar ? 'Editar' : 'Agregar'} Verraco</DialogTitle></DialogHeader>
                        <form onSubmit={handleFormSubmit} className="space-y-4 py-4">
                            <div className="space-y-2"><Label>ID</Label><Input name="id" required defaultValue={editingBoar?.id} disabled={!!editingBoar} /></div>
                            <div className="space-y-2">
                                <Label>Raza</Label>
                                <Select name="breed" required defaultValue={editingBoar?.breed}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{pigBreeds.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Nacimiento</Label><Input name="birthDate" type="date" required defaultValue={editingBoar?.birthDate} /></div>
                                <div className="space-y-2"><Label>Peso (kg)</Label><Input name="weight" type="number" required defaultValue={editingBoar?.weight} /></div>
                            </div>
                            <DialogFooter><Button type="submit">Guardar en la Nube</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
