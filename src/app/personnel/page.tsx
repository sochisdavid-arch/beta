
"use client";

import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useCollection, useUser, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function PersonnelPage() {
    const { toast } = useToast();
    const { user } = useUser();
    const [farmId, setFarmId] = React.useState<string | null>(null);

    React.useEffect(() => {
        const stored = localStorage.getItem('farmInformation');
        if (stored) setFarmId(JSON.parse(stored).id);
    }, []);

    const personnelQuery = useMemoFirebase(() => {
        if (!db || !farmId) return null;
        return collection(db, 'farms', farmId, 'personnel');
    }, [farmId]);

    const { data: personnelList, isLoading } = useCollection<any>(personnelQuery);

    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingPerson, setEditingPerson] = React.useState<any | null>(null);

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!farmId || !user) return;

        const formData = new FormData(event.currentTarget);
        const id = formData.get('id') as string;

        const personData = {
            id,
            farmId,
            name: formData.get('name') as string,
            role: formData.get('role') as string,
            phone: formData.get('phone') as string,
            email: formData.get('email') as string,
            hireDate: formData.get('hireDate') as string,
            status: editingPerson?.status || 'Activo',
            salary: Number(formData.get('salary')) || 0,
            members: { [user.uid]: 'owner' }
        };

        setDocumentNonBlocking(doc(db, 'farms', farmId, 'personnel', id), personData, { merge: true });

        toast({ title: editingPerson ? 'Personal Actualizado' : 'Personal Agregado', description: `${personData.name} se ha guardado en la nube.` });
        setIsFormOpen(false);
        setEditingPerson(null);
    };

    if (isLoading) return <AppLayout><div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div></AppLayout>;

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Personal (Nube)</h1>
                    <Button onClick={() => { setEditingPerson(null); setIsFormOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" /> Agregar Personal</Button>
                </div>

                <Card>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Cargo</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(personnelList || []).map(person => (
                                    <TableRow key={person.id}>
                                        <TableCell className="font-medium">{person.name}</TableCell>
                                        <TableCell>{person.role}</TableCell>
                                        <TableCell><Badge>{person.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingPerson(person); setIsFormOpen(true); }}><MoreHorizontal className="h-4 w-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{editingPerson ? 'Editar' : 'Agregar'} Empleado</DialogTitle></DialogHeader>
                        <form onSubmit={handleFormSubmit} className="space-y-4 py-4">
                            <div className="space-y-2"><Label>Nombre Completo</Label><Input name="name" required defaultValue={editingPerson?.name} /></div>
                            <div className="space-y-2"><Label>Identificación</Label><Input name="id" required defaultValue={editingPerson?.id} disabled={!!editingPerson} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Cargo</Label><Input name="role" required defaultValue={editingPerson?.role} /></div>
                                <div className="space-y-2"><Label>Sueldo</Label><Input name="salary" type="number" defaultValue={editingPerson?.salary} /></div>
                            </div>
                            <DialogFooter><Button type="submit">Guardar en la Nube</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
