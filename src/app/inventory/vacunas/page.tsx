
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getInventory, updateInventory, InventoryItem, MedicalConsumptionRecord } from '@/lib/inventory';
import { ArrowLeft, PlusCircle, Syringe, ArrowDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isValid } from 'date-fns';

interface MedicalPurchaseRecord {
    id: string;
    productId: string;
    productName: string;
    purchaseDate: string;
    vials: number;
    volumePerVial: number; // Can be ml or doses
    totalVolume: number;
    valuePerVial: number;
    totalValue: number;
    valuePerUnit: number; // Value per ml or dose
    lotNumber?: string;
    icaRegistration?: string;
    manufacturingDate?: string;
    expirationDate?: string;
}

const MEDICAL_PURCHASE_HISTORY_KEY = 'medicalPurchaseHistory';
const MEDICAL_CONSUMPTION_HISTORY_KEY = 'medicalConsumptionHistory';

export default function VacunasPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [vacunas, setVacunas] = React.useState<InventoryItem[]>([]);
    const [purchaseHistory, setPurchaseHistory] = React.useState<MedicalPurchaseRecord[]>([]);
    const [consumptionHistory, setConsumptionHistory] = React.useState<MedicalConsumptionRecord[]>([]);
    const [isFormOpen, setIsFormOpen] = React.useState(false);

    // Form states for automatic calculation
    const [selectedProduct, setSelectedProduct] = React.useState<string>('');
    const [newProductName, setNewProductName] = React.useState('');
    const [vials, setVials] = React.useState<number | string>('');
    const [volumePerVial, setVolumePerVial] = React.useState<number | string>('');
    const [valuePerVial, setValuePerVial] = React.useState<number | string>('');

    const totalVolume = React.useMemo(() => Number(vials) * Number(volumePerVial), [vials, volumePerVial]);
    const totalValue = React.useMemo(() => Number(vials) * Number(valuePerVial), [vials, valuePerVial]);
    const valuePerUnit = React.useMemo(() => totalVolume > 0 ? totalValue / totalVolume : 0, [totalValue, totalVolume]);

    const loadData = React.useCallback(() => {
        const allInventory = getInventory();
        setVacunas(allInventory.filter(item => item.category === 'vacuna'));
        
        const storedPurchases = localStorage.getItem(MEDICAL_PURCHASE_HISTORY_KEY);
        if (storedPurchases) {
            setPurchaseHistory(JSON.parse(storedPurchases).filter((p: any) => allInventory.some(i => i.id === p.productId && i.category === 'vacuna')));
        }

        const storedConsumptions = localStorage.getItem(MEDICAL_CONSUMPTION_HISTORY_KEY);
        if (storedConsumptions) {
            setConsumptionHistory(JSON.parse(storedConsumptions).filter((c: MedicalConsumptionRecord) => c.category === 'vacuna'));
        }
    }, []);

    React.useEffect(() => {
        loadData();
    }, [loadData]);
    
    const resetFormState = () => {
        setSelectedProduct('');
        setNewProductName('');
        setVials('');
        setVolumePerVial('');
        setValuePerVial('');
    };

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const purchaseDate = formData.get('purchaseDate') as string;
        
        let productId = selectedProduct;
        let productName = vacunas.find(v => v.id === selectedProduct)?.name || '';
        let isNewProductCreation = false;

        const fullInventory = getInventory();

        if (selectedProduct === 'new') {
            if (!newProductName) {
                toast({ variant: 'destructive', title: 'Error', description: 'Debe proporcionar un nombre para el nuevo producto.' });
                return;
            }
            productName = newProductName;
            const existingProductByName = fullInventory.find(item => item.name.toLowerCase() === newProductName.toLowerCase() && item.category === 'vacuna');

            if (existingProductByName) {
                productId = existingProductByName.id;
            } else {
                productId = `VAC-${new Date().getTime()}`;
                isNewProductCreation = true;
            }
        }

        if (!productId || !productName || totalVolume <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Por favor, complete todos los campos de producto y cantidad.' });
            return;
        }

        let productInInventory = fullInventory.find(item => item.id === productId);
        let updatedInventory: InventoryItem[];

        if (productInInventory) {
            updatedInventory = fullInventory.map(item => 
                item.id === productId ? { ...item, stock: item.stock + totalVolume } : item
            );
        } else {
            const newProduct: InventoryItem = { id: productId, name: productName, category: 'vacuna', stock: totalVolume };
            updatedInventory = [...fullInventory, newProduct];
        }
        updateInventory(updatedInventory);

        const newPurchase: MedicalPurchaseRecord = {
            id: `vac-purchase-${new Date().getTime()}`,
            productId,
            productName,
            purchaseDate,
            vials: Number(vials),
            volumePerVial: Number(volumePerVial),
            totalVolume,
            valuePerVial: Number(valuePerVial),
            totalValue,
            valuePerUnit,
            lotNumber: formData.get('lotNumber') as string || undefined,
            icaRegistration: formData.get('icaRegistration') as string || undefined,
            manufacturingDate: formData.get('manufacturingDate') as string || undefined,
            expirationDate: formData.get('expirationDate') as string || undefined,
        };
        
        const allPurchases = JSON.parse(localStorage.getItem(MEDICAL_PURCHASE_HISTORY_KEY) || '[]');
        allPurchases.unshift(newPurchase);
        localStorage.setItem(MEDICAL_PURCHASE_HISTORY_KEY, JSON.stringify(allPurchases));

        toast({ title: 'Ingreso Registrado', description: `${totalVolume} dosis/ml de ${productName} añadidos al inventario.` });
        
        setIsFormOpen(false);
        resetFormState();
        loadData();
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.push('/inventory')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight">Inventario de Vacunas</h1>
                    </div>
                     <Button onClick={() => setIsFormOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Registrar Compra
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Syringe className="text-green-500"/>Stock de Vacunas</CardTitle>
                        <CardDescription>Inventario disponible de cada producto biológico.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-right">Stock (dosis/ml)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vacunas.length > 0 ? vacunas.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right font-semibold">{item.stock.toFixed(2)}</TableCell>
                                    </TableRow>
                                )) : (
                                     <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">No hay vacunas en el inventario.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Compras</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-right">Frascos</TableHead>
                                    <TableHead className="text-right">Volumen Total</TableHead>
                                    <TableHead className="text-right">Costo Total</TableHead>
                                    <TableHead className="text-right">Costo/Dosis</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {purchaseHistory.length > 0 ? purchaseHistory.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>{isValid(parseISO(p.purchaseDate)) ? format(parseISO(p.purchaseDate), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                        <TableCell className="font-medium">{p.productName}</TableCell>
                                        <TableCell className="text-right">{p.vials}</TableCell>
                                        <TableCell className="text-right">{p.totalVolume.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{p.totalValue.toLocaleString('es-CO', {style: 'currency', currency: 'COP'})}</TableCell>
                                        <TableCell className="text-right">{p.valuePerUnit.toLocaleString('es-CO', {style: 'currency', currency: 'COP'})}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">No hay compras registradas.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ArrowDown className="text-red-500"/>Historial de Salidas</CardTitle>
                        <CardDescription>Consumos registrados automáticamente desde las fases productivas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Lote/Animal Destino</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-right">Cantidad Consumida (dosis/ml)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {consumptionHistory.length > 0 ? consumptionHistory.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{isValid(parseISO(item.date)) ? format(parseISO(item.date), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                        <TableCell className="font-medium">{item.area}</TableCell>
                                        <TableCell>{item.productName}</TableCell>
                                        <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
                                    </TableRow>
                                )) : (
                                     <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No hay salidas de vacunas registradas.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                 <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if(!isOpen) resetFormState(); setIsFormOpen(isOpen); }}>
                    <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Registrar Compra de Vacuna</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="flex-1 overflow-y-auto -mx-6 px-6">
                            <form onSubmit={handleFormSubmit} id="add-item-form" className="space-y-4 py-4 pr-6">
                                <Card>
                                    <CardHeader><CardTitle className="text-base">Producto y Fecha</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="product">Producto</Label>
                                            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                                <SelectTrigger><SelectValue placeholder="Seleccionar producto..."/></SelectTrigger>
                                                <SelectContent>
                                                    {vacunas.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                                    <SelectItem value="new">-- Crear nuevo producto --</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="purchaseDate">Fecha de Compra</Label>
                                            <Input id="purchaseDate" name="purchaseDate" type="date" required defaultValue={new Date().toISOString().substring(0, 10)}/>
                                        </div>
                                    </CardContent>
                                </Card>
                                
                                {selectedProduct === 'new' && (
                                     <Card>
                                        <CardHeader><CardTitle className="text-base">Datos del Nuevo Producto</CardTitle></CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <Label htmlFor="newProductName">Nombre del Producto</Label>
                                                <Input id="newProductName" value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="Ej: Vacuna E. Coli"/>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <Card>
                                     <CardHeader><CardTitle className="text-base">Cantidad y Costo</CardTitle></CardHeader>
                                     <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="vials">Nº de Frascos</Label>
                                            <Input id="vials" name="vials" type="number" required value={vials} onChange={e => setVials(e.target.value)}/>
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="volumePerVial">Dosis/Frasco</Label>
                                            <Input id="volumePerVial" name="volumePerVial" type="number" step="0.1" required value={volumePerVial} onChange={e => setVolumePerVial(e.target.value)}/>
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="valuePerVial">Valor/Frasco ($)</Label>
                                            <Input id="valuePerVial" name="valuePerVial" type="number" step="0.01" required value={valuePerVial} onChange={e => setValuePerVial(e.target.value)}/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Dosis Totales</Label>
                                            <Input value={totalVolume.toFixed(2)} readOnly className="bg-muted"/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Valor Total ($)</Label>
                                            <Input value={totalValue.toLocaleString('es-CO')} readOnly className="bg-muted"/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Valor/Dosis ($)</Label>
                                            <Input value={valuePerUnit.toLocaleString('es-CO', {minimumFractionDigits: 2})} readOnly className="bg-muted"/>
                                        </div>
                                     </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle className="text-base">Trazabilidad</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="lotNumber">Nº de Lote</Label>
                                            <Input id="lotNumber" name="lotNumber" type="text" placeholder="Lote del fabricante"/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="icaRegistration">Registro ICA</Label>
                                            <Input id="icaRegistration" name="icaRegistration" type="text" placeholder="Registro Sanitario"/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="manufacturingDate">Fecha de Fabricación</Label>
                                            <Input id="manufacturingDate" name="manufacturingDate" type="date" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="expirationDate">Fecha de Vencimiento</Label>
                                            <Input id="expirationDate" name="expirationDate" type="date" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </form>
                        </ScrollArea>
                        <DialogFooter className="flex-shrink-0 pt-4 border-t bg-background -mx-6 px-6">
                            <Button type="button" variant="ghost" onClick={() => { setIsFormOpen(false); resetFormState(); }}>Cancelar</Button>
                            <Button type="submit" form="add-item-form">Guardar Compra</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

    

    