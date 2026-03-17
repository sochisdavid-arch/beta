
"use client";

import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, MoreHorizontal } from 'lucide-react';
import { format, parseISO, isValid, differenceInDays, startOfDay, endOfDay, sub, eachMonthOfInterval, getYear, eachWeekOfInterval, eachYearOfInterval, getWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Event {
    id: string;
    type: string;
    date: string;
    liveBorn?: number;
    pigletCount?: number; // for weaning
    weaningWeight?: number;
    [key: string]: any;
}

interface Pig {
    id: string;
    breed: string;
    birthDate: string;
    gender: string;
    events: Event[];
}

const pigBreeds = [
  "Duroc", "Yorkshire", "Landrace", "Hampshire", "Pietrain", "Berkshire", "Chester White", "Spotted", "Poland China", "Tamworth", "Large Black", "Cerdo Ibérico",
  "PIC", "Topigs Norsvin", "Hypor (Hendrix Genetics)", "DanBred", "Genus", "Choice Genetics", "Genesus",
  "Otro"
];

const KpiCard = ({ title, value, meta, isBad }: { title: string, value: string | number, meta: string, isBad?: boolean }) => (
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

interface MonthlyData {
    name: string;
    pha: number;
    dha: number;
    kgdha: number;
}

interface DistributionData {
    name: string;
    value: number;
}

export default function MaternityPerformancePage() {
    const [allPigs, setAllPigs] = React.useState<Pig[]>([]);
    const [startDate, setStartDate] = React.useState<string>(format(sub(new Date(), { years: 1 }), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [breedFilter, setBreedFilter] = React.useState('all');
    const [cycleRange, setCycleRange] = React.useState([1, 20]);
    const [distributionBy, setDistributionBy] = React.useState<'ciclo' | 'raza'>('ciclo');
    const [timeGroup, setTimeGroup] = React.useState<'week' | 'month' | 'year'>('month');

    const [kpiData, setKpiData] = React.useState({ pha: 0, dha: 0, kgdha: 0 });
    const [chartData, setChartData] = React.useState<MonthlyData[]>([]);
    const [distData, setDistData] = React.useState<DistributionData[]>([]);

    React.useEffect(() => {
        const pigsFromStorage = localStorage.getItem('pigs');
        if (pigsFromStorage) {
            setAllPigs(JSON.parse(pigsFromStorage));
        }
    }, []);

    const calculateMetrics = React.useCallback(() => {
        if (allPigs.length === 0) return;

        const start = startOfDay(parseISO(startDate));
        const end = endOfDay(parseISO(endDate));
        
        let filteredPigs = allPigs.filter(p => p.gender === 'Hembra');
        if (breedFilter !== 'all') {
            filteredPigs = filteredPigs.filter(p => p.breed === breedFilter);
        }

        const productiveDays = differenceInDays(end, start);
        const productiveYears = productiveDays / 365.25;

        const productiveSows = filteredPigs.length; 

        if (productiveSows === 0) {
            setKpiData({ pha: 0, dha: 0, kgdha: 0 });
            setChartData([]);
            setDistData([]);
            return;
        }
        
        let totalFarrowings = 0;
        let totalWeaned = 0;
        let totalWeanedKg = 0;
        
        const periodMetrics: Record<string, {farrowings: number, weaned: number, weanedKg: number, sowCount: number}> = {};
        const cycleMetrics: Record<string, { farrowings: number, weaned: number, sowCount: number }> = {};


        filteredPigs.forEach(pig => {
            let cycle = 0;
            pig.events.forEach(event => {
                const eventDate = parseISO(event.date);
                if (event.type === 'Parto') {
                    cycle++;
                    if (eventDate >= start && eventDate <= end && cycle >= cycleRange[0] && cycle <= cycleRange[1]) {
                        totalFarrowings++;

                        let periodKey: string;
                        if (timeGroup === 'month') periodKey = format(eventDate, 'yyyy-MM');
                        else if (timeGroup === 'week') periodKey = `${getYear(eventDate)}-W${getWeek(eventDate, { weekStartsOn: 1 })}`;
                        else periodKey = getYear(eventDate).toString();
                        
                        if (!periodMetrics[periodKey]) periodMetrics[periodKey] = { farrowings: 0, weaned: 0, weanedKg: 0, sowCount: 1 };
                        periodMetrics[periodKey].farrowings++;

                        const cycleKey = cycle <= 1 ? '1' : (cycle <= 2 ? '2' : (cycle <= 6 ? '3-6' : '>6'));
                        if (!cycleMetrics[cycleKey]) cycleMetrics[cycleKey] = { farrowings: 0, weaned: 0, sowCount: 1 };
                        cycleMetrics[cycleKey].farrowings++;

                    }
                }
                 if (event.type === 'Destete') {
                     if (eventDate >= start && eventDate <= end && cycle >= cycleRange[0] && cycle <= cycleRange[1]) {
                        const weanedCount = event.pigletCount || 0;
                        const weanedKg = event.weaningWeight || 0;
                        totalWeaned += weanedCount;
                        totalWeanedKg += weanedKg;

                        let periodKey: string;
                        if (timeGroup === 'month') periodKey = format(eventDate, 'yyyy-MM');
                        else if (timeGroup === 'week') periodKey = `${getYear(eventDate)}-W${getWeek(eventDate, { weekStartsOn: 1 })}`;
                        else periodKey = getYear(eventDate).toString();
                        
                         if (periodMetrics[periodKey]) {
                            periodMetrics[periodKey].weaned += weanedCount;
                            periodMetrics[periodKey].weanedKg += weanedKg;
                         }

                        const cycleKey = cycle <= 1 ? '1' : (cycle <= 2 ? '2' : (cycle <= 6 ? '3-6' : '>6'));
                         if(cycleMetrics[cycleKey]) {
                            cycleMetrics[cycleKey].weaned += weanedCount;
                         }
                    }
                }
            });
        });

        const pha = productiveYears > 0 ? totalFarrowings / productiveSows / productiveYears : 0;
        const dha = productiveYears > 0 ? totalWeaned / productiveSows / productiveYears : 0;
        const kgdha = productiveYears > 0 ? totalWeanedKg / productiveSows / productiveYears : 0;
        
        setKpiData({ pha, dha, kgdha });
        
        let periods: Date[] = [];
        let getPeriodKey: (d: Date) => string;
        let getPeriodLabel: (d: Date) => string;
        let periodDurationDays: number;

        if (timeGroup === 'month') {
            periods = eachMonthOfInterval({ start, end });
            getPeriodKey = (d) => format(d, 'yyyy-MM');
            getPeriodLabel = (d) => format(d, 'MMM yy', { locale: es });
            periodDurationDays = 30.44;
        } else if (timeGroup === 'week') {
            periods = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
            getPeriodKey = (d) => `${getYear(d)}-W${getWeek(d, { weekStartsOn: 1 })}`;
            getPeriodLabel = (d) => `Sem ${getWeek(d, { weekStartsOn: 1 })}`;
            periodDurationDays = 7;
        } else { // year
            periods = eachYearOfInterval({ start, end });
            getPeriodKey = (d) => getYear(d).toString();
            getPeriodLabel = (d) => getYear(d).toString();
            periodDurationDays = 365.25;
        }
        
        const finalChartData = periods.map(period => {
            const periodKey = getPeriodKey(period);
            const data = periodMetrics[periodKey];
            if (!data) return { name: getPeriodLabel(period), pha: 0, dha: 0, kgdha: 0};
            
            const monthProductiveYears = (periodDurationDays / 365.25);
            return {
                name: getPeriodLabel(period),
                pha: monthProductiveYears > 0 ? data.farrowings / productiveSows / monthProductiveYears : 0,
                dha: monthProductiveYears > 0 ? data.weaned / productiveSows / monthProductiveYears : 0,
                kgdha: monthProductiveYears > 0 ? data.weanedKg / productiveSows / monthProductiveYears : 0
            }
        });
        setChartData(finalChartData);

        const distCycleData: DistributionData[] = Object.entries(cycleMetrics).map(([key, data]) => {
            const cycleProductiveYears = data.sowCount > 0 ? (productiveDays / data.sowCount) / 365.25 : 0;
            return {
                name: key === '>6' ? '>= 7' : (key === '1' || key ==='2' ? `<= ${key}` : key),
                value: cycleProductiveYears > 0 ? data.farrowings / cycleProductiveYears : 0
            };
        });
        setDistData(distCycleData);


    }, [allPigs, startDate, endDate, breedFilter, cycleRange, timeGroup]);
    
    React.useEffect(() => {
        calculateMetrics();
    }, [calculateMetrics]);
    
    const timeGroupOptions: { value: 'year' | 'month' | 'week'; label: string }[] = [
        { value: 'year', label: 'Año' },
        { value: 'month', label: 'Mes' },
        { value: 'week', label: 'Semana' },
    ];

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <h1 className="text-3xl font-bold tracking-tight">Análisis Potencial Productivo</h1>
                <Card>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
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
                            <div className="space-y-2">
                                <Label>Ciclo: {cycleRange[0]} - {cycleRange[1]}</Label>
                                <Slider
                                    value={cycleRange}
                                    onValueChange={setCycleRange}
                                    max={20}
                                    min={1}
                                    step={1}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Button className="w-full" onClick={calculateMetrics}>Filtrar</Button>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <KpiCard title="PHA" value={kpiData.pha.toFixed(2)} meta="Partos / Hembra / Año" isBad={kpiData.pha < 2.57} />
                    <KpiCard title="DHA" value={kpiData.dha.toFixed(2)} meta="Destetados / Hembra / Año" isBad={kpiData.dha < 33.44}/>
                    <KpiCard title="KG/DHA" value={kpiData.kgdha.toFixed(2)} meta="Kg Destetados / Hembra / Año" />
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
                             <h3 className="font-semibold text-md mb-2">Parto/Hembra/Año (PHA)</h3>
                             <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 'dataMax + 0.5']}/>
                                    <Tooltip formatter={(value) => (value as number).toFixed(2)} />
                                    <Bar dataKey="pha" name="PHA" fill="hsl(var(--chart-4))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                         <div>
                             <h3 className="font-semibold text-md mb-2">Destetados/Hembra/Año (DHA)</h3>
                             <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 'dataMax + 5']}/>
                                    <Tooltip formatter={(value) => (value as number).toFixed(2)} />
                                    <Bar dataKey="dha" name="DHA" fill="hsl(var(--chart-2))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                             <h3 className="font-semibold text-md mb-2">Kg/DHA</h3>
                             <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 'dataMax + 20']}/>
                                    <Tooltip formatter={(value) => `${(value as number).toFixed(2)} kg`} />
                                    <Bar dataKey="kgdha" name="Kg/DHA" fill="hsl(var(--chart-5))" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Distribución de Indicadores Productivos</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <Card className="col-span-1">
                               <CardHeader><CardTitle className="text-sm">Por los datos de la madre</CardTitle></CardHeader>
                               <CardContent>
                                   <RadioGroup defaultValue="ciclo" onValueChange={(v) => setDistributionBy(v as 'ciclo' | 'raza')}>
                                       <div className="flex items-center space-x-2">
                                           <RadioGroupItem value="ciclo" id="ciclo" />
                                           <Label htmlFor="ciclo">Ciclo</Label>
                                       </div>
                                       <div className="flex items-center space-x-2">
                                           <RadioGroupItem value="raza" id="raza" disabled/>
                                           <Label htmlFor="raza">Raza</Label>
                                       </div>
                                   </RadioGroup>
                               </CardContent>
                           </Card>
                           <Card className="md:col-span-2">
                               <CardHeader><CardTitle className="text-sm">Desempeño de Parto/Hembra/Año (PHA)</CardTitle></CardHeader>
                               <CardContent>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={distData} layout="vertical">
                                            <XAxis type="number" domain={[0, 'dataMax + 0.5']}/>
                                            <YAxis type="category" dataKey="name" width={60} fontSize={12}/>
                                            <Tooltip formatter={(value) => (value as number).toFixed(2)} />
                                            <Bar dataKey="value" name="PHA" fill="hsl(var(--chart-4))" radius={[0,4,4,0]}/>
                                        </BarChart>
                                   </ResponsiveContainer>
                               </CardContent>
                           </Card>
                       </div>
                    </CardContent>
                 </Card>

            </div>
        </AppLayout>
    );
}
