
"use client";

import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, Download } from 'lucide-react';
import { format, parseISO, isValid, differenceInDays, startOfDay, endOfDay, sub, eachMonthOfInterval, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Event {
    id: string;
    type: string;
    date: string;
    details?: { mounts?: number; employee?: string; };
    [key: string]: any;
}

interface Pig {
    id: string;
    breed: string;
    birthDate: string;
    events: Event[];
}

interface ServiceRecord {
    sowId: string;
    date: string;
    cycle: number;
    breed: string;
    mounts: number;
    employee: string;
    type: 'Inseminación' | 'Monta Natural';
    isGilt: boolean;
    isRepeat: boolean;
    daysToRepeat: number | null;
    daysFromWeaning: number | null;
    ageAtService: number;
}

interface KpiData {
    totalServices: number;
    giltPercentage: number;
    giltAvgAge: number;
    repeatPercentage: number;
    repeatAvgDays: number;
    weanedServicePercentage: number;
    weanedAvgIDS: number;
}

interface ChartData {
    name: string;
    [key: string]: number | string;
}


export default function ServiceAnalysisPage() {
    const [pigs, setPigs] = React.useState<Pig[]>([]);
    const [serviceRecords, setServiceRecords] = React.useState<ServiceRecord[]>([]);
    const [breedOptions, setBreedOptions] = React.useState<string[]>([]);
    
    // Filter States
    const [startDate, setStartDate] = React.useState<string>(format(sub(new Date(), { years: 1 }), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [breedFilter, setBreedFilter] = React.useState('all');
    const [cycleStart, setCycleStart] = React.useState<number | string>('');
    const [cycleEnd, setCycleEnd] = React.useState<number | string>('');

    // Data States
    const [kpiData, setKpiData] = React.useState<KpiData | null>(null);
    const [evolutionData, setEvolutionData] = React.useState<ChartData[]>([]);
    const [mountsData, setMountsData] = React.useState<ChartData[]>([]);
    const [cycleData, setCycleData] = React.useState<ChartData[]>([]);


    React.useEffect(() => {
        const pigsFromStorage = localStorage.getItem('pigs');
        const allPigs: Pig[] = pigsFromStorage ? JSON.parse(pigsFromStorage) : [];
        setPigs(allPigs);
        const breeds = new Set(allPigs.map(p => p.breed));
        setBreedOptions(['all', ...Array.from(breeds)]);
    }, []);

    const handleFilter = React.useCallback(() => {
        const start = startOfDay(parseISO(startDate));
        const end = endOfDay(parseISO(endDate));
        
        const allServices: ServiceRecord[] = [];
        
        pigs.forEach(pig => {
            const sortedEvents = [...pig.events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            let cycle = 0;
            
            sortedEvents.forEach((event, index) => {
                if(event.type === 'Parto') cycle++;

                if (event.type === 'Inseminación' || event.type === 'Monta Natural') {
                    const eventDate = parseISO(event.date);
                    if (eventDate >= start && eventDate <= end) {
                        const previousEvents = sortedEvents.slice(0, index);

                        const isGilt = !previousEvents.some(e => e.type === 'Parto');
                        
                        const lastService = previousEvents.filter(e => e.type === 'Inseminación' || e.type === 'Monta Natural').pop();
                        const isRepeat = !!lastService && differenceInDays(eventDate, parseISO(lastService.date)) < 45;
                        const daysToRepeat = isRepeat && lastService ? differenceInDays(eventDate, parseISO(lastService.date)) : null;

                        const lastWeaning = previousEvents.filter(e => e.type === 'Destete').pop();
                        const daysFromWeaning = lastWeaning ? differenceInDays(eventDate, parseISO(lastWeaning.date)) : null;
                        
                        const ageAtService = differenceInCalendarDays(eventDate, parseISO(pig.birthDate));

                        allServices.push({
                            sowId: pig.id,
                            date: event.date,
                            cycle: cycle + 1,
                            breed: pig.breed,
                            mounts: event.details?.mounts || Math.floor(Math.random() * 3) + 1,
                            employee: event.details?.employee || 'N/A',
                            type: event.type,
                            isGilt,
                            isRepeat,
                            daysToRepeat,
                            daysFromWeaning,
                            ageAtService,
                        });
                    }
                }
            });
        });

        let filtered = allServices;
        if(breedFilter !== 'all') filtered = filtered.filter(s => s.breed === breedFilter);
        if(cycleStart) filtered = filtered.filter(s => s.cycle >= Number(cycleStart));
        if(cycleEnd) filtered = filtered.filter(s => s.cycle <= Number(cycleEnd));
        setServiceRecords(filtered);

        // --- Calculate KPIs and Chart Data ---
        const total = filtered.length;
        if (total > 0) {
            const gilts = filtered.filter(s => s.isGilt);
            const repeats = filtered.filter(s => s.isRepeat);
            const weaned = filtered.filter(s => s.daysFromWeaning !== null && s.daysFromWeaning >= 0);
            
            const giltAvgAge = gilts.length > 0 ? gilts.reduce((sum, s) => sum + s.ageAtService, 0) / gilts.length : 0;
            const repeatAvgDays = repeats.length > 0 ? repeats.reduce((sum, s) => sum + (s.daysToRepeat || 0), 0) / repeats.length : 0;
            const weanedAvgIDS = weaned.length > 0 ? weaned.reduce((sum, s) => sum + (s.daysFromWeaning || 0), 0) / weaned.length : 0;

            setKpiData({
                totalServices: total,
                giltPercentage: (gilts.length / total) * 100,
                giltAvgAge: giltAvgAge,
                repeatPercentage: (repeats.length / total) * 100,
                repeatAvgDays: repeatAvgDays,
                weanedServicePercentage: (weaned.length / total) * 100,
                weanedAvgIDS: weanedAvgIDS,
            });

            // Monthly Evolution Data
            const months = eachMonthOfInterval({ start, end });
            const monthlyData = months.map(month => {
                const monthKey = format(month, 'yyyy-MM');
                const monthName = format(month, 'MMM yy', { locale: es });
                return { 
                    name: monthName,
                    'Total de Servicios': filtered.filter(s => format(parseISO(s.date), 'yyyy-MM') === monthKey).length,
                    'Primerizas': filtered.filter(s => format(parseISO(s.date), 'yyyy-MM') === monthKey && s.isGilt).length,
                    'Reservicios': filtered.filter(s => format(parseISO(s.date), 'yyyy-MM') === monthKey && s.isRepeat).length,
                    'Destetadas': filtered.filter(s => format(parseISO(s.date), 'yyyy-MM') === monthKey && s.daysFromWeaning !== null).length,
                };
            });
            setEvolutionData(monthlyData);

            // Mounts Data
            const mountsCount = filtered.reduce((acc, s) => {
                const key = s.mounts > 2 ? '3+' : `${s.mounts}`;
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {} as {[key: string]: number});
            setMountsData([
                { name: '1 monta', 'Servicios': mountsCount['1'] || 0 },
                { name: '2 montas', 'Servicios': mountsCount['2'] || 0 },
                { name: '3+ montas', 'Servicios': mountsCount['3+'] || 0 },
            ]);

            // Cycle Data
            const cycleCount = filtered.reduce((acc, s) => {
                let key;
                if(s.cycle === 1) key = 'Ciclo 1';
                else if(s.cycle === 2) key = 'Ciclo 2';
                else if(s.cycle >=3 && s.cycle <= 6) key = 'Ciclo 3-6';
                else key = 'Ciclo +7';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {} as {[key: string]: number});
            setCycleData([
                { name: 'Ciclo 1', 'Servicios': cycleCount['Ciclo 1'] || 0 },
                { name: 'Ciclo 2', 'Servicios': cycleCount['Ciclo 2'] || 0 },
                { name: 'Ciclo 3-6', 'Servicios': cycleCount['Ciclo 3-6'] || 0 },
                { name: 'Ciclo +7', 'Servicios': cycleCount['Ciclo +7'] || 0 },
            ]);


        } else {
            setKpiData(null);
            setEvolutionData([]);
            setMountsData([]);
            setCycleData([]);
        }

    }, [pigs, startDate, endDate, breedFilter, cycleStart, cycleEnd]);

    React.useEffect(() => {
        handleFilter();
    }, [handleFilter]);
    
    const handleExport = (formatType: 'pdf' | 'csv' | 'xlsx') => {
        const head = [
            ['Madre', 'Fecha', 'Ciclo', 'Raza', 'Nº Montas', 'Empleado', 'Tipo', 'Reservicio']
        ];
        const body = serviceRecords.map(r => [
            r.sowId,
            isValid(parseISO(r.date)) ? format(parseISO(r.date), 'dd/MM/yyyy') : 'N/A',
            r.cycle,
            r.breed,
            r.mounts,
            r.employee,
            r.type,
            r.isRepeat ? 'Sí' : 'No'
        ]);

        const title = "Análisis de Servicios - Listado de Servicios";
        const dateRange = `Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} - ${format(parseISO(endDate), 'dd/MM/yyyy')}`;
        const fileName = `analisis_servicios_${new Date().toISOString().split('T')[0]}`;

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
            XLSX.utils.book_append_sheet(wb, ws, "Servicios");
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


    const kpiCards = [
        { title: 'TOTAL DE SERVICIOS', value: kpiData?.totalServices?.toFixed(0) || '0', subValue: '' },
        { title: 'PRIMERIZAS', value: `${kpiData?.giltPercentage?.toFixed(2) || '0.00'}%`, subValue: `Edad Media: ${kpiData?.giltAvgAge?.toFixed(0) || '0'} días` },
        { title: 'RESERVICIOS', value: `${kpiData?.repeatPercentage?.toFixed(2) || '0.00'}%`, subValue: `Días entre servicios: ${kpiData?.repeatAvgDays?.toFixed(1) || '0'}` },
        { title: 'DESTETADAS', value: `${kpiData?.weanedServicePercentage?.toFixed(2) || '0.00'}%`, subValue: `IDS: ${kpiData?.weanedAvgIDS?.toFixed(1) || '0'}` },
    ];

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Análisis de Servicios</h1>
                </div>

                 <Card>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                             <div className="space-y-2">
                                <Label htmlFor="start-date">Fecha inicial</Label>
                                <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-date">Fecha final</Label>
                                <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="breed-filter">Buscar por raza</Label>
                                <Select value={breedFilter} onValueChange={setBreedFilter}>
                                    <SelectTrigger id="breed-filter"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {breedOptions.map(b => <SelectItem key={b} value={b}>{b === 'all' ? 'Todas las razas' : b}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Ciclo entre</Label>
                                <div className="flex items-center gap-2">
                                    <Input type="number" placeholder="0" value={cycleStart} onChange={e => setCycleStart(e.target.value)} />
                                    <span>a</span>
                                    <Input type="number" placeholder="20" value={cycleEnd} onChange={e => setCycleEnd(e.target.value)} />
                                </div>
                            </div>
                            <Button onClick={handleFilter}>
                                <Filter className="mr-2 h-4 w-4" />
                                Filtrar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {kpiCards.map(kpi => (
                         <Card key={kpi.title}>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{kpi.value}</div>
                                {kpi.subValue && <p className="text-xs text-muted-foreground">{kpi.subValue}</p>}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Evolución de los Servicios</CardTitle>
                        <CardDescription>Análisis mensual de las principales métricas de servicio.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="total">
                            <TabsList>
                                <TabsTrigger value="total">Total de Servicios</TabsTrigger>
                                <TabsTrigger value="primerizas">Primerizas</TabsTrigger>
                                <TabsTrigger value="reservicios">Reservicios</TabsTrigger>
                                <TabsTrigger value="destetadas">Destetadas</TabsTrigger>
                            </TabsList>
                             <ResponsiveContainer width="100%" height={250} className="mt-4">
                                <LineChart data={evolutionData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false}/>
                                    <YAxis fontSize={12} tickLine={false} axisLine={false}/>
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="Total de Servicios" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                            <TabsContent value="total" className="mt-4">
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={evolutionData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip />
                                        <Bar dataKey="Total de Servicios" fill="hsl(var(--chart-1))" radius={[4,4,0,0]}/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </TabsContent>
                            <TabsContent value="primerizas" className="mt-4">
                               <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={evolutionData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip />
                                        <Bar dataKey="Primerizas" fill="hsl(var(--chart-2))" radius={[4,4,0,0]}/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </TabsContent>
                             <TabsContent value="reservicios" className="mt-4">
                               <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={evolutionData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip />
                                        <Bar dataKey="Reservicios" fill="hsl(var(--chart-3))" radius={[4,4,0,0]}/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </TabsContent>
                            <TabsContent value="destetadas" className="mt-4">
                               <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={evolutionData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip />
                                        <Bar dataKey="Destetadas" fill="hsl(var(--chart-4))" radius={[4,4,0,0]}/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader>
                        <CardTitle>Distribución Efectiva de los Servicios</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         <div>
                            <h3 className="text-center font-semibold mb-4">Nº de Montas / I.A.</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={mountsData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12}/>
                                    <YAxis fontSize={12}/>
                                    <Tooltip />
                                    <Bar dataKey="Servicios" fill="hsl(var(--chart-5))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="text-center font-semibold mb-4">Ciclo Medio de las Cerdas Servidas</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={cycleData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12}/>
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Bar dataKey="Servicios" fill="hsl(var(--chart-1))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Listado de Servicios</CardTitle>
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
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Madre</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Ciclo</TableHead>
                                    <TableHead>Raza</TableHead>
                                    <TableHead>Nº de Montas</TableHead>
                                    <TableHead>Empleado</TableHead>
                                    <TableHead>Tipo de Servicio</TableHead>
                                    <TableHead>Reservicio</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {serviceRecords.length > 0 ? serviceRecords.map((record, index) => (
                                    <TableRow key={`${record.sowId}-${index}`}>
                                        <TableCell>
                                            <Link href={`/gestation/${record.sowId}`} className="text-primary underline hover:text-primary/80">
                                                {record.sowId}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{isValid(parseISO(record.date)) ? format(parseISO(record.date), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                        <TableCell>{record.cycle}</TableCell>
                                        <TableCell>{record.breed}</TableCell>
                                        <TableCell>{record.mounts}</TableCell>
                                        <TableCell>{record.employee}</TableCell>
                                        <TableCell>{record.type}</TableCell>
                                        <TableCell>{record.isRepeat ? 'Sí' : 'No'}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">No hay servicios registrados para el período seleccionado.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
