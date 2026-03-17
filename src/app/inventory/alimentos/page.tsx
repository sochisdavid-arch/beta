
"use client";

import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PlusCircle, ArrowUp, ArrowDown, Package, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO, isValid } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useUser, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AlimentosPage() {
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
    const [bags, setBags] = React.useState<number | string>('');
    const [kilosPerBag, setKilosPerBag] = React.useState<number | string>('');
    const [totalValue, setTotalValue] = React.useState<number | string>('');

    const alimentos = React.useMemo(() => (inventory || []).filter(item => item.category === 'alimento'), [inventory]);

    const totalKilos = React.useMemo(() => Number(bags) * Number(kilosPerBag) || 0, [bags, kilosPerBag]);
    const pricePerKg = React.useMemo(() => totalKilos > 0 ? Number(totalValue) / totalKilos : 0, [totalValue, totalKilos]);

    const handleAddSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!farmId || !user) return;

        const formData = new FormData(event.currentTarget);
        const productName = formData.get('productName') as string;
        
        const existingProduct = alimentos.find(item => item.name.toLowerCase() === productName.toLowerCase());
        const productId = existingProduct?.id || `ALIM-${Date.now()}`;

        const itemData = {
            id: productId,
            name: productName,
            category: 'alimento',
            stock: (existingProduct?.stock || 0) + totalKilos,
            farmId,
            members: { [user.uid]: 'owner' }
        };

        const transactionData = {
            id: `TRANS-${Date.now()}`,
            date: formData.get('entryDate') as string,
            type: 'expense',
            category: 'Compra de Alimento',
            amount: Number(totalValue),
            description: `Compra de ${productName}: ${totalKilos}kg`,
            farmId,
            members: { [user.uid]: 'owner' }
        };

        setDocumentNonBlocking(doc(db, 'farms', farmId, 'inventoryItems', productId), itemData, { merge: true });
        setDocumentNonBlocking(doc(db, 'farms', farmId, 'financialTransactions', transactionData.id), transactionData, { merge: true });

        toast({ title: 'Ingreso Registrado', description: `${totalKilos}kg de ${productName} añadidos a la nube.` });
        setIsFormOpen(false);
        setBags(''); setKilosPerBag(''); setTotalValue('');
    };

    if (isLoading) return <AppLayout><div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div></AppLayout>;

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.push('/inventory')}><ArrowLeft className="h-4 w-4" /></Button>
                        <h1 className="text-3xl font-bold tracking-tight">Inventario de Alimentos (Nube)</h1>
                    </div>
                    <Button onClick={() => setIsFormOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Registrar Ingreso</Button>
                </div>

                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Package className="text-blue-500"/>Stock Actual</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Stock (kg)</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {alimentos.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right font-semibold">{item.stock.toFixed(2)} kg</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader><DialogTitle>Registrar Ingreso de Alimento</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[70vh]">
                            <form onSubmit={handleAddSubmit} id="add-food-form" className="space-y-4 p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Fecha</Label><Input name="entryDate" type="date" required defaultValue={new Date().toISOString().substring(0, 10)} /></div>
                                    <div className="space-y-2"><Label>Nombre del Alimento</Label><Input name="productName" required /></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2"><Label>Bultos</Label><Input type="number" value={bags} onChange={e => setBags(e.target.value)} required /></div>
                                    <div className="space-y-2"><Label>kg / Bulto</Label><Input type="number" value={kilosPerBag} onChange={e => setKilosPerBag(e.target.value)} required /></div>
                                    <div className="space-y-2"><Label>Total kg</Label><Input value={totalKilos.toFixed(2)} disabled className="bg-muted" /></div>
                                </div>
                                <div className="space-y-2"><Label>Valor Total ($)</Label><Input type="number" value={totalValue} onChange={e => setTotalValue(e.target.value)} required /></div>
                                <DialogFooter><Button type="submit">Guardar en la Nube</Button></DialogFooter>
                            </form>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
