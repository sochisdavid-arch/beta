
"use client";

import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, CalendarIcon, MoreHorizontal, SlidersHorizontal, BarChart2, Circle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO, differenceInDays, startOfDay, endOfDay, sub, eachYearOfInterval, eachMonthOfInterval, eachWeekOfInterval, getDay, getHours, getWeek, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Event {
    id: string;
    type: string;
    date: string;
    details?: string;
    liveBorn?: number;
    stillborn?: number;
    mummified?: number;
    birthWeight?: number;
    duration?: number;
    [key: string]: any;
}

interface Pig {
    id: string;
    breed: string;
    birthDate: string;
    events: Event[];
}

interface FarrowingData {
    sowId: string;
    farrowingDate: string;
    cycle: number;
    breed: string;
    totalBorn: number;
    liveBorn: number;
    stillborn: number;
    mummified: number;
    birthWeight?: number;
    gestationDays: number;
    duration?: number;
}

const pigBreeds = [
  "Duroc", "Yorkshire", "Landrace", "Hampshire", "Pietrain", "Berkshire", "Chester White", "Spotted", "Poland China", "Tamworth", "Large Black", "Cerdo Ibérico",
  "PIC", "Topigs Norsvin", "Hypor (Hendrix Genetics)", "DanBred", "Genus", "Choice Genetics", "Genesus",
  "Otro"
];

