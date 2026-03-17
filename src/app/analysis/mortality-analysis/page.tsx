
"use client";

import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, CalendarIcon, MoreHorizontal } from 'lucide-react';
import { format, parseISO, isValid, differenceInDays, startOfDay, endOfDay, sub, eachMonthOfInterval, eachWeekOfInterval, eachYearOfInterval, getWeek, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Link from 'next/link';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Event {
    id: string;
    type: string;
    date: string;
    details?: string;
    liveBorn?: number;
    stillborn?: number;
    mummified?: number;
    pigletCount?: number;
    cause?: string;
    ageAtDeath?: number;
    [key: string]: any;
}

interface Pig {
    id: string;
    breed: string;
    birthDate: string;
    events: Event[];
}

interface MortalityData {
    sowId: string;
    farrowingDate: string;
    deathDate: string;
    deathCount: number;
    cycle: number;
    breed: string;
    cause: string;
    ageAtDeath: number;
}

const KpiCard = ({ title, value, meta, isBad }: { title: string, value: string | number, meta?: string, isBad?: boolean }) => (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{value}</span>
                {isBad !== undefined && <div className={`h-2.5 w-2.5 rounded-full ${isBad ? 'bg-red-500' : 'bg-green-500'}`} />}
            </div>
             {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
        </CardContent>
    </Card>
);

export default function MortalityAnalysisPage() {
    const [allPigs, setAllPigs] = React.useState<Pig[]>([]);
    const [mortalityData, setMortalityData] = React.useState<MortalityData[]>([]);

    // Filter states
    const [startDate, setStartDate] = React.useState<string>(format(sub(new Date(), { years: 1 }), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [timeGroup, setTimeGroup] = React.useState<'week' | 'month' | 'year'>('month');
    const [chartType, setChartType] = React.useState<'quantity' | 'percentage'>('quantity');
    const [valueAnalyzed, setValueAnalyzed] = React.useState<'period' | 'weaning'>('period');

    // Data for rendering
    const [kpiData, setKpiData] = React.useState<any>({});
    const [chartData, setChartData] = React.useState<any[]>([]);
    const [ageDistributionData, setAgeDistributionData] = React.useState<any>({});
    const [causeDistributionData, setCauseDistributionData] = React.useState<any[]>([]);
    const [paginatedData, setPaginatedData] = React.useState<MortalityData[]>([]);
    const [currentPage, setCurrentPage] = React.useState(1);
    const rowsPerPage = 10;

    React.useEffect(() => {
        const pigsFromStorage = localStorage.getItem('pigs');
        if (pigsFromStorage) {
            setAllPigs(JSON.parse(pigsFromStorage));
        }
    }, []);

    const handleFilter = React.useCallback(() => {
        const start = startOfDay(parseISO(startDate));
        const end = endOfDay(parseISO(endDate));
        
        const deaths: MortalityData[] = [];
        let totalLiveBorn = 0;

        allPigs.forEach(pig => {
            let cycle = 0;
            let lastFarrowingDate: string | null = null;
            let liveBornThisCycle = 0;
            const sortedEvents = [...pig.events].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            sortedEvents.forEach(event => {
                if(event.type === 'Parto') {
                    cycle++;
                    lastFarrowingDate = event.date;
                    liveBornThisCycle = event.liveBorn || 0;
                    totalLiveBorn += liveBornThisCycle;
                }
                
                if (valueAnalyzed === 'period' && event.type === 'Muerte de Lechón' && lastFarrowingDate) {
                    const deathDate = parseISO(event.date);
                    if (deathDate >= start && deathDate <= end) {
                        const ageAtDeath = differenceInDays(deathDate, parseISO(lastFarrowingDate));
                        deaths.push({
                            sowId: pig.id,
                            farrowingDate: lastFarrowingDate,
                            deathDate: event.date,
                            deathCount: event.pigletCount || 1,
                            cycle: cycle,
                            breed: pig.breed,
                            cause: event.cause || 'Desconocida',
                            ageAtDeath: ageAtDeath,
                        });
                    }
                }
                 
                 if (valueAnalyzed === 'weaning' && event.type === 'Destete' && lastFarrowingDate) {
                     const weaningDate = parseISO(event.date);
                     if (weaningDate >= start && weaningDate <= end) {
                         const weanedCount = event.pigletCount || 0;
                         const mortalityThisCycle = (liveBornThisCycle - weanedCount) > 0 ? (liveBornThisCycle - weanedCount) : 0;
                         if (mortalityThisCycle > 0) {
                            deaths.push({
                                sowId: pig.id,
                                farrowingDate: lastFarrowingDate,
                                deathDate: event.date,
                                deathCount: mortalityThisCycle,
                                cycle: cycle,
                                breed: pig.breed,
                                cause: 'Relacionada al destete',
                                ageAtDeath: differenceInDays(weaningDate, parseISO(lastFarrowingDate))
                            })
                         }
                     }
                 }

                 if(event.type === 'Destete') {
                    lastFarrowingDate = null; // Reset after weaning
                 }
            });
        });

        setMortalityData(deaths);

        // --- Calculate KPIs ---
        const totalDeaths = deaths.reduce((sum, d) => sum + d.deathCount, 0);
        setKpiData({
            totalDeaths: totalDeaths,
            mortalityPercent: totalLiveBorn > 0 ? (totalDeaths / totalLiveBorn) * 100 : 0
        });

        // --- Chart Data ---
        let periods: Date[] = [];
        let getPeriodKey: (d: Date) => string;
        let getPeriodLabel: (d: Date) => string;

        if (timeGroup === 'month') {
            periods = eachMonthOfInterval({ start, end });
            getPeriodKey = (d) => format(d, 'yyyy-MM');
            getPeriodLabel = (d) => format(d, 'MMM yy', { locale: es });
        } else if (timeGroup === 'week') {
            periods = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
            getPeriodKey = (d) => `${getYear(d)}-W${getWeek(d, { weekStartsOn: 1 })}`;
            getPeriodLabel = (d) => `Sem ${getWeek(d, { weekStartsOn: 1 })}`;
        } else { // year
            periods = eachYearOfInterval({ start, end });
            getPeriodKey = (d) => getYear(d).toString();
            getPeriodLabel = (d) => getYear(d).toString();
        }

        const groupedMetrics = periods.map(period => {
            const periodKey = getPeriodKey(period);
            const periodDeaths = deaths.filter(d => getPeriodKey(parseISO(d.deathDate)) === periodKey);
            const periodDeathCount = periodDeaths.reduce((s,d) => s + d.deathCount, 0);

            // This is an approximation. A more accurate live born count per period would be needed.
            const periodLiveBorn = totalLiveBorn > 0 ? totalLiveBorn / periods.length : 1; 
            
            return {
                name: getPeriodLabel(period),
                quantity: periodDeathCount,
                percentage: periodLiveBorn > 0 ? (periodDeathCount / periodLiveBorn) * 100 : 0
            };
        });
        setChartData(groupedMetrics);

        // --- Age Distribution ---
        const ageCounts = deaths.reduce((acc, death) => {
            const age = death.ageAtDeath;
            acc[age] = (acc[age] || 0) + death.deathCount;
            return acc;
        }, {} as Record<number, number>);

        const ageBarData = [
            { name: '< 5', value: deaths.filter(d => d.ageAtDeath <= 5).reduce((s,d) => s + d.deathCount, 0)},
            { name: '6-10', value: deaths.filter(d => d.ageAtDeath > 5 && d.ageAtDeath <= 10).reduce((s,d) => s + d.deathCount, 0)},
            { name: '11-20', value: deaths.filter(d => d.ageAtDeath > 10 && d.ageAtDeath <= 20).reduce((s,d) => s + d.deathCount, 0)},
            { name: '> 21', value: deaths.filter(d => d.ageAtDeath > 21).reduce((s,d) => s + d.deathCount, 0)},
        ].map(d => ({...d, value: totalDeaths > 0 ? (d.value / totalDeaths) * 100 : 0 }));
        
        const ageAreaData = Array.from({length: 21}, (_, i) => ({ age: i, muertes: ageCounts[i] || 0 }));
        
        setAgeDistributionData({ bar: ageBarData, area: ageAreaData });

        // --- Cause Distribution ---
        const causeCounts = deaths.reduce((acc, death) => {
            const cause = death.cause;
            acc[cause] = (acc[cause] || 0) + death.deathCount;
            return acc;
        }, {} as Record<string, number>);

        const causeData = Object.entries(causeCounts)
            .map(([name, value]) => ({ name, value, percentage: totalDeaths > 0 ? (value / totalDeaths) * 100 : 0 }))
            .sort((a,b) => b.value - a.value);
        
        setCauseDistributionData(causeData);

    }, [allPigs, startDate, endDate, timeGroup, valueAnalyzed]);

    React.useEffect(() => {
        if(allPigs.length > 0) handleFilter();
    }, [allPigs, handleFilter]);

    React.useEffect(() => {
        setPaginatedData(mortalityData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage));
    }, [currentPage, mortalityData]);

    const timeGroupOptions: { value: 'year' | 'month' | 'week'; label: string }[] = [
        { value: 'year', label: 'Año' },
        { value: 'month', label: 'Mes' },
        { value: 'week', label: 'Semana' },
    ];

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <h1 className="text-3xl font-bold tracking-tight">Análisis de mortalidad</h1>
                 <Card>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="start-date">Fecha inicial</Label>
                                <div className="relative">
                                    <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="pr-8"/>
                                    <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-date">Fecha final</Label>
                                 <div className="relative">
                                    <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="pr-8"/>
                                    <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="value-analyzed">Valor analizado</Label>
                                <Select value={valueAnalyzed} onValueChange={(v) => setValueAnalyzed(v as any)}>
                                    <SelectTrigger id="value-analyzed"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="period">Mortalidad del periodo</SelectItem>
                                        <SelectItem value="weaning">Mortalidad relacionada al destete</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="flex items-center gap-2">
                                <Button className="w-full" onClick={handleFilter}>Filtrar</Button>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                    <KpiCard title="TOTAL DE MUERTES" value={kpiData.totalDeaths || 0} />
                    <KpiCard title="MUERTES (%)" value={`${kpiData.mortalityPercent?.toFixed(2) || '0.00'}`} meta="Meta: 7,14" isBad={(kpiData.mortalityPercent || 0) > 7.14}/>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Comparación de los Principales Índices</CardTitle>
                             <div className="flex items-center gap-1 border p-1 rounded-md">
                                {timeGroupOptions.map(opt => (
                                    <Button key={opt.value} variant={timeGroup === opt.value ? 'secondary' : 'outline'} size="sm" onClick={() => setTimeGroup(opt.value)} >
                                        {opt.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex gap-8">
                        <RadioGroup defaultValue="quantity" onValueChange={(v) => setChartType(v as any)} className="space-y-2">
                             <Label>Total de muertes</Label>
                             <div className="flex items-center space-x-2">
                               <RadioGroupItem value="quantity" id="quantity" />
                               <Label htmlFor="quantity">Cantidad</Label>
                             </div>
                             <div className="flex items-center space-x-2">
                               <RadioGroupItem value="percentage" id="percentage" />
                               <Label htmlFor="percentage">Porcentaje</Label>
                             </div>
                        </RadioGroup>
                         <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} unit={chartType === 'percentage' ? '%' : ''}/>
                                <Tooltip formatter={(v) => chartType === 'percentage' ? `${Number(v).toFixed(2)}%` : v} />
                                <Legend />
                                <Bar dataKey={chartType} name={chartType === 'quantity' ? 'Cantidad' : 'Porcentaje'} fill="hsl(var(--chart-4))" radius={[4,4,0,0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>DISTRIBUCIÓN DE MORTALIDAD</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <Label>Edad</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={ageDistributionData.bar} layout="vertical">
                                    <XAxis type="number" unit="%" hide/>
                                    <YAxis type="category" dataKey="name" width={60} fontSize={10} tickLine={false} axisLine={false}/>
                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                                    <Bar dataKey="value" fill="hsl(var(--chart-4))" radius={[0,4,4,0]}/>
                                </BarChart>
                            </ResponsiveContainer>
                             <div className="md:col-span-2">
                                <ResponsiveContainer width="100%" height={250}>
                                    <AreaChart data={ageDistributionData.area}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="age" name="Edad (días)" fontSize={10} unit="d"/>
                                        <YAxis allowDecimals={false} fontSize={10}/>
                                        <Tooltip />
                                        <Area type="monotone" dataKey="muertes" name="Nº Muertes" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4) / 0.3)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader><CardTitle>Por categorías</CardTitle></CardHeader>
                    <CardContent>
                        <RadioGroup defaultValue="causa" className="flex gap-4 mb-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="causa" id="causa" /><Label htmlFor="causa">Causa</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="empleado" id="empleado" disabled/><Label htmlFor="empleado">Empleado</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="dia" id="dia" disabled/><Label htmlFor="dia">Día de la Semana</Label></div>
                        </RadioGroup>
                         <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={causeDistributionData} layout="vertical" margin={{ left: 100 }}>
                                <XAxis type="number" unit="%" hide/>
                                <YAxis type="category" dataKey="name" width={150} fontSize={10} tickLine={false} axisLine={false}/>
                                <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                                <Bar dataKey="percentage" fill="hsl(var(--chart-4))" radius={[0,4,4,0]}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                 </Card>

                  <Card>
                     <CardHeader><CardTitle>LISTADO DE MADRES</CardTitle></CardHeader>
                     <CardContent>
                          <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Madre</TableHead>
                                        <TableHead>Fecha de la muerte</TableHead>
                                        <TableHead>Ciclo</TableHead>
                                        <TableHead>Raza</TableHead>
                                        <TableHead>Muertes</TableHead>
                                        <TableHead>Causa</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedData.length > 0 ? paginatedData.map((d, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Link href={`/analysis/sow-card?sowId=${d.sowId}`} className="text-primary underline">{d.sowId}</Link></TableCell>
                                            <TableCell>{format(parseISO(d.deathDate), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>{d.cycle}</TableCell>
                                            <TableCell>{d.breed}</TableCell>
                                            <TableCell>{d.deathCount}</TableCell>
                                            <TableCell>{d.cause}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={6} className="text-center h-24">No hay datos para los filtros seleccionados.</TableCell></TableRow>
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
