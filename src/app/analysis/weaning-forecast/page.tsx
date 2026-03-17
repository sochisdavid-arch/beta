
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
import { Filter, AlertCircle, MoreHorizontal, Download } from 'lucide-react';
import { format, parseISO, isValid, differenceInDays, startOfDay, endOfDay, addDays } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


interface Event {
    id: string;
    type: string;
    date: string;
    details?: string;
    liveBorn?: number;
    pigletCount?: number;
    [key: string]: any;
}

interface Pig {
    id: string;
    id2?: string;
    breed: string;
    birthDate: string;
    events: Event[];
}

interface WeaningForecast {
    sowId: string;
    sowId2?: string;
    cycle: number;
    farrowingDate: string;
    lactationDays: number;
    weaningDate: string;
    liveBorn: number;
    received: number;
    donated: number;
    deaths: number;
    partialWeaning: number;
    balance: number;
}

const pigBreeds = [
  "Duroc", "Yorkshire", "Landrace", "Hampshire", "Pietrain", "Berkshire", "Chester White", "Spotted", "Poland China", "Tamworth", "Large Black", "Cerdo Ibérico",
  "PIC", "Topigs Norsvin", "Hypor (Hendrix Genetics)", "DanBred", "Genus", "Choice Genetics", "Genesus",
  "Otro"
];

// Default lactation days, can be made a setting later
const DEFAULT_LACTATION_DURATION = 21;

