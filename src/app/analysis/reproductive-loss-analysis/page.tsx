
"use client";

import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, Circle, SlidersHorizontal, BarChart2, Download } from 'lucide-react';
import { format, parseISO, isValid, differenceInDays, startOfDay, endOfDay, sub, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
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
                            outcomeFound = { sowId: pig.id, breed: pig.breed, serviceDate: event.date, outcome: outcomeType, outcomeDate: nextEvent.date, gestationDays, cycle: cycle + 1 };
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


export default function ReproductiveLossAnalysisPage() {
    const [pigs, setPigs] = React.useState<Pig[]>([]);
    const [breedOptions, setBreedOptions] = React.useState<string[]>([]);
    
    // Filter States
    const [startDate, setStartDate] = React.useState<string>(format(sub(new Date(), { years: 1 }), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [breedFilter, setBreedFilter] = React.useState('all');
    const [gestationDaysFilter, setGestationDaysFilter] = React.useState([0, 130]);

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
        
        const allOutcomes = calculateServiceOutcomes(filteredPigs, start, end);
        const outcomes = allOutcomes.filter(o => o.gestationDays >= gestationDaysFilter[0] && o.gestationDays <= gestationDaysFilter[1]);
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
            const totalFailures = data.abortions + data.repeats + data.emptyDetections + data.culls + data.deaths;
            const totalServices = data.farrowings + totalFailures;
            return {
                name: format(parseISO(`${monthKey}-01`), 'MMM yy', { locale: es }),
                ...data,
                totalServices,
                abortionRate: totalServices > 0 ? (data.abortions / totalServices) * 100 : 0,
                repeatRate: totalServices > 0 ? (data.repeats / totalServices) * 100 : 0,
                emptyRate: totalServices > 0 ? (data.emptyDetections / totalServices) * 100 : 0,
                cullRate: totalServices > 0 ? (data.culls / totalServices) * 100 : 0,
                deathRate: totalServices > 0 ? (data.deaths / totalServices) * 100 : 0,
            };
        });
        setMetricsData(calculatedMetrics);

    }, [pigs, startDate, endDate, breedFilter, gestationDaysFilter]);

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
        
        const totalFailures = total.totalServices - total.farrowings;
        return {
            abortionRate: totalFailures > 0 ? (total.abortions / totalFailures) * 100 : 0,
            repeatRate: totalFailures > 0 ? (total.repeats / totalFailures) * 100 : 0,
            emptyRate: totalFailures > 0 ? (total.emptyDetections / totalFailures) * 100 : 0,
            cullRate: totalFailures > 0 ? (total.culls / totalFailures) * 100 : 0,
            deathRate: totalFailures > 0 ? (total.deaths / totalFailures) * 100 : 0,
        };
    }, [serviceOutcomes]);

    const kpiCards = [
        { title: 'REPETICIÓN DE CELO (%)', value: totalMetrics.repeatRate.toFixed(2), isGood: totalMetrics.repeatRate < 10, goal: '< 10%' },
        { title: 'ABORTO (%)', value: totalMetrics.abortionRate.toFixed(2), isGood: totalMetrics.abortionRate < 2, goal: '< 2%' },
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

        const title = "Análisis de Pérdidas Reproductivas - Listado de Madres";
        const dateRange = `Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} - ${format(parseISO(endDate), 'dd/MM/yyyy')}`;

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
            doc.save(`perdidas_reproductivas_listado_${new Date().toISOString().split('T')[0]}.pdf`);
        }

        if (formatType === 'csv' || formatType === 'xlsx') {
            const dataToExport = [head[0], ...body];
            const ws = XLSX.utils.aoa_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Perdidas Reproductivas");
            XLSX.writeFile(wb, `perdidas_reproductivas_listado_${new Date().toISOString().split('T')[0]}.${formatType}`);
        }
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <h1 className="text-3xl font-bold tracking-tight">Análisis de Pérdidas Reproductivas</h1>
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
                            <div className="space-y-2 lg:col-span-2">
                                <Label>Días de gestación entre: {gestationDaysFilter[0]} y {gestationDaysFilter[1]}</Label>
                                <Slider
                                    defaultValue={gestationDaysFilter}
                                    onValueCommit={setGestationDaysFilter}
                                    max={130}
                                    step={1}
                                />
                            </div>
                            <Button onClick={handleFilter} className="self-end w-full lg:w-auto">
                                <Filter className="mr-2 h-4 w-4" />
                                Filtrar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Comparación de los Principales Índices</CardTitle>
                             <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm">Semana</Button>
                                <Button variant="default" size="sm">Mes</Button>
                                <Button variant="outline" size="sm">Trimestre</Button>
                                <Button variant="outline" size="sm">Año</Button>
                                <Button variant="outline" size="sm">Grupo</Button>
                             </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8">
                         <div>
                            <h3 className="font-semibold text-md mb-2">Repetición de celo (%)</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={metricsData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} unit="%"/> <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} /><Bar dataKey="repeatRate" name="Tasa de Repetición" fill="hsl(var(--chart-5))" radius={[4,4,0,0]} /></BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="font-semibold text-md mb-2">Aborto (%)</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={metricsData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} unit="%"/> <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} /><Bar dataKey="abortionRate" name="Tasa de Abortos" fill="hsl(var(--chart-2))" radius={[4,4,0,0]} /></BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="font-semibold text-md mb-2">Detectada vacía (%)</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={metricsData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} unit="%"/> <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} /><Bar dataKey="emptyRate" name="Tasa de Vacías" fill="hsl(var(--chart-4))" radius={[4,4,0,0]} /></BarChart>
                            </ResponsiveContainer>
                        </div>
                         <div>
                            <h3 className="font-semibold text-md mb-2">Descarte (%)</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={metricsData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} unit="%"/> <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} /><Bar dataKey="cullRate" name="Tasa de Descarte" fill="hsl(var(--chart-1))" radius={[4,4,0,0]} /></BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="font-semibold text-md mb-2">Muerte (%)</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={metricsData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} unit="%"/> <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} /><Bar dataKey="deathRate" name="Tasa de Muertes" fill="hsl(var(--chart-3))" radius={[4,4,0,0]} style={{fill: 'purple'}}/></BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader><CardTitle>Distribución de las pérdidas</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <Tabs defaultValue="repeat">
                            <TabsList>
                                <TabsTrigger value="repeat">Repetición de celo</TabsTrigger>
                                <TabsTrigger value="abortion">Aborto</TabsTrigger>
                                <TabsTrigger value="empty">Detectada vacía</TabsTrigger>
                                <TabsTrigger value="cull">Descarte</TabsTrigger>
                                <TabsTrigger value="death">Muerte</TabsTrigger>
                            </TabsList>
                            <TabsContent value="repeat" className="mt-4">
                               <p className="text-center text-muted-foreground">Análisis de distribución para Repetición de Celo.</p>
                            </TabsContent>
                        </Tabs>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-semibold text-md mb-2 text-center">Distribución por Días de Gestación</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <AreaChart data={Array.from({length: 120}, (_,i) => ({d:i+1, v: serviceOutcomes.filter(o=>o.gestationDays === i+1).length}))}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="d" name="Días" unit="d" fontSize={12}/>
                                        <YAxis allowDecimals={false} fontSize={12}/>
                                        <Tooltip />
                                        <Area type="monotone" dataKey="v" name="Nº Pérdidas" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5) / 0.3)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div>
                                <h3 className="font-semibold text-md mb-2 text-center">Distribución por Ciclo de la Madre</h3>
                                 <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={[]} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                                        <XAxis type="number" fontSize={12}/>
                                        <YAxis type="category" dataKey="name" fontSize={12}/>
                                        <Tooltip />
                                        <Bar dataKey="value" name="Pérdidas" fill="hsl(var(--chart-1))" />
                                    </BarChart>
                                 </ResponsiveContainer>
                            </div>
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



    