const KpiCard = ({ title, value, subValue, isGood, isBad }: { title: string, value: string | number, subValue?: string, isGood?: boolean, isBad?: boolean }) => (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{value}</span>
                {isGood !== undefined && <Circle className={`h-3 w-3 ${isGood ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`} />}
            </div>
            {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
        </CardContent>
    </Card>
);

export default function BirthAnalysisPage() {
    const [allPigs, setAllPigs] = React.useState<Pig[]>([]);
    const [farrowingData, setFarrowingData] = React.useState<FarrowingData[]>([]);

    // Filter states
    const [startDate, setStartDate] = React.useState<string>(format(sub(new Date(), { years: 1 }), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [breedFilter, setBreedFilter] = React.useState('all');
    const [cycleStart, setCycleStart] = React.useState<string | number>(1);
    const [cycleEnd, setCycleEnd] = React.useState<string | number>(20);
    const [timeGroup, setTimeGroup] = React.useState<'week' | 'month' | 'year'>('month');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);

    // Data for rendering
    const [kpiData, setKpiData] = React.useState<any>({});
    const [monthlyData, setMonthlyData] = React.useState<any[]>([]);
    const [distributionData, setDistributionData] = React.useState<any>({});
    const [heatmapData, setHeatmapData] = React.useState<number[][]>([]);


    React.useEffect(() => {
        const pigsFromStorage = localStorage.getItem('pigs');
        if (pigsFromStorage) {
            setAllPigs(JSON.parse(pigsFromStorage));
        }
    }, []);

    const handleFilter = React.useCallback(() => {
        const start = startOfDay(parseISO(startDate));
        const end = endOfDay(parseISO(endDate));
        
        let filteredPigs = allPigs;
        if(breedFilter !== 'all') {
            filteredPigs = filteredPigs.filter(p => p.breed === breedFilter);
        }
        
        const farrowings: FarrowingData[] = [];
        filteredPigs.forEach(pig => {
            let cycle = 0;
            const sortedEvents = [...pig.events].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            let lastServiceDate: string | null = null;
            sortedEvents.forEach(event => {
                if(event.type === 'Inseminación' || event.type === 'Monta Natural') {
                    lastServiceDate = event.date;
                }
                if (event.type === 'Parto') {
                    cycle++;
                    const farrowingDate = parseISO(event.date);
                    if (farrowingDate >= start && farrowingDate <= end && cycle >= Number(cycleStart) && cycle <= Number(cycleEnd)) {
                        const gestationDays = lastServiceDate ? differenceInDays(farrowingDate, parseISO(lastServiceDate)) : 0;
                        const liveBorn = event.liveBorn || 0;
                        const stillborn = event.stillborn || 0;
                        const mummified = event.mummified || 0;
                        
                        farrowings.push({
                            sowId: pig.id,
                            farrowingDate: event.date,
                            cycle: cycle,
                            breed: pig.breed,
                            totalBorn: liveBorn + stillborn + mummified,
                            liveBorn: liveBorn,
                            stillborn: stillborn,
                            mummified: mummified,
                            birthWeight: event.birthWeight,
                            gestationDays: gestationDays,
                            duration: event.duration
                        });
                    }
                    lastServiceDate = null; // Reset after farrowing
                }
            });
        });

        setFarrowingData(farrowings);

        // --- Calculate KPIs ---
        const totalFarrowings = farrowings.length;
        if (totalFarrowings > 0) {
            const totalLiveBorn = farrowings.reduce((sum, f) => sum + f.liveBorn, 0);
            const totalBorn = farrowings.reduce((sum, f) => sum + f.totalBorn, 0);
            const totalStillborn = farrowings.reduce((sum, f) => sum + f.stillborn, 0);
            const totalMummified = farrowings.reduce((sum, f) => sum + f.mummified, 0);
            const farrowingsWithWeight = farrowings.filter(f => f.birthWeight && f.birthWeight > 0);
            const totalWeight = farrowingsWithWeight.reduce((sum, f) => sum + f.birthWeight!, 0);

            setKpiData({
                totalFarrowings,
                totalLiveBorn,
                avgTotalBorn: totalBorn / totalFarrowings,
                avgLiveBorn: totalLiveBorn / totalFarrowings,
                birthLossPercent: totalBorn > 0 ? ((totalStillborn + totalMummified) / totalBorn) * 100 : 0,
                avgBirthWeight: farrowingsWithWeight.length > 0 ? totalWeight / farrowingsWithWeight.length : 0,
            });
            
            // --- Monthly/Weekly/Yearly Data ---
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
                const periodFarrowings = farrowings.filter(f => getPeriodKey(parseISO(f.farrowingDate)) === periodKey);
                const pfCount = periodFarrowings.length;

                if (pfCount === 0) return { name: getPeriodLabel(period), partos: 0, nacidosTotales: 0, nacidosVivos: 0, momificados: 0, nacidosMuertos: 0, pesoMedio: 0 };
                
                const pLiveBorn = periodFarrowings.reduce((s,f) => s + f.liveBorn, 0);
                const pTotalBorn = periodFarrowings.reduce((s,f) => s + f.totalBorn, 0);
                const pStillborn = periodFarrowings.reduce((s,f) => s + f.stillborn, 0);
                const pMummified = periodFarrowings.reduce((s,f) => s + f.mummified, 0);
                
                return {
                    name: getPeriodLabel(period),
                    partos: pfCount,
                    nacidosTotales: pTotalBorn / pfCount,
                    nacidosVivos: pLiveBorn / pfCount,
                    momificados: pTotalBorn > 0 ? (pMummified / pTotalBorn) * 100 : 0,
                    nacidosMuertos: pTotalBorn > 0 ? (pStillborn / pTotalBorn) * 100 : 0,
                    pesoMedio: periodFarrowings.filter(f => f.birthWeight).reduce((s,f)=> s + f.birthWeight!, 0) / periodFarrowings.filter(f => f.birthWeight).length || 0,
                };
            });
            setMonthlyData(groupedMetrics);
            
            // --- Distribution Data ---
            const gestationDays = [
                { name: '< 113', value: (farrowings.filter(f => f.gestationDays < 113).length / totalFarrowings) * 100 },
                { name: '114-115', value: (farrowings.filter(f => f.gestationDays >= 114 && f.gestationDays <= 115).length / totalFarrowings) * 100 },
                { name: '116-117', value: (farrowings.filter(f => f.gestationDays >= 116 && f.gestationDays <= 117).length / totalFarrowings) * 100 },
                { name: '> 117', value: (farrowings.filter(f => f.gestationDays > 117).length / totalFarrowings) * 100 },
            ];
             const cycle = [
                { name: '1', value: (farrowings.filter(f => f.cycle === 1).length / totalFarrowings) * 100 },
                { name: '2-3', value: (farrowings.filter(f => f.cycle >= 2 && f.cycle <= 3).length / totalFarrowings) * 100 },
                { name: '4-6', value: (farrowings.filter(f => f.cycle >= 4 && f.cycle <= 6).length / totalFarrowings) * 100 },
                { name: '> 6', value: (farrowings.filter(f => f.cycle > 6).length / totalFarrowings) * 100 },
            ];
            const farrowingsWithDuration = farrowings.filter(f => f.duration);
            const duration = farrowingsWithDuration.length > 0 ? [
                { name: '< 2h', value: (farrowingsWithDuration.filter(f => f.duration! < 2).length / farrowingsWithDuration.length) * 100 },
                { name: '2-3h', value: (farrowingsWithDuration.filter(f => f.duration! >= 2 && f.duration! <= 3).length / farrowingsWithDuration.length) * 100 },
                { name: '3-5h', value: (farrowingsWithDuration.filter(f => f.duration! > 3 && f.duration! <= 5).length / farrowingsWithDuration.length) * 100 },
                { name: '> 5h', value: (farrowingsWithDuration.filter(f => f.duration! > 5).length / farrowingsWithDuration.length) * 100 },
            ] : [];
            setDistributionData({ gestationDays, cycle, duration });
            
            // --- Heatmap Data ---
            const heatmap = Array(5).fill(0).map(() => Array(7).fill(0)); // 5 time slots, 7 days
            farrowings.forEach(f => {
                const date = parseISO(f.farrowingDate);
                const day = getDay(date) === 0 ? 6 : getDay(date) - 1; // 0 Mon, 6 Sun
                const hour = getHours(date);
                let hourIndex = 0;
                if(hour >= 0 && hour < 6) hourIndex = 3;
                else if (hour >= 6 && hour < 12) hourIndex = 2;
                else if (hour >= 12 && hour < 18) hourIndex = 1;
                else if (hour >= 18 && hour < 24) hourIndex = 0;
                
                heatmap[hourIndex][day]++;
            });
            const heatmapPercent = heatmap.map(row => row.map(cell => totalFarrowings > 0 ? (cell / totalFarrowings) * 100 : 0));
            const totalRow = Array(7).fill(0).map((_, colIndex) => heatmapPercent.reduce((sum, row) => sum + row[colIndex], 0));
            const finalHeatmap = heatmapPercent.map((row, rowIndex) => [...row, heatmapPercent[rowIndex].reduce((sum, cell) => sum + cell, 0)]);
            finalHeatmap.push([...totalRow, totalRow.reduce((s,c) => s+c, 0)]);

            setHeatmapData(finalHeatmap);


        } else {
            setKpiData({});
            setMonthlyData([]);
            setDistributionData({});
            setHeatmapData([]);
        }

    }, [allPigs, startDate, endDate, breedFilter, cycleStart, cycleEnd, timeGroup]);
    
    React.useEffect(() => {
        if(allPigs.length > 0) handleFilter();
    }, [allPigs, handleFilter]);

    const timeGroupOptions: { value: 'year' | 'month' | 'week'; label: string }[] = [
        { value: 'year', label: 'Año' },
        { value: 'month', label: 'Mes' },
        { value: 'week', label: 'Semana' },
    ];
    
    const paginatedData = farrowingData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const totalPages = Math.ceil(farrowingData.length / rowsPerPage);

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <h1 className="text-3xl font-bold tracking-tight">Análisis de nacimientos</h1>
                <Card>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
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
                                <Label htmlFor="breed-filter">Buscar por raza</Label>
                                <Select value={breedFilter} onValueChange={setBreedFilter}>
                                    <SelectTrigger id="breed-filter"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las razas</SelectItem>
                                        {pigBreeds.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Ciclo entre</Label>
                                <div className="flex items-center gap-2">
                                    <Input type="number" placeholder="1" value={cycleStart} onChange={e => setCycleStart(e.target.value)} />
                                    <span>a</span>
                                    <Input type="number" placeholder="20" value={cycleEnd} onChange={e => setCycleEnd(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon"><SlidersHorizontal className="h-4 w-4"/></Button>
                                <Button className="w-full" onClick={handleFilter}>Filtrar</Button>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <KpiCard title="TOTAL DE PARTOS" value={kpiData.totalFarrowings || 0} subValue={`Nacidos Vivos: ${kpiData.totalLiveBorn || 0}`} />
                    <KpiCard title="NACIDOS TOTALES" value={kpiData.avgTotalBorn?.toFixed(2) || '0.00'} subValue="Meta: 14,43" isBad={(kpiData.avgTotalBorn || 0) < 14.43}/>
                    <KpiCard title="% PÉRDIDAS DE NACIMIENTO" value={`${kpiData.birthLossPercent?.toFixed(2) || '0.00'}%`} subValue="Meta: 1,80" isGood={(kpiData.birthLossPercent || 0) < 1.8}/>
                    <KpiCard title="NACIDOS VIVOS" value={kpiData.avgLiveBorn?.toFixed(2) || '0.00'} subValue="Meta: 14,00" isBad={(kpiData.avgLiveBorn || 0) < 14}/>
                    <KpiCard title="PESO MEDIO (KG)" value={kpiData.avgBirthWeight?.toFixed(2) || '0.00'} subValue="Meta: 1,38" isGood={(kpiData.avgBirthWeight || 0) >= 1.38}/>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Comparación de los Principales Índices</CardTitle>
                            <div className="flex items-center gap-1 border p-1 rounded-md">
                                {timeGroupOptions.map(opt => (
                                    <Button
                                        key={opt.value}
                                        variant={timeGroup === opt.value ? 'secondary' : 'outline'}
                                        size="sm"
                                        onClick={() => setTimeGroup(opt.value)}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div>
                             <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} allowDecimals={false}/>
                                    <Tooltip />
                                    <Bar dataKey="partos" name="Total de Partos" fill="hsl(var(--chart-5))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 20]}/>
                                    <Tooltip formatter={(v, n) => [`${Number(v).toFixed(2)}`, n === 'nacidosTotales' ? 'Nacidos Totales' : 'Nacidos Vivos']}/>
                                    <Legend />
                                    <Bar dataKey="nacidosTotales" name="Media de Nacidos Totales" fill="hsl(var(--chart-2))" radius={[4,4,0,0]} />
                                    <Bar dataKey="nacidosVivos" name="Media de Nacidos Vivos" fill="hsl(var(--chart-3))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                         <div>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} unit="%" domain={[0, 'dataMax + 2']}/>
                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`}/>
                                     <Legend />
                                    <Bar dataKey="momificados" name="% Momificados" stackId="a" fill="hsl(var(--chart-4))" />
                                    <Bar dataKey="nacidosMuertos" name="% Nacidos Muertos" stackId="a" fill="hsl(var(--chart-5))" radius={[4,4,0,0]}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 'dataMax + 0.5']}/>
                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)} kg`}/>
                                    <Legend />
                                    <Bar dataKey="pesoMedio" name="Peso Medio" fill="hsl(var(--chart-1))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Distribución de Nacimientos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="partos">
                            <TabsList>
                                <TabsTrigger value="partos">Partos</TabsTrigger>
                            </TabsList>
                            <TabsContent value="partos" className="mt-4">
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                   <Card>
                                       <CardHeader><CardTitle className="text-sm">Días de gestación</CardTitle></CardHeader>
                                       <CardContent>
                                           <ResponsiveContainer width="100%" height={150}>
                                                <BarChart data={distributionData.gestationDays} layout="vertical">
                                                    <XAxis type="number" hide unit="%"/>
                                                    <YAxis type="category" dataKey="name" width={60} fontSize={10}/>
                                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                                                    <Bar dataKey="value" fill="hsl(var(--chart-5))" radius={[0,4,4,0]}/>
                                                </BarChart>
                                           </ResponsiveContainer>
                                       </CardContent>
                                   </Card>
                                   <Card>
                                       <CardHeader><CardTitle className="text-sm">Ciclo medio</CardTitle></CardHeader>
                                       <CardContent>
                                           <ResponsiveContainer width="100%" height={150}>
                                                <BarChart data={distributionData.cycle} layout="vertical">
                                                    <XAxis type="number" hide unit="%"/>
                                                    <YAxis type="category" dataKey="name" width={40} fontSize={10}/>
                                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                                                    <Bar dataKey="value" fill="hsl(var(--chart-5))" radius={[0,4,4,0]}/>
                                                </BarChart>
                                           </ResponsiveContainer>
                                       </CardContent>
                                   </Card>
                                   <Card>
                                       <CardHeader><CardTitle className="text-sm">Duración</CardTitle></CardHeader>
                                       <CardContent>
                                           <ResponsiveContainer width="100%" height={150}>
                                                <BarChart data={distributionData.duration} layout="vertical">
                                                    <XAxis type="number" hide unit="%"/>
                                                    <YAxis type="category" dataKey="name" width={50} fontSize={10}/>
                                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                                                    <Bar dataKey="value" fill="hsl(var(--chart-5))" radius={[0,4,4,0]}/>
                                                </BarChart>
                                           </ResponsiveContainer>
                                       </CardContent>
                                   </Card>
                               </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                 </Card>

                 <Card>
                     <CardHeader><CardTitle>Día de la Semana/Horario</CardTitle></CardHeader>
                     <CardContent>
                         <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs text-center">
                                <thead>
                                    <tr className="bg-muted/50">
                                        <th className="p-2 border font-normal">Horario</th>
                                        <th className="p-2 border font-normal">Lunes</th>
                                        <th className="p-2 border font-normal">Martes</th>
                                        <th className="p-2 border font-normal">Miércoles</th>
                                        <th className="p-2 border font-normal">Jueves</th>
                                        <th className="p-2 border font-normal">Viernes</th>
                                        <th className="p-2 border font-normal">Sábado</th>
                                        <th className="p-2 border font-normal">Domingo</th>
                                        <th className="p-2 border font-normal">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {heatmapData.length > 0 && ['18:00-23:59','12:00-17:59','06:00-11:59','00:00-05:59','Total'].map((label, rowIndex) => (
                                        <tr key={rowIndex}>
                                            <td className="p-2 border font-medium text-left">
                                                {label}
                                            </td>
                                            {heatmapData[rowIndex]?.map((cell, cellIndex) => (
                                                <td key={cellIndex} className="p-2 border" style={{backgroundColor: `hsl(260, 100%, ${100 - (cell > 0 ? (cell/40 * 50) : 0)}%)`, color: cell > 20 ? 'white': 'inherit'}}>
                                                    {cell.toFixed(2)}%
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                     </CardContent>
                 </Card>

                 <Card>
                     <CardHeader><CardTitle>Listado de Madres</CardTitle></CardHeader>
                     <CardContent>
                         <p className="text-sm text-muted-foreground mb-4">Todas las madres que componen a esta consulta</p>
                          <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Madre</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Ciclo</TableHead>
                                        <TableHead>Raza</TableHead>
                                        <TableHead>Total de nacidos</TableHead>
                                        <TableHead>Nacidos vivos</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedData.length > 0 ? paginatedData.map((f, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Link href={`/analysis/sow-card?sowId=${f.sowId}`} className="text-primary underline">{f.sowId}</Link></TableCell>
                                            <TableCell>{format(parseISO(f.farrowingDate), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>{f.cycle}</TableCell>
                                            <TableCell>{f.breed}</TableCell>
                                            <TableCell>{f.totalBorn}</TableCell>
                                            <TableCell>{f.liveBorn}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={6} className="text-center h-24">No hay datos para los filtros seleccionados.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                          </div>
                          <div className="flex items-center justify-between mt-4 text-sm">
                              <div className="flex gap-1">
                                  {Array.from({length: totalPages}, (_, i) => i + 1).map(page => (
                                      <Button key={page} variant={currentPage === page ? 'default': 'outline'} size="icon" className="h-8 w-8" onClick={() => setCurrentPage(page)}>{page}</Button>
                                  ))}
                              </div>
                              <div className="text-muted-foreground">
                                  Total de resultados: {farrowingData.length}
                              </div>
                              <div className="flex items-center gap-2">
                                <Label>Líneas por página:</Label>
                                <Select value={String(rowsPerPage)} onValueChange={(v) => setRowsPerPage(Number(v))}>
                                    <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                              </div>
                          </div>
                     </CardContent>
                 </Card>
            </div>
        </AppLayout>
    );
}