const findWeaningForecasts = (pigs: Pig[]): WeaningForecast[] => {
    const forecasts: WeaningForecast[] = [];

    pigs.forEach(pig => {
        let cycle = 0;
        let lastFarrowingDate: string | null = null;
        let liveBorn = 0;
        let adoptions = 0;
        let donations = 0;
        let deaths = 0;

        const sortedEvents = [...pig.events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        for (const event of sortedEvents) {
            if (event.type === 'Parto') {
                if (lastFarrowingDate) cycle++;
                lastFarrowingDate = event.date;
                liveBorn = event.liveBorn || 0;
                adoptions = 0;
                donations = 0;
                deaths = 0;
            } else if (event.type === 'Destete') {
                cycle++;
                lastFarrowingDate = null;
            } else if (lastFarrowingDate) {
                 if (event.type === 'Muerte de Lechón') deaths += (event.pigletCount || 0);
                 if (event.type === 'Adopción de Lechón') adoptions += (event.pigletCount || 0);
                 if (event.type === 'Donación de Lechón') donations += (event.pigletCount || 0);
            }
        }
        
        if (lastFarrowingDate) {
            const lactationDays = differenceInDays(new Date(), parseISO(lastFarrowingDate));
            const weaningDate = addDays(parseISO(lastFarrowingDate), DEFAULT_LACTATION_DURATION);
            const balance = liveBorn + adoptions - donations - deaths;
            forecasts.push({
                sowId: pig.id,
                sowId2: pig.id2,
                cycle: cycle + 1,
                farrowingDate: lastFarrowingDate,
                lactationDays,
                weaningDate: weaningDate.toISOString(),
                liveBorn,
                received: adoptions,
                donated: donations,
                deaths: deaths,
                partialWeaning: 0,
                balance: balance,
            });
        }
    });

    return forecasts;
};

const KpiCard = ({ title, value }: { title: string, value: string | number }) => (
    <div className="flex flex-col items-center justify-center p-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        <span className="text-2xl font-bold">{value}</span>
    </div>
);


export default function WeaningForecastPage() {
    const [pigs, setPigs] = React.useState<Pig[]>([]);
    const [forecasts, setForecasts] = React.useState<WeaningForecast[]>([]);
    
    // Filter States
    const [startDate, setStartDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = React.useState<string>(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
    const [breedFilter, setBreedFilter] = React.useState('all');

    React.useEffect(() => {
        const pigsFromStorage = localStorage.getItem('pigs');
        const allPigs: Pig[] = pigsFromStorage ? JSON.parse(pigsFromStorage) : [];
        setPigs(allPigs);
    }, []);

    const handleFilter = React.useCallback(() => {
        let filteredPigs = pigs;
        if (breedFilter !== 'all') {
            filteredPigs = filteredPigs.filter(p => p.breed === breedFilter);
        }

        let allForecasts = findWeaningForecasts(filteredPigs);
        
        const start = startOfDay(parseISO(startDate));
        const end = endOfDay(parseISO(endDate));
        allForecasts = allForecasts.filter(f => {
            const farrowDate = parseISO(f.weaningDate);
            return farrowDate >= start && farrowDate <= end;
        });

        setForecasts(allForecasts.sort((a,b) => new Date(a.weaningDate).getTime() - new Date(b.weaningDate).getTime()));
    }, [pigs, startDate, endDate, breedFilter]);

    React.useEffect(() => {
        handleFilter();
    }, [handleFilter]);
    
    const handleExport = (formatType: 'pdf' | 'csv' | 'xlsx') => {
        const head = [['ID 1', 'ID 2', 'Ciclo', 'Fecha del Parto', 'Días lact, madre', 'NV', 'RC', 'DO', 'MO', 'Dest. parcial', 'Saldo', 'Días lact. lecho.']];
        const body = forecasts.map(f => [
            f.sowId,
            f.sowId2 || '-',
            f.cycle,
            format(parseISO(f.farrowingDate), 'dd/MM/yyyy'),
            f.lactationDays,
            f.liveBorn,
            f.received,
            f.donated,
            f.deaths,
            f.partialWeaning,
            f.balance,
            f.lactationDays
        ]);

        const title = "Previsión de Destete";
        const dateRange = `Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} - ${format(parseISO(endDate), 'dd/MM/yyyy')}`;
        const fileName = `prevision_destete_${new Date().toISOString().split('T')[0]}`;

        if (formatType === 'pdf') {
            const doc = new jsPDF({ orientation: 'landscape' });
            doc.text(title, 14, 16);
            doc.setFontSize(10);
            doc.text(dateRange, 14, 22);
            autoTable(doc, {
                head: head,
                body: body,
                startY: 28,
                theme: 'grid',
                headStyles: { fillColor: '#e07a5f' },
            });
            doc.save(`${fileName}.pdf`);
        }

        if (formatType === 'csv' || formatType === 'xlsx') {
            const dataToExport = [head[0], ...body];
            const ws = XLSX.utils.aoa_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Prevision Destete");
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
    
    const kpiValues = React.useMemo(() => {
        return forecasts.reduce((acc, f) => {
            acc.liveBorn += f.liveBorn;
            acc.received += f.received;
            acc.donated += f.donated;
            acc.deaths += f.deaths;
            acc.balance += f.balance;
            return acc;
        }, { liveBorn: 0, received: 0, donated: 0, deaths: 0, balance: 0 });
    }, [forecasts]);


    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Previsión de destete</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="start-date">Fecha inicial</Label>
                                <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-date">Fecha final</Label>
                                <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="breed-filter">Buscar por raza de la madre</Label>
                                <Select value={breedFilter} onValueChange={setBreedFilter}>
                                    <SelectTrigger id="breed-filter"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las razas</SelectItem>
                                        {pigBreeds.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2">
                               <Button variant="outline" size="icon"><Filter className="h-4 w-4"/></Button>
                               <Button onClick={handleFilter} className="w-full">Filtrar</Button>
                               <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                 <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Información</AlertTitle>
                    <AlertDescription>
                       Si informado el período, sólo serán listadas las madres con lechones que tendrán {DEFAULT_LACTATION_DURATION} días de edad en el período.
                    </AlertDescription>
                </Alert>

                <Card>
                    <CardContent className="p-4 grid grid-cols-2 md:grid-cols-6 divide-x">
                        <KpiCard title="NACIDOS VIVOS (NV)" value={kpiValues.liveBorn} />
                        <KpiCard title="RECIBIDOS (RC)" value={kpiValues.received} />
                        <KpiCard title="DONADOS (DO)" value={kpiValues.donated} />
                        <KpiCard title="MUERTES (MO)" value={kpiValues.deaths} />
                        <KpiCard title="DESTETE PARCIAL" value="-" />
                        <KpiCard title="SALDO" value={kpiValues.balance} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Listado de madres con previsión de destete</CardTitle>
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
                                    <DropdownMenuItem onSelect={() => window.print()}>Imprimir</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID 1</TableHead>
                                        <TableHead>ID 2</TableHead>
                                        <TableHead>Ciclo</TableHead>
                                        <TableHead>Fecha del Parto</TableHead>
                                        <TableHead>Días lact, madre</TableHead>
                                        <TableHead>NV</TableHead>
                                        <TableHead>RC</TableHead>
                                        <TableHead>DO</TableHead>
                                        <TableHead>MO</TableHead>
                                        <TableHead>Dest. parcial</TableHead>
                                        <TableHead>Saldo</TableHead>
                                        <TableHead>Días lact. lecho.</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {forecasts.length > 0 ? forecasts.map((record) => (
                                        <TableRow key={record.sowId}>
                                            <TableCell>
                                                <Link href={`/lactation/${record.sowId}`} className="text-primary underline hover:text-primary/80">
                                                    {record.sowId}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{record.sowId2 || '-'}</TableCell>
                                            <TableCell>{record.cycle}</TableCell>
                                            <TableCell>{format(parseISO(record.farrowingDate), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>{record.lactationDays}</TableCell>
                                            <TableCell>{record.liveBorn}</TableCell>
                                            <TableCell>{record.received}</TableCell>
                                            <TableCell>{record.donated}</TableCell>
                                            <TableCell>{record.deaths}</TableCell>
                                            <TableCell>{record.partialWeaning}</TableCell>
                                            <TableCell>{record.balance}</TableCell>
                                            <TableCell>{record.lactationDays}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={12} className="h-24 text-center">No hay destetes previstos para el período y filtros seleccionados.</TableCell>
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
