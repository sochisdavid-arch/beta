
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Baby, Component, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { format, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCollection, useUser, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const pigBreeds = ["Duroc", "Yorkshire", "Landrace", "Hampshire", "Pietrain", "PIC", "Topigs Norsvin", "Otro"];

export default function LactationPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const [farmId, setFarmId] = React.useState<string | null>(null);

    React.useEffect(() => {
        const stored = localStorage.getItem('farmInformation');
        if (stored) setFarmId(JSON.parse(stored).id);
    }, []);

    const pigsQuery = useMemoFirebase(() => {
        if (!db || !farmId) return null;
        return collection(db, 'farms', farmId, 'pigs');
    }, [farmId]);

    const { data: allPigs, isLoading } = useCollection<any>(pigsQuery);

    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingPig, setEditingPig] = React.useState<any | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [pigToDelete, setPigToDelete] = React.useState<any | null>(null);

    const lactatingSows = React.useMemo(() => {
        if (!allPigs) return [];
        return allPigs.filter(p => p.status === 'Lactante');
    }, [allPigs]);

    const getParityData = (pig: any) => {
        const partoEvents = pig.events?.filter((e: any) => e.type === 'Parto') || [];
        const lastPartoEvent = partoEvents[0];

        if (!lastPartoEvent) {
            return { farrowingDate: null, liveBorn: 0, stillborn: 0, mummified: 0, currentPiglets: 0, parity: 0 };
        }

        const liveBorn = lastPartoEvent.liveBorn ?? 0;
        const lactationEvents = pig.events?.slice(0, pig.events.indexOf(lastPartoEvent)) || [];
        
        const deaths = lactationEvents.filter((e: any) => e.type === 'Muerte de Lechón').reduce((sum: number, e: any) => sum + (e.pigletCount || 0), 0);
        const adoptions = lactationEvents.filter((e: any) => e.type === 'Adopción de Lechón').reduce((sum: number, e: any) => sum + (e.pigletCount || 0), 0);
        const donations = lactationEvents.filter((e: any) => e.type === 'Donación de Lechón').reduce((sum: number, e: any) => sum + (e.pigletCount || 0), 0);
        
        return {
            farrowingDate: lastPartoEvent?.date,
            liveBorn: liveBorn,
            stillborn: lastPartoEvent.stillborn || 0,
            mummified: lastPartoEvent.mummified || 0,
            currentPiglets: liveBorn - deaths - donations + adoptions,
            parity: partoEvents.length,
        };
    };

    const handleAnimalFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!farmId || !user) return;

        const formData = new FormData(event.currentTarget);
        const pigId = formData.get('id') as string;
        
        const pigData = {
            id: pigId,
            farmId: farmId,
            breed: formData.get('breed') as string,
            gender: formData.get('gender') as string,
            birthDate: formData.get('birthDate') as string,
            arrivalDate: formData.get('arrivalDate') as string,
            weight: Number(formData.get('weight')),
            status: editingPig?.status || 'Lactante',
            members: { [user.uid]: 'owner' },
            events: editingPig?.events || [],
            lastEvent: editingPig?.lastEvent || { type: 'Ninguno', date: '' },
        };

        const pigRef = doc(db, 'farms', farmId, 'pigs', pigId);
        setDocumentNonBlocking(pigRef, pigData, { merge: true });

        toast({ title: "Animal Actualizado", description: `Los datos de ${pigId} se han guardado en la nube.` });
        setIsFormOpen(false);
        setEditingPig(null);
    };

    const handleDeleteConfirm = () => {
        if (pigToDelete && farmId) {
            const pigRef = doc(db, 'farms', farmId, 'pigs', pigToDelete.id);
            deleteDocumentNonBlocking(pigRef);
            toast({ title: "Eliminado", description: "Animal borrado de la nube.", variant: "destructive" });
        }
        setIsDeleteDialogOpen(false);
    };

    const totalPiglets = lactatingSows.reduce((sum, sow) => sum + getParityData(sow).currentPiglets, 0);

    if (isLoading) return <AppLayout><div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div></AppLayout>;

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <h1 className="text-3xl font-bold tracking-tight">Cerdas en Lactancia (Nube)</h1>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Madres Lactando</CardTitle>
                            <Component className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{lactatingSows.length}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Lechones</CardTitle>
                            <Baby className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{totalPiglets}</div></CardContent>
                    </Card>
                </div>
                
                <Card>
                    <CardHeader><CardTitle>Listado de Cerdas</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID Cerda</TableHead>
                                    <TableHead>Fecha Parto</TableHead>
                                    <TableHead className="text-center">Nº Parto</TableHead>
                                    <TableHead className="text-center">Nacidos Vivos</TableHead>
                                    <TableHead className="text-center font-bold">Actuales</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lactatingSows.map((pig) => {
                                    const parityData = getParityData(pig);
                                    return (
                                        <TableRow key={pig.id} onClick={() => router.push(`/lactation/${pig.id}`)} className="cursor-pointer">
                                            <TableCell className="font-medium">{pig.id}</TableCell>
                                            <TableCell>{parityData.farrowingDate ? format(parseISO(parityData.farrowingDate), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                            <TableCell className="text-center">{parityData.parity}</TableCell>
                                            <TableCell className="text-center">{parityData.liveBorn}</TableCell>
                                            <TableCell className="text-center font-bold">{parityData.currentPiglets}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => { setEditingPig(pig); setIsFormOpen(true); }}>Editar</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => { setPigToDelete(pig); setIsDeleteDialogOpen(true); }} className="text-red-500">Eliminar</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Editar Madre</DialogTitle></DialogHeader>
                        <form onSubmit={handleAnimalFormSubmit} className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>ID</Label>
                                <Input name="id" required defaultValue={editingPig?.id} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>Raza</Label>
                                <Select name="breed" required defaultValue={editingPig?.breed}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{pigBreeds.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Género</Label>
                                <RadioGroup name="gender" defaultValue={editingPig?.gender || "Hembra"} className="flex gap-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="Hembra" id="female" /><Label htmlFor="female">Hembra</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="Macho" id="male" /><Label htmlFor="male">Macho</Label></div>
                                </RadioGroup>
                            </div>
                            <DialogFooter><Button type="submit">Guardar Cambios</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>¿Eliminar animal?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteConfirm}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
