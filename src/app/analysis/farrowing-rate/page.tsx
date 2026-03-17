
"use client";

import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, Circle, Download } from 'lucide-react';
import { format, parseISO, isValid, differenceInDays, startOfDay, endOfDay, sub, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Event {
    id: string;
    type: string;
    date: string;
    details?: string;
    liveBorn?: number;
    [key: string]: any;
}

interface Pig {
    id: string;
    breed: string;
    birthDate: string;
    events: Event[];
}

interface ServiceOutcome {
    sowId: string;
    breed: string;
    serviceDate: string;
    outcome: 'Parto' | 'Aborto' | 'Repetición' | 'Vacía' | 'Descarte' | 'Muerte';
    outcomeDate: string;
    gestationDays: number;
    cycle: number;
}


interface MonthlyMetrics {
    name: string;
    totalServices: number;
    farrowings: number;
    abortions: number;
    repeats: number;
    emptyDetections: number;
    culls: number;
    deaths: number;
    farrowingRate: number;
    abortionRate: number;
    repeatRate: number;
    emptyRate: number;
    cullRate: number;
    deathRate: number;
}

const calculateServiceOutcomes = (pigs: Pig[], startDate: Date, endDate: Date): ServiceOutcome[] => {
    const outcomes: ServiceOutcome[] = [];

    pigs.forEach(pig => {
        let cycle = 0;
        const sortedEvents = [...pig.events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        sortedEvents.forEach((event, index) => {
            if (event.type === 'Parto') cycle++;
        });
        
        cycle = 0;

        sortedEvents.forEach((event, index) => {
            if (event.type === 'Parto') {
                cycle++;
            }
            if (event.type === 'Inseminación' || event.type === 'Monta Natural') {
                const serviceDate = parseISO(event.date);
                if (serviceDate >= startDate && serviceDate <= endDate) {
                    // Find the next significant event after this service
                    const subsequentEvents = sortedEvents.slice(index + 1);
                    let outcomeFound: ServiceOutcome | null = null;
                    for (const nextEvent of subsequentEvents) {
                         const outcomeDate = parseISO(nextEvent.date);
                         const gestationDays = differenceInDays(outcomeDate, serviceDate);
                         let outcomeType: ServiceOutcome['outcome'] | null = null;
                         
                         if(nextEvent.type === 'Parto') outcomeType = 'Parto';
                         else if (nextEvent.type === 'Aborto') outcomeType = 'Aborto';
                         else if (nextEvent.type === 'Celo' || nextEvent.type === 'Celo no Servido' || nextEvent.type === 'Inseminación' || nextEvent.type === 'Monta Natural') outcomeType = 'Repetición';
                         else if (nextEvent.type === 'Vacia') outcomeType = 'Vacía';
                         else if (nextEvent.type === 'Descarte') outcomeType = 'Descarte';
                         else if (nextEvent.type === 'Muerte') outcomeType = 'Muerte';

                         if(outcomeType) {
                            outcomeFound = {
                                sowId: pig.id,
                                breed: pig.breed,
                                serviceDate: event.date,
                                outcome: outcomeType,
                                outcomeDate: nextEvent.date,
                                gestationDays,
                                cycle: cycle + 1
                            };
                            break;
                         }
                    }
                     if (outcomeFound) outcomes.push(outcomeFound);
                }
            }
        });

    });
    return outcomes;
}


export default function FarrowingRatePage() {
    const [pigs, setPigs] = React.useState<Pig[]>([]);
    const [breedOptions, setBreedOptions] = React.useState<string[]>([]);
    
    // Filter States
    const [startDate, setStartDate] = React.useState<string>(format(sub(new Date(), { years: 1 }), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [breedFilter, setBreedFilter] = React.useState('all');

    // Data States
    const [metricsData, setMetricsData] = React.useState<MonthlyMetrics[]>([]);
    const [serviceOutcomes, setServiceOutcomes] = React.useState<ServiceOutcome[]>([]);

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
        
        let filteredPigs = pigs;
        if(breedFilter !== 'all') filteredPigs = filteredPigs.filter(s => s.breed === breedFilter);
        
        const outcomes = calculateServiceOutcomes(filteredPigs, start, end);
        setServiceOutcomes(outcomes);

        const months = eachMonthOfInterval({ start, end });
        const monthlyData: Record<string, Omit<MonthlyMetrics, 'name' | 'farrowingRate' | 'abortionRate' | 'repeatRate' | 'emptyRate' | 'cullRate' | 'deathRate'>> = {};

        months.forEach(month => {
            const monthKey = format(month, 'yyyy-MM');
            monthlyData[monthKey] = { totalServices: 0, farrowings: 0, abortions: 0, repeats: 0, emptyDetections: 0, culls: 0, deaths: 0 };
        });

        outcomes.forEach(outcome => {
            const monthKey = format(parseISO(outcome.serviceDate), 'yyyy-MM');
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].totalServices++;
                if (outcome.outcome === 'Parto') monthlyData[monthKey].farrowings++;
                else if (outcome.outcome === 'Aborto') monthlyData[monthKey].abortions++;
                else if (outcome.outcome === 'Repetición') monthlyData[monthKey].repeats++;
                else if (outcome.outcome === 'Vacía') monthlyData[monthKey].emptyDetections++;
                else if (outcome.outcome === 'Descarte') monthlyData[monthKey].culls++;
                else if (outcome.outcome === 'Muerte') monthlyData[monthKey].deaths++;
            }
        });

        const calculatedMetrics = Object.entries(monthlyData).map(([monthKey, data]) => {
            const totalServices = data.totalServices;
            return {
                name: format(parseISO(`${monthKey}-01`), 'MMM yy', { locale: es }),
                ...data,
                farrowingRate: totalServices > 0 ? (data.farrowings / totalServices) * 100 : 0,
                abortionRate: totalServices > 0 ? (data.abortions / totalServices) * 100 : 0,
                repeatRate: totalServices > 0 ? (data.repeats / totalServices) * 100 : 0,
                emptyRate: totalServices > 0 ? (data.emptyDetections / totalServices) * 100 : 0,
                cullRate: totalServices > 0 ? (data.culls / totalServices) * 100 : 0,
                deathRate: totalServices > 0 ? (data.deaths / totalServices) * 100 : 0,
            };
        });
        setMetricsData(calculatedMetrics);

    }, [pigs, startDate, endDate, breedFilter]);

    React.useEffect(() => {
        handleFilter();
    }, [handleFilter]);


    const totalMetrics = React.useMemo(() => {
        const total = serviceOutcomes.reduce((acc, outcome) => {
            acc.totalServices++;
            if (outcome.outcome === 'Parto') acc.farrowings++;
            else if (outcome.outcome === 'Aborto') acc.abortions++;
            else if (outcome.outcome === 'Repetición') acc.repeats++;
            else if (outcome.outcome === 'Vacía') acc.emptyDetections++;
            else if (outcome.outcome === 'Descarte') acc.culls++;
            else if (outcome.outcome === 'Muerte') acc.deaths++;
            return acc;
        }, { totalServices: 0, farrowings: 0, abortions: 0, repeats: 0, emptyDetections: 0, culls: 0, deaths: 0 });

        return {
            farrowingRate: total.totalServices > 0 ? (total.farrowings / total.totalServices) * 100 : 0,
            abortionRate: total.totalServices > 0 ? (total.abortions / total.totalServices) * 100 : 0,
            repeatRate: total.totalServices > 0 ? (total.repeats / total.totalServices) * 100 : 0,
            emptyRate: total.totalServices > 0 ? (total.emptyDetections / total.totalServices) * 100 : 0,
            cullRate: total.totalServices > 0 ? (total.culls / total.totalServices) * 100 : 0,
            deathRate: total.totalServices > 0 ? (total.deaths / total.totalServices) * 100 : 0,
        };
    }, [serviceOutcomes]);

    const lossesByGestationDays = React.useMemo(() => {
        const categories = ['0-20', '21-40', '41-60', '61-80', '81-100', '101-115', '115+'];
        const data = categories.map(name => ({ name, 'Repetición': 0, 'Aborto': 0, 'Vacía': 0 }));

        serviceOutcomes.forEach(o => {
            if (o.outcome === 'Aborto' || o.outcome === 'Repetición' || o.outcome === 'Vacía') {
                const days = o.gestationDays;
                let categoryIndex = -1;
                if (days <= 20) categoryIndex = 0;
                else if (days <= 40) categoryIndex = 1;
                else if (days <= 60) categoryIndex = 2;
                else if (days <= 80) categoryIndex = 3;
                else if (days <= 100) categoryIndex = 4;
                else if (days <= 115) categoryIndex = 5;
                else categoryIndex = 6;
                
                if (categoryIndex !== -1) {
                    if(o.outcome === 'Repetición') data[categoryIndex]['Repetición']++;
                    if(o.outcome === 'Aborto') data[categoryIndex]['Aborto']++;
                    if(o.outcome === 'Vacía') data[categoryIndex]['Vacía']++;
                }
            }
        });
        return data;
    }, [serviceOutcomes]);
    
    const kpiCards = [
        { title: 'TASA DE PARICIÓN (%)', value: totalMetrics.farrowingRate.toFixed(2), isGood: totalMetrics.farrowingRate > 85, goal: '> 85%' },
        { title: 'ABORTO (%)', value: totalMetrics.abortionRate.toFixed(2), isGood: totalMetrics.abortionRate < 2, goal: '< 2%' },
        { title: 'REPETICIÓN DE CELO (%)', value: totalMetrics.repeatRate.toFixed(2), isGood: totalMetrics.repeatRate < 10, goal: '< 10%' },
        { title: 'DETECTADA VACÍA (%)', value: totalMetrics.emptyRate.toFixed(2), isGood: totalMetrics.emptyRate < 3, goal: '< 3%' },
        { title: 'DESCARTE (%)', value: totalMetrics.cullRate.toFixed(2), isGood: totalMetrics.cullRate < 5, goal: '< 5%' },
        { title: 'MUERTE (%)', value: totalMetrics.deathRate.toFixed(2), isGood: totalMetrics.deathRate < 2, goal: '< 2%' },
    ];
    
     const handleExport = (formatType: 'pdf' | 'csv' | 'xlsx') => {
        const head = [
            ['Madre', 'Ciclo', 'Fecha Servicio', 'Resultado', 'Fecha Resultado', 'Días Gestación']
        ];
        const body = serviceOutcomes.map(o => [
            o.sowId,
            o.cycle,
            isValid(parseISO(o.serviceDate)) ? format(parseISO(o.serviceDate), 'dd/MM/yyyy') : 'N/A',
            o.outcome,
            isValid(parseISO(o.outcomeDate)) ? format(parseISO(o.outcomeDate), 'dd/MM/yyyy') : 'N/A',
            o.gestationDays
        ]);

        const title = "Análisis de Tasa de Parición - Listado de Madres";
        const dateRange = `Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} - ${format(parseISO(endDate), 'dd/MM/yyyy')}`;
        const fileName = `tasa_paricion_listado_${new Date().toISOString().split('T')[0]}`;

        if (formatType === 'pdf') {
            const doc = new jsPDF({ orientation: 'portrait' });
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
            XLSX.utils.book_append_sheet(wb, ws, "Tasa Parición");
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
                <h1 className="text-3xl font-bold tracking-tight">Análisis de Tasa de Parición</h1>
                 <Card>
                    <CardContent className="p-4">
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
                                <Label htmlFor="breed-filter">Buscar por raza</Label>
                                <Select value={breedFilter} onValueChange={setBreedFilter}>
                                    <SelectTrigger id="breed-filter"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {breedOptions.map(b => <SelectItem key={b} value={b}>{b === 'all' ? 'Todas las razas' : b}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <Button onClick={handleFilter} className="self-end">
                                <Filter className="mr-2 h-4 w-4" />
                                Filtrar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {kpiCards.map(kpi => (
                         <Card key={kpi.title}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold">{kpi.value}</span>
                                    <Circle className={`h-3 w-3 ${kpi.isGood ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`} />
                                </div>
                                <p className="text-xs text-muted-foreground">Meta: {kpi.goal}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader><CardTitle>Comparación de los Principales Índices</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold text-md mb-2 text-center">Tasa de parición (%)</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={metricsData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%"/>
                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                                    <Bar dataKey="farrowingRate" name="Tasa de Parición" fill="hsl(var(--chart-3))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                         <div>
                            <h3 className="font-semibold text-md mb-2 text-center">Aborto (%)</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={metricsData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%"/> 
                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                                    <Bar dataKey="abortionRate" name="Tasa de Abortos" fill="hsl(var(--chart-2))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="font-semibold text-md mb-2 text-center">Repetición de celo (%)</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={metricsData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%"/> 
                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                                    <Bar dataKey="repeatRate" name="Tasa de Repetición" fill="hsl(var(--chart-5))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="font-semibold text-md mb-2 text-center">Detectada vacía (%)</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={metricsData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%"/> 
                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                                    <Bar dataKey="emptyRate" name="Tasa de Vacías" fill="hsl(var(--chart-4))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                         <div>
                            <h3 className="font-semibold text-md mb-2 text-center">Descarte (%)</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={metricsData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%"/> 
                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                                    <Bar dataKey="cullRate" name="Tasa de Descarte" fill="hsl(var(--chart-1))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="font-semibold text-md mb-2 text-center">Muerte (%)</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={metricsData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%"/> 
                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                                    <Bar dataKey="deathRate" name="Tasa de Muertes" fill="hsl(var(--chart-3))" radius={[4,4,0,0]} style={{fill: 'purple'}}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader><CardTitle>Distribución de las pérdidas</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         <div>
                            <h3 className="font-semibold text-md mb-2 text-center">Pérdidas por días de gestación</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={lossesByGestationDays} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" fontSize={12}/>
                                    <YAxis type="category" dataKey="name" fontSize={12} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Repetición" stackId="a" fill="hsl(var(--chart-5))" />
                                    <Bar dataKey="Aborto" stackId="a" fill="hsl(var(--chart-2))" />
                                    <Bar dataKey="Vacía" stackId="a" fill="hsl(var(--chart-4))" radius={[0,4,4,0]}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="font-semibold text-md mb-2 text-center">Pérdidas por ciclo de la madre</h3>
                             <Table>
                                <TableHeader><TableRow><TableHead>Ciclo</TableHead><TableHead>Servicios</TableHead><TableHead>Parición (%)</TableHead><TableHead>Repetición (%)</TableHead><TableHead>Aborto (%)</TableHead></TableRow></TableHeader>
                                 <TableBody>
                                    {
                                        Array.from(new Set(serviceOutcomes.map(o => o.cycle))).sort((a,b)=>a-b).map(cycle => {
                                            const cycleOutcomes = serviceOutcomes.filter(o => o.cycle === cycle);
                                            const total = cycleOutcomes.length;
                                            const farrowings = cycleOutcomes.filter(o => o.outcome === 'Parto').length;
                                            const repeats = cycleOutcomes.filter(o => o.outcome === 'Repetición').length;
                                            const abortions = cycleOutcomes.filter(o => o.outcome === 'Aborto').length;
                                            return (
                                                <TableRow key={cycle}>
                                                    <TableCell>{cycle}</TableCell>
                                                    <TableCell>{total}</TableCell>
                                                    <TableCell>{total > 0 ? (farrowings/total*100).toFixed(1) : '0.0'}%</TableCell>
                                                    <TableCell>{total > 0 ? (repeats/total*100).toFixed(1) : '0.0'}%</TableCell>
                                                    <TableCell>{total > 0 ? (abortions/total*100).toFixed(1) : '0.0'}%</TableCell>
                                                </TableRow>
                                            )
                                        })
                                    }
                                 </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Listado de Madres</CardTitle>
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
                             <TableHeader><TableRow><TableHead>Madre</TableHead><TableHead>Ciclo</TableHead><TableHead>Fecha Servicio</TableHead><TableHead>Resultado</TableHead><TableHead>Fecha Resultado</TableHead><TableHead>Días Gestación</TableHead></TableRow></TableHeader>
                             <TableBody>
                                {serviceOutcomes.map((o,i) => (
                                    <TableRow key={`${o.sowId}-${i}`}>
                                        <TableCell><Link href={`/gestation/${o.sowId}`} className="text-primary underline">{o.sowId}</Link></TableCell>
                                        <TableCell>{o.cycle}</TableCell>
                                        <TableCell>{format(parseISO(o.serviceDate), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>{o.outcome}</TableCell>
                                        <TableCell>{format(parseISO(o.outcomeDate), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>{o.gestationDays}</TableCell>
                                    </TableRow>
                                ))}
                             </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}    

