
"use client";

import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, PlusCircle, Scale, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useUser, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '$0';
    return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
};

export default function FinancePage() {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const [farmId, setFarmId] = React.useState<string | null>(null);

    React.useEffect(() => {
        const stored = localStorage.getItem('farmInformation');
        if (stored) setFarmId(JSON.parse(stored).id);
    }, []);

    const transactionsQuery = useMemoFirebase(() => {
        if (!firestore || !farmId) return null;
        return collection(firestore, 'farms', farmId, 'financialTransactions');
    }, [firestore, farmId]);

    const { data: transactions, isLoading } = useCollection<any>(transactionsQuery);

    const [filter, setFilter] = React.useState('all');
    const [isFormOpen, setIsFormOpen] = React.useState(false);

    const filteredTransactions = React.useMemo(() => {
        if (!transactions) return [];
        let temp = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (filter !== 'all') temp = temp.filter(t => t.type === filter);
        return temp;
    }, [transactions, filter]);

    const summary = React.useMemo(() => {
        if (!transactions) return { income: 0, expenses: 0, balance: 0 };
        return transactions.reduce((acc, t) => {
            if (t.type === 'income') acc.income += t.amount;
            else acc.expenses += t.amount;
            return acc;
        }, { income: 0, expenses: 0, balance: 0 });
    }, [transactions]);

    const handleTransactionSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!farmId || !user || !firestore) return;

        const formData = new FormData(event.currentTarget);
        const transactionId = `MANUAL-${Date.now()}`;

        const data = {
            id: transactionId,
            farmId,
            date: formData.get('date') as string,
            type: formData.get('type') as string,
            category: formData.get('category') as string,
            amount: Number(formData.get('amount')),
            description: formData.get('description') as string,
            members: { [user.uid]: 'owner' }
        };

        setDocumentNonBlocking(doc(firestore, 'farms', farmId, 'financialTransactions', transactionId), data, { merge: true });

        toast({ title: 'Movimiento Registrado', description: 'La transacción se ha guardado en la nube.' });
        setIsFormOpen(false);
    };

    if (isLoading) return <AppLayout><div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div></AppLayout>;

    return (
        <AppLayout>
            <div className="flex flex-col gap-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight">Análisis Financiero (Nube)</h1>
                    <Button onClick={() => setIsFormOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Agregar Movimiento</Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ingresos</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(summary.income)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Egresos</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(summary.expenses)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Saldo</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{formatCurrency(summary.income - summary.expenses)}</div></CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between">
                            <CardTitle>Historial de Transacciones</CardTitle>
                            <Select value={filter} onValueChange={setFilter}>
                                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    <SelectItem value="income">Ingresos</SelectItem>
                                    <SelectItem value="expense">Egresos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow><TableHead>Fecha</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransactions.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell>{format(parseISO(t.date), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell><div>{t.description}</div><div className="text-xs text-muted-foreground">{t.category}</div></TableCell>
                                        <TableCell className={`text-right font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Nuevo Movimiento</DialogTitle></DialogHeader>
                        <form onSubmit={handleTransactionSubmit} className="space-y-4">
                            <RadioGroup name="type" defaultValue="expense" className="flex gap-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="income" id="inc" /><Label htmlFor="income">Ingreso</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="expense" id="exp" /><Label htmlFor="expense">Egreso</Label></div>
                            </RadioGroup>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Fecha</Label><Input name="date" type="date" required defaultValue={new Date().toISOString().substring(0, 10)}/></div>
                                <div className="space-y-2"><Label>Monto</Label><Input name="amount" type="number" required /></div>
                            </div>
                            <div className="space-y-2"><Label>Categoría</Label><Input name="category" required placeholder="Ej: Servicios, Venta Lechones" /></div>
                            <div className="space-y-2"><Label>Descripción</Label><Textarea name="description" required /></div>
                            <DialogFooter><Button type="submit">Guardar</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
