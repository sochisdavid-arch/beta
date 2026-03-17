
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO, isValid } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Component, Users, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { useCollection, useUser, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

const KpiCard = ({ title, value, icon }: { title: string, value: number, icon: React.ReactElement }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

export default function PreceboPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const [farmId, setFarmId] = React.useState<string | null>(null);

    React.useEffect(() => {
        const stored = localStorage.getItem('farmInformation');
        if (stored) setFarmId(JSON.parse(stored).id);
    }, []);

    const batchesQuery = useMemoFirebase(() => {
        if (!firestore || !farmId) return null;
        return collection(firestore, 'farms', farmId, 'batches');
    }, [firestore, farmId]);

    const { data: batches, isLoading } = useCollection<any>(batchesQuery);

    const [isFormOpen, setIsFormOpen] = React.useState(false);

    const preceboBatches = React.useMemo(() => {
        if (!batches) return [];
        return batches.filter((b: any) => b.type === 'precebo' || !b.type); // retrocompatibility
    }, [batches]);

    const handleAddBatchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!farmId || !user || !firestore) return;

        const formData = new FormData(event.currentTarget);
        const batchId = formData.get('batchId') as string;
        
        const newBatch = {
            id: batchId,
            farmId,
            type: 'precebo',
            creationDate: formData.get('creationDate') as string,
            pigletCount: Number(formData.get('pigletCount')),
            initialPigletCount: Number(formData.get('pigletCount')),
            avgWeight: Number(formData.get('avgWeight')),
            totalWeight: Number(formData.get('pigletCount')) * Number(formData.get('avgWeight')),
            avgAge: Number(formData.get('avgAge')),
            status: 'Activo',
            events: [],
            members: { [user.uid]: 'owner' }
        };

        setDocumentNonBlocking(doc(firestore, 'farms', farmId, 'batches', batchId), newBatch, { merge: true });

        toast({ title: '¡Lote Creado!', description: `El lote ${batchId} se ha guardado en la nube.` });
        setIsFormOpen(false);
    }

    if (isLoading) return <AppLayout><div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div></AppLayout>;

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Lotes en Precebo (Nube)</h1>
                    <Button onClick={() => setIsFormOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Agregar Lote
                    </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                    <KpiCard title="Lotes Activos" value={preceboBatches.filter(b => b.status === 'Activo').length} icon={<Component className="h-4 w-4 text-muted-foreground"/>} />
                    <KpiCard title="Total de Lechones" value={preceboBatches.filter(b => b.status === 'Activo').reduce((sum, b) => sum + b.pigletCount, 0)} icon={<Users className="h-4 w-4 text-muted-foreground"/>} />
                </div>

                <Card>
                    <CardHeader><CardTitle>Listado de Lotes</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID del Lote</TableHead>
                                    <TableHead>Fecha Creación</TableHead>
                                    <TableHead>Nº Lechones</TableHead>
                                    <TableHead>Peso Prom. (kg)</TableHead>
                                    <TableHead>Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {preceboBatches.map(batch => (
                                    <TableRow key={batch.id} onClick={() => router.push(`/precebo/${batch.id}`)} className="cursor-pointer hover:bg-muted/50">
                                        <TableCell className="font-medium">{batch.id}</TableCell>
                                        <TableCell>{isValid(parseISO(batch.creationDate)) ? format(parseISO(batch.creationDate), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                        <TableCell>{batch.pigletCount}</TableCell>
                                        <TableCell>{Number(batch.avgWeight).toFixed(2)}</TableCell>
                                        <TableCell><Badge variant={batch.status === 'Activo' ? 'default' : 'secondary'}>{batch.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Nuevo Lote de Precebo</DialogTitle></DialogHeader>
                        <form onSubmit={handleAddBatchSubmit} className="space-y-4 py-4">
                            <div className="space-y-2"><Label>ID del Lote</Label><Input name="batchId" required placeholder="PRE-2024-01" /></div>
                            <div className="space-y-2"><Label>Fecha de Ingreso</Label><Input name="creationDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Nº de Lechones</Label><Input name="pigletCount" type="number" required /></div>
                                <div className="space-y-2"><Label>Edad Prom. (días)</Label><Input name="avgAge" type="number" required /></div>
                            </div>
                            <div className="space-y-2"><Label>Peso Promedio (kg)</Label><Input name="avgWeight" type="number" step="0.1" required /></div>
                            <DialogFooter><Button type="submit">Guardar en la Nube</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
