
"use client";

import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, CalendarIcon, MoreHorizontal, SlidersHorizontal, BarChart2 } from 'lucide-react';
import { format, parseISO, isValid, differenceInDays, startOfDay, endOfDay, sub, eachMonthOfInterval, eachWeekOfInterval, eachYearOfInterval, getWeek, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
    pigletCount?: number; // For weaning/death events
    weaningWeight?: number; // Total weight of weaned litter
    [key: string]: any;
}

interface Pig {
    id: string;
    breed: string;
    birthDate: string;
    events: Event[];
}

interface WeaningData {
    sowId: string;
    date: string;
    cycle: number;
    breed: string;
    weanedCount: number;
    age: number;
    weight?: number;
    gpd?: number;
    lactationDays: number;
    deathsDuringLactation: number;
    weaningType: string;
}

const pigBreeds = [
  "Duroc", "Yorkshire", "Landrace", "Hampshire", "Pietrain", "Berkshire", "Chester White", "Spotted", "Poland China", "Tamworth", "Large Black", "Cerdo Ibérico",
  "PIC", "Topigs Norsvin", "Hypor (Hendrix Genetics)", "DanBred", "Genus", "Choice Genetics", "Genesus",
  "Otro"
];

const KpiCard = ({ title, value, subValue, meta, isGood, isBad }: { title: string, value: string | number, subValue?: string, meta?:string, isGood?: boolean, isBad?: boolean }) => (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{value}</span>
                {isGood !== undefined && <div className={`h-2.5 w-2.5 rounded-full ${isGood ? 'bg-green-500' : 'bg-red-500'}`} />}
            </div>
             {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
        </CardContent>
    </Card>
);

export default function WeaningAnalysisPage() {
    const [allPigs, setAllPigs] = React.useState<Pig[]>([]);
    const [weaningData, setWeaningData] = React.useState<WeaningData[]>([]);

    // Filter states
    const [startDate, setStartDate] = React.useState<string>(format(sub(new Date(), { years: 1 }), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [breedFilter, setBreedFilter] = React.useState('all');
    const [cycleStart, setCycleStart] = React.useState<string | number>(1);
    const [cycleEnd, setCycleEnd] = React.useState<string | number>(20);
    const [timeGroup, setTimeGroup] = React.useState<'week' | 'month' | 'year'>('month');

    // Data for rendering
    const [kpiData, setKpiData] = React.useState<any>({});
    const [monthlyData, setMonthlyData] = React.useState<any[]>([]);
    const [distributionData, setDistributionData] = React.useState<any>({});
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
        
        let filteredPigs = allPigs;
        if(breedFilter !== 'all') {
            filteredPigs = filteredPigs.filter(p => p.breed === breedFilter);
        }

        const weanings: WeaningData[] = [];
        filteredPigs.forEach(pig => {
            let cycle = 0;
            const sortedEvents = [...pig.events].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            let lastFarrowingDate: string | null = null;
            let liveBornThisCycle = 0;
            let birthWeightThisCycle = 0;

            sortedEvents.forEach(event => {
                if (event.type === 'Parto') {
                    cycle++;
                    lastFarrowingDate = event.date;
                    liveBornThisCycle = event.liveBorn || 0;
                    birthWeightThisCycle = (event.litterWeight || 0) / (event.liveBorn || 1);
                }
                
                if (event.type === 'Destete' && lastFarrowingDate) {
                    const weaningDate = parseISO(event.date);
                    if (weaningDate >= start && weaningDate <= end && cycle >= Number(cycleStart) && cycle <= Number(cycleEnd)) {
                        const lactationDays = differenceInDays(weaningDate, parseISO(lastFarrowingDate));
                        const ageAtWeaning = event.age || lactationDays;
                        const weanedCount = event.pigletCount || 0;
                        const weaningWeight = event.weaningWeight || 0;
                        const weightGain = weanedCount > 0 ? (weaningWeight / weanedCount) - birthWeightThisCycle : 0;
                        const gpd = lactationDays > 0 ? weightGain / lactationDays : 0;

                        const deathsDuringLactation = (liveBornThisCycle - weanedCount) > 0 ? (liveBornThisCycle - weanedCount) : 0;

                        weanings.push({
                            sowId: pig.id,
                            date: event.date,
                            cycle: cycle,
                            breed: pig.breed,
                            weanedCount: weanedCount,
                            age: ageAtWeaning,
                            weight: weanedCount > 0 ? weaningWeight / weanedCount : 0,
                            gpd: gpd,
                            lactationDays: lactationDays,
                            deathsDuringLactation,
                            weaningType: "Normal", // Placeholder
                        });
                    }
                    lastFarrowingDate = null;
                }
            });
        });

        setWeaningData(weanings);

        // --- Calculate KPIs ---
        const totalWeanings = weanings.length;
        if (totalWeanings > 0) {
            const totalWeaned = weanings.reduce((sum, w) => sum + w.weanedCount, 0);
            const totalDeaths = weanings.reduce((sum, w) => sum + w.deathsDuringLactation, 0);
            const totalAge = weanings.reduce((sum, w) => sum + w.age, 0);
            const totalWeight = weanings.filter(w=>w.weight).reduce((sum, w) => sum + w.weight!, 0);
            const weaningsWithWeight = weanings.filter(w => w.weight).length;
            const totalGpd = weanings.filter(w=>w.gpd).reduce((sum, w) => sum + w.gpd!, 0);
            const weaningsWithGpd = weanings.filter(w => w.gpd).length;

            setKpiData({
                totalWeanings,
                totalWeaned,
                avgWeaned: totalWeanings > 0 ? totalWeaned / totalWeanings : 0,
                mortalityPercent: (totalWeaned + totalDeaths) > 0 ? (totalDeaths / (totalWeaned + totalDeaths)) * 100 : 0,
                avgAge: totalWeanings > 0 ? totalAge / totalWeanings : 0,
                avgWeight: weaningsWithWeight > 0 ? totalWeight / weaningsWithWeight : 0,
                avgGpd: weaningsWithGpd > 0 ? totalGpd / weaningsWithGpd : 0,
            });

            // --- Grouped Data Calculation ---
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
                const periodWeanings = weanings.filter(w => getPeriodKey(parseISO(w.date)) === periodKey);
                const count = periodWeanings.length;
                if(count === 0) return { name: getPeriodLabel(period), total: 0, media: 0, mortalidad: 0, edad: 0, peso: 0, gpd: 0 };
                
                const totalWeaned = periodWeanings.reduce((s,w) => s + w.weanedCount, 0);
                const totalDeaths = periodWeanings.reduce((s,w) => s + w.deathsDuringLactation, 0);
                
                return {
                    name: getPeriodLabel(period),
                    total: count,
                    media: totalWeaned / count,
                    mortalidad: (totalWeaned + totalDeaths) > 0 ? (totalDeaths / (totalWeaned + totalDeaths)) * 100 : 0,
                    edad: periodWeanings.reduce((s,w) => s+w.age,0)/count,
                    peso: periodWeanings.filter(w=>w.weight).reduce((s,w) => s+w.weight!,0)/periodWeanings.filter(w=>w.weight).length || 0,
                    gpd: periodWeanings.filter(w=>w.gpd).reduce((s,w) => s+w.gpd!,0)/periodWeanings.filter(w=>w.gpd).length || 0,
                };
            });
            setMonthlyData(groupedMetrics);

            // --- Distribution Data ---
            const lactationDaysDist = [
                { name: '< 18', value: (weanings.filter(w => w.lactationDays < 18).length / totalWeanings) * 100 },
                { name: '19-20', value: (weanings.filter(w => w.lactationDays >= 19 && w.lactationDays <= 20).length / totalWeanings) * 100 },
                { name: '21-23', value: (weanings.filter(w => w.lactationDays >= 21 && w.lactationDays <= 23).length / totalWeanings) * 100 },
                { name: '24+', value: (weanings.filter(w => w.lactationDays >= 24).length / totalWeanings) * 100 },
            ];
            const cycleDist = [
                { name: '< 1', value: (weanings.filter(w => w.cycle <= 1).length / totalWeanings) * 100 },
                { name: '2-2', value: (weanings.filter(w => w.cycle === 2).length / totalWeanings) * 100 },
                { name: '3-6', value: (weanings.filter(w => w.cycle >= 3 && w.cycle <= 6).length / totalWeanings) * 100 },
                { name: '7+', value: (weanings.filter(w => w.cycle >= 7).length / totalWeanings) * 100 },
            ];
            setDistributionData({ lactationDays: lactationDaysDist, cycle: cycleDist });
        } else {
            setKpiData({});
            setMonthlyData([]);
            setDistributionData({});
        }

    }, [allPigs, startDate, endDate, breedFilter, cycleStart, cycleEnd, timeGroup]);

    React.useEffect(() => {
        if(allPigs.length > 0) handleFilter();
    }, [allPigs, handleFilter]);
    
    const paginatedData = weaningData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const totalPages = Math.ceil(weaningData.length / rowsPerPage);

    const timeGroupOptions: { value: 'year' | 'month' | 'week'; label: string }[] = [
        { value: 'year', label: 'Año' },
        { value: 'month', label: 'Mes' },
        { value: 'week', label: 'Semana' },
    ];

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <h1 className="text-3xl font-bold tracking-tight">Análisis de destetados</h1>
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
                                <Button className="w-full" onClick={handleFilter}>Filtrar</Button>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <KpiCard title="TOTAL DE DESTETES" value={kpiData.totalWeanings || 0} subValue={`Total Destetados: ${kpiData.totalWeaned || 0}`} />
                    <KpiCard title="MEDIA DESTETADOS" value={kpiData.avgWeaned?.toFixed(2) || '0.00'} meta="Meta: 12.80" isBad={(kpiData.avgWeaned || 0) < 12.8}/>
                    <KpiCard title="MORTALIDAD (%)" value={`${kpiData.mortalityPercent?.toFixed(2) || '0.00'}%`} meta="Meta: 7.58" isBad={(kpiData.mortalityPercent || 0) > 7.58}/>
                    <KpiCard title="EDAD" value={kpiData.avgAge?.toFixed(2) || '0.00'} meta="Meta: 21.00" />
                    <KpiCard title="PESO MEDIO (KG)" value={kpiData.avgWeight?.toFixed(2) || '0.00'} meta="Meta: 5.80" isGood={(kpiData.avgWeight || 0) >= 5.8}/>
                    <KpiCard title="G.P.D. (KG)" value={kpiData.avgGpd?.toFixed(3) || '0.000'} meta="Meta: 0.220" isGood={(kpiData.avgGpd || 0) >= 0.22}/>
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
                             <h3 className="font-semibold text-md mb-2">Total de destetes</h3>
                             <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} allowDecimals={false}/>
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="total" name="Total Destetes" fill="hsl(var(--chart-5))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                             <h3 className="font-semibold text-md mb-2">Media destetados</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 20]}/>
                                    <Tooltip formatter={(v, n) => [`${Number(v).toFixed(2)}`, "Media Destetados"]}/>
                                    <Legend />
                                    <Bar dataKey="media" name="Media destetados" fill="hsl(var(--chart-2))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                         <div>
                            <h3 className="font-semibold text-md mb-2">Mortalidad (%)</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} unit="%" domain={[0, 'dataMax + 5']}/>
                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`}/>
                                     <Legend />
                                    <Bar dataKey="mortalidad" name="Mortalidad (%)" fill="hsl(var(--chart-5))" radius={[4,4,0,0]}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="font-semibold text-md mb-2">Edad</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']}/>
                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)} días`}/>
                                    <Legend />
                                    <Bar dataKey="edad" name="Edad" fill="hsl(var(--chart-4))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="font-semibold text-md mb-2">Peso medio</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']}/>
                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)} kg`}/>
                                    <Legend />
                                    <Bar dataKey="peso" name="Peso medio" fill="hsl(var(--chart-3))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="font-semibold text-md mb-2">G.P.D.</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 'dataMax + 0.1']}/>
                                    <Tooltip formatter={(v) => `${Number(v).toFixed(3)} kg`}/>
                                    <Legend />
                                    <Bar dataKey="gpd" name="G.P.D." fill="hsl(var(--chart-1))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Distribución de Destetes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="dias-lactancia">
                            <TabsList>
                                <TabsTrigger value="dias-lactancia">Días de lactancia</TabsTrigger>
                                <TabsTrigger value="tipo-destete">Tipo de destete</TabsTrigger>
                                <TabsTrigger value="ciclo-medio">Ciclo medio</TabsTrigger>
                            </TabsList>
                            <TabsContent value="dias-lactancia" className="mt-4">
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                   <Card>
                                       <CardHeader><CardTitle className="text-sm">Días de lactancia</CardTitle></CardHeader>
                                       <CardContent>
                                           <ResponsiveContainer width="100%" height={150}>
                                                <BarChart data={distributionData.lactationDays} layout="vertical">
                                                    <XAxis type="number" hide unit="%"/>
                                                    <YAxis type="category" dataKey="name" width={60} fontSize={10}/>
                                                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                                                    <Bar dataKey="value" fill="hsl(var(--chart-5))" radius={[0,4,4,0]}/>
                                                </BarChart>
                                           </ResponsiveContainer>
                                       </CardContent>
                                   </Card>
                                   <Card>
                                       <CardHeader><CardTitle className="text-sm">Tipo de destete</CardTitle></CardHeader>
                                       <CardContent><p className="text-center text-muted-foreground">Datos no disponibles</p></CardContent>
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
                               </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                 </Card>

                 <Card>
                     <CardHeader><CardTitle>Listado de Madres</CardTitle></CardHeader>
                     <CardContent>
                          <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Madre</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Ciclo</TableHead>
                                        <TableHead>Raza</TableHead>
                                        <TableHead>Muertes</TableHead>
                                        <TableHead>Destetados</TableHead>
                                        <TableHead>Edad</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedData.length > 0 ? paginatedData.map((w, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Link href={`/analysis/sow-card?sowId=${w.sowId}`} className="text-primary underline">{w.sowId}</Link></TableCell>
                                            <TableCell>{format(parseISO(w.date), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>{w.cycle}</TableCell>
                                            <TableCell>{w.breed}</TableCell>
                                            <TableCell>{w.deathsDuringLactation}</TableCell>
                                            <TableCell>{w.weanedCount}</TableCell>
                                            <TableCell>{w.age}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={7} className="text-center h-24">No hay datos para los filtros seleccionados.</TableCell></TableRow>
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
                                  Total de resultados: {weaningData.length}
                              </div>
                              <div className="flex items-center gap-2">
                                <Label>Líneas por página:</Label>
                                <Select defaultValue="10">
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
