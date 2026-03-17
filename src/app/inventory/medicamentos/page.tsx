
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, PlusCircle, Pill, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function MedicamentosPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const [farmId, setFarmId] = React.useState<string | null>(null);

    React.useEffect(() => {
        const stored = localStorage.getItem('farmInformation');
        if (stored) setFarmId(JSON.parse(stored).id);
    }, []);

    const inventoryQuery = useMemoFirebase(() => {
        if (!db || !farmId) return null;
        return collection(db, 'farms', farmId, 'inventoryItems');
    }, [farmId]);

    const { data: inventory, isLoading } = useCollection<any>(inventoryQuery);

    const [isFormOpen, setIsFormOpen] = React.useState(false);

    const medicamentos = React.useMemo(() => (inventory || []).filter(item => item.category === 'medicamento'), [inventory]);

    const handleAddSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!farmId || !user) return;

        const formData = new FormData(event.currentTarget);
        const name = formData.get('name') as string;
        const volume = Number(formData.get('volume'));
        
        const existing = medicamentos.find(m => m.name.toLowerCase() === name.toLowerCase());
        const productId = existing?.id || `MED-${Date.now()}`;

        const itemData = {
            id: productId,
            name,
            category: 'medicamento',
            stock: (existing?.stock || 0) + volume,
            farmId,
            members: { [user.uid]: 'owner' }
        };

        setDocumentNonBlocking(doc(db, 'farms', farmId, 'inventoryItems', productId), itemData, { merge: true });

        toast({ title: 'Medicamento Registrado', description: `${name} actualizado en la nube.` });
        setIsFormOpen(false);
    };

    if (isLoading) return <AppLayout><div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div></AppLayout>;

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.push('/inventory')}><ArrowLeft className="h-4 w-4" /></Button>
                        <h1 className="text-3xl font-bold tracking-tight">Inventario de Medicamentos (Nube)</h1>
                    </div>
                    <Button onClick={() => setIsFormOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Registrar Compra</Button>
                </div>

                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Pill className="text-red-500"/>Stock de Medicamentos</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Stock (ml)</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {medicamentos.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right font-semibold">{item.stock.toFixed(2)} ml</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Registrar Compra</DialogTitle></DialogHeader>
                        <form onSubmit={handleAddSubmit} className="space-y-4 py-4">
                            <div className="space-y-2"><Label>Nombre</Label><Input name="name" required /></div>
                            <div className="space-y-2"><Label>Cantidad (ml)</Label><Input name="volume" type="number" step="0.1" required /></div>
                            <DialogFooter><Button type="submit">Guardar</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
