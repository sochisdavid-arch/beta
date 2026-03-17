
"use client";

import * as React from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, Download, MoreHorizontal, Activity } from 'lucide-react';
import { format, parseISO, isValid, differenceInDays, startOfDay, endOfDay, sub } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Event {
    id: string;
    type: string;
    date: string;
    details?: string;
    [key: string]: any;
}

interface Pig {
    id: string;
    breed: string;
    birthDate: string;
    events: Event[];
}

interface LossRecord {
    sowId: string;
    cycle: number;
    lossDate: string;
    lossType: string;
    gestationDays: number;
    breed: string;
    serviceDate: string;
    boarId: string | null;
    employee: string | null;
}

const LOSS_TYPES = ['Repetición de Celo', 'Aborto', 'Detectada Vacía', 'Descarte Gestante', 'Muerte Gestante'];

const findReproductiveLosses = (pigs: Pig[], startDate: Date, endDate: Date): LossRecord[] => {
    const losses: LossRecord[] = [];

    pigs.forEach(pig => {
        let lastServiceDate: string | null = null;
        let lastBoarId: string | null = null;
        let cycle = 0;

        const sortedEvents = [...pig.events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        sortedEvents.forEach(event => {
            const eventDate = parseISO(event.date);

            if (event.type === 'Parto') {
                cycle++;
                lastServiceDate = null;
            }
            if (event.type === 'Inseminación' || event.type === 'Monta Natural') {
                lastServiceDate = event.date;
                lastBoarId = event.details?.match(/Macho ([\w-]+)/)?.[1] || 'N/A';
            }

            const isLossEvent = LOSS_TYPES.includes(event.type) || (event.type === 'Celo' && lastServiceDate);
            if (isLossEvent && eventDate >= startDate && eventDate <= endDate) {
                let lossType = event.type;
                if (event.type === 'Celo' && lastServiceDate) {
                    lossType = 'Repetición de Celo';
                }
                
                const gestationDays = lastServiceDate ? differenceInDays(eventDate, parseISO(lastServiceDate)) : 0;
                
                if (gestationDays >= 0) { // Ensure it's a loss after a service
                    losses.push({
                        sowId: pig.id,
                        cycle: cycle + 1,
                        lossDate: event.date,
                        lossType: lossType,
                        gestationDays: gestationDays,
                        breed: pig.breed,
                        serviceDate: lastServiceDate || 'N/A',
                        boarId: lastBoarId,
                        employee: 'Yoss' // Placeholder
                    });
                }
                lastServiceDate = null; // Reset after a loss is recorded
            }
        });
    });

    return losses.sort((a, b) => new Date(a.lossDate).getTime() - new Date(b.lossDate).getTime());
};

export default function ReproductiveLossPage() {
    const [pigs, setPigs] = React.useState<Pig[]>([]);
    const [lossRecords, setLossRecords] = React.useState<LossRecord[]>([]);
    
    const [startDate, setStartDate] = React.useState<string>(format(sub(new Date(), { years: 1 }), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [lossTypeFilter, setLossTypeFilter] = React.useState('all');

    React.useEffect(() => {
        const pigsFromStorage = localStorage.getItem('pigs');
        const allPigs: Pig[] = pigsFromStorage ? JSON.parse(pigsFromStorage) : [];
        setPigs(allPigs);
    }, []);

    const handleFilter = React.useCallback(() => {
        const start = startOfDay(parseISO(startDate));
        const end = endOfDay(parseISO(endDate));
        let allLosses = findReproductiveLosses(pigs, start, end);

        if (lossTypeFilter !== 'all') {
            allLosses = allLosses.filter(loss => loss.lossType === lossTypeFilter);
        }
        
        setLossRecords(allLosses);
    }, [pigs, startDate, endDate, lossTypeFilter]);

    React.useEffect(() => {
        handleFilter();
    }, [handleFilter]);
    
    const handleExport = (formatType: 'pdf' | 'csv' | 'xlsx') => {
        const head = [
            'Madre', 'Ciclo', 'Fecha', 'Tipo de pérdida', 
            'Días gestación', 'Raza', 'Fecha de servicio', 'Reproductor', 'Emp'
        ];
        const body = lossRecords.map(record => [
            record.sowId,
            record.cycle,
            isValid(parseISO(record.lossDate)) ? format(parseISO(record.lossDate), 'dd/MM/yyyy') : 'N/A',
            record.lossType,
            record.gestationDays,
            record.breed,
            isValid(parseISO(record.serviceDate)) ? format(parseISO(record.serviceDate), 'dd/MM/yyyy') : 'N/A',
            record.boarId || 'N/A',
            record.employee || 'N/A'
        ]);

        const title = "Informe de Pérdida Reproductiva";
        const dateRange = `Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} - ${format(parseISO(endDate), 'dd/MM/yyyy')}`;
        const fileName = `perdida_reproductiva_${new Date().toISOString().split('T')[0]}`;

        if (formatType === 'pdf') {
            const doc = new jsPDF({ orientation: 'landscape' });
            doc.text(title, 14, 16);
            doc.setFontSize(10);
            doc.text(dateRange, 14, 22);
            autoTable(doc, {
                head: [head],
                body: body,
                startY: 28,
                theme: 'grid',
                headStyles: { fillColor: '#e07a5f' },
            });
            doc.save(`${fileName}.pdf`);
        }

        if (formatType === 'csv' || formatType === 'xlsx') {
            const dataToExport = [head, ...body];
            const ws = XLSX.utils.aoa_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Pérdidas");
            const wbout = XLSX.write(wb, { bookType: formatType, type: 'array' });
            const blob = new Blob([wbout], {type: 'application/octet-stream'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${fileName}.${formatType}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <Activity className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-bold tracking-tight">Pérdida Reproductiva</h1>
                </div>
                
                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="start-date">Fecha inicial</Label>
                                <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-date">Fecha final</Label>
                                <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="loss-type-filter">Tipo de Pérdida</Label>
                                <Select value={lossTypeFilter} onValueChange={setLossTypeFilter}>
                                    <SelectTrigger id="loss-type-filter"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las Pérdidas</SelectItem>
                                        {LOSS_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleFilter}>
                                <Filter className="mr-2 h-4 w-4" />
                                Filtrar
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Listado de madres con las pérdidas reproductivas</CardTitle>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <Download className="mr-2 h-4 w-4" />
                                        Exportar
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => handleExport('pdf')}>Exportar a PDF</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleExport('csv')}>Exportar a CSV</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleExport('xlsx')}>Exportar a Excel (XLSX)</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Madre</TableHead>
                                        <TableHead>Ciclo</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Tipo de pérdida</TableHead>
                                        <TableHead>Días gestación</TableHead>
                                        <TableHead>Raza</TableHead>
                                        <TableHead>Fecha de servicio</TableHead>
                                        <TableHead>Reproductor</TableHead>
                                        <TableHead>Emp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lossRecords.length > 0 ? lossRecords.map((record, index) => (
                                        <TableRow key={`${record.sowId}-${index}`}>
                                            <TableCell>
                                                <Link href={`/gestation/${record.sowId}`} className="text-primary underline hover:text-primary/80">
                                                    {record.sowId}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{record.cycle}</TableCell>
                                            <TableCell>{isValid(parseISO(record.lossDate)) ? format(parseISO(record.lossDate), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                            <TableCell>{record.lossType}</TableCell>
                                            <TableCell>{record.gestationDays}</TableCell>
                                            <TableCell>{record.breed}</TableCell>
                                            <TableCell>{isValid(parseISO(record.serviceDate)) ? format(parseISO(record.serviceDate), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                            <TableCell>{record.boarId}</TableCell>
                                            <TableCell>{record.employee}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-24 text-center">No hay pérdidas reproductivas registradas para el período seleccionado.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
