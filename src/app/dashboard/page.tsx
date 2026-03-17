
"use client"
import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { differenceInDays, parseISO, addDays, isValid, format } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Bell, Baby, Repeat, HeartPulse } from 'lucide-react';
import Link from 'next/link';

interface Event {
    id: string;
    type: string;
    date: string;
    details?: string;
    liveBorn?: number;
    stillborn?: number;
    mummified?: number;
    pigletCount?: number;
    weaningWeight?: number;
    [key: string]: any;
}

interface Pig {
    id: string;
    breed: string;
    birthDate: string;
    gender: 'Hembra' | 'Macho';
    status: 'Gestante' | 'Lactante' | 'Destetada' | 'Vacia' | 'Remplazo';
    events: Event[];
}

interface KpiData {
  dha: number;
  avgLiveBorn: number;
  avgWeaned: number;
  pha: number;
  ids: number;
  npd: number;
  kgDha: number;
  totalPigs: number;
}

interface AlertData {
    type: 'parto' | 'destete' | 'servicio';
    pigId: string;
    date: string;
    message: string;
}


const KpiCard = ({ title, value, unit, description }: { title: string, value: string, unit?: string, description: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value} <span className="text-lg text-muted-foreground">{unit}</span></div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

export default function DashboardPage() {
    const [kpiData, setKpiData] = React.useState<KpiData | null>(null);
    const [alerts, setAlerts] = React.useState<AlertData[]>([]);

    React.useEffect(() => {
        const pigsFromStorage = localStorage.getItem('pigs');
        if (pigsFromStorage) {
            const allPigs: Pig[] = JSON.parse(pigsFromStorage);
            const sows = allPigs.filter(p => p.gender === 'Hembra');
            
            // KPI Calculation
            if (sows.length > 0) {
                let totalFarrowings = 0;
                let totalLiveBorn = 0;
                let totalWeaned = 0;
                let totalWeanedKg = 0;
                let totalIds = 0;
                let countIds = 0;
                let farrowingIntervals: number[] = [];

                sows.forEach(sow => {
                    let lastWeaningDate: string | null = null;
                    const sortedEvents = [...sow.events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    const partoEvents = sortedEvents.filter(e => e.type === 'Parto');
                    totalFarrowings += partoEvents.length;

                    for(let i=1; i<partoEvents.length; i++){
                       farrowingIntervals.push(differenceInDays(parseISO(partoEvents[i].date), parseISO(partoEvents[i-1].date)));
                    }

                    sortedEvents.forEach(event => {
                        if (event.type === 'Parto') {
                            totalLiveBorn += event.liveBorn || 0;
                        } else if (event.type === 'Destete') {
                            totalWeaned += event.pigletCount || 0;
                            totalWeanedKg += event.weaningWeight || 0;
                            lastWeaningDate = event.date;
                        } else if ((event.type === 'Inseminación' || event.type === 'Monta Natural') && lastWeaningDate) {
                            const interval = differenceInDays(parseISO(event.date), parseISO(lastWeaningDate));
                            if(interval >= 0){
                                totalIds += interval;
                                countIds++;
                            }
                            lastWeaningDate = null;
                        }
                    });
                });
                
                const productiveSows = sows.length; 
                const avgFarrowingInterval = farrowingIntervals.length > 0 ? farrowingIntervals.reduce((a, b) => a + b, 0) / farrowingIntervals.length : 0;
                
                const pha = avgFarrowingInterval > 0 ? 365 / avgFarrowingInterval : 0;
                const avgLiveBorn = totalFarrowings > 0 ? totalLiveBorn / totalFarrowings : 0;
                const avgWeaned = totalFarrowings > 0 ? totalWeaned / totalFarrowings : 0;

                const dha = pha * avgWeaned;
                const kgDha = pha * (totalFarrowings > 0 ? totalWeanedKg / totalFarrowings : 0);
                const ids = countIds > 0 ? totalIds / countIds : 0;
                const npd = avgFarrowingInterval > 0 ? avgFarrowingInterval - 114 - 21 : 0; // Simplified
                
                setKpiData({
                    dha,
                    avgLiveBorn,
                    avgWeaned,
                    pha,
                    ids,
                    npd,
                    kgDha,
                    totalPigs: allPigs.length,
                });
            }

            // Alerts Calculation
            const today = new Date();
            const upcomingAlerts: AlertData[] = [];
            
            sows.forEach(sow => {
                const sortedEvents = [...sow.events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const lastEvent = sortedEvents[0];

                if (!lastEvent) return;

                // Próximos Partos
                if (sow.status === 'Gestante' && lastEvent.type === 'Inseminación') {
                    const farrowingDate = addDays(parseISO(lastEvent.date), 114);
                    const daysToFarrow = differenceInDays(farrowingDate, today);
                    if (daysToFarrow >= 0 && daysToFarrow <= 7) {
                        upcomingAlerts.push({
                            type: 'parto',
                            pigId: sow.id,
                            date: format(farrowingDate, 'dd/MM/yyyy'),
                            message: `Parto previsto para el ${format(farrowingDate, 'dd/MM/yyyy')} (en ${daysToFarrow} días).`
                        });
                    }
                }

                // Próximos Destetes
                if (sow.status === 'Lactante' && lastEvent.type === 'Parto') {
                    const weaningDate = addDays(parseISO(lastEvent.date), 21); // Assuming 21-day lactation
                    const daysToWean = differenceInDays(weaningDate, today);
                     if (daysToWean >= 0 && daysToWean <= 3) {
                        upcomingAlerts.push({
                            type: 'destete',
                            pigId: sow.id,
                            date: format(weaningDate, 'dd/MM/yyyy'),
                            message: `Destete previsto para el ${format(weaningDate, 'dd/MM/yyyy')}.`
                        });
                    }
                }

                // Cerdas por cubrir
                 if (sow.status === 'Destetada' && lastEvent.type === 'Destete') {
                    const daysSinceWeaning = differenceInDays(today, parseISO(lastEvent.date));
                    if (daysSinceWeaning >= 3 && daysSinceWeaning <= 10) {
                         upcomingAlerts.push({
                            type: 'servicio',
                            pigId: sow.id,
                            date: format(today, 'dd/MM/yyyy'),
                            message: `Revisar celo. Han pasado ${daysSinceWeaning} días desde el destete.`
                        });
                    }
                 }
            });
            
            setAlerts(upcomingAlerts.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()));
        }
    }, []);

    const alertIcons = {
        parto: <Baby className="h-5 w-5 text-blue-500" />,
        destete: <Repeat className="h-5 w-5 text-orange-500" />,
        servicio: <HeartPulse className="h-5 w-5 text-pink-500" />,
    };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard title="DHA" value={kpiData?.dha.toFixed(2) || '0.00'} description="Destetos / Hembra / Año."/>
          <KpiCard title="NV/P" value={kpiData?.avgLiveBorn.toFixed(2) || '0.00'} description="Nacidos Vivos / Parto."/>
          <KpiCard title="Dest./P" value={kpiData?.avgWeaned.toFixed(2) || '0.00'} description="Destetados / Parto."/>
          <KpiCard title="PHA" value={kpiData?.pha.toFixed(2) || '0.00'} description="Partos / Hembra / Año."/>
          <KpiCard title="IDS" value={kpiData?.ids.toFixed(1) || '0.0'} unit="días" description="Int. Destete - Servicio."/>
          <KpiCard title="DNP" value={kpiData?.npd.toFixed(1) || '0.0'} unit="días" description="Días No Productivos."/>
          <KpiCard title="Kg/DHA" value={kpiData?.kgDha.toFixed(2) || '0.00'} unit="kg" description="Kg Destetados / Hembra / Año."/>
          <KpiCard title="Cerdos Totales" value={kpiData?.totalPigs.toString() || '0'} description="Total de animales en la granja."/>
        </div>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5"/>
                    Alertas y Próximas Tareas
                </CardTitle>
                <CardDescription>Eventos importantes que requieren su atención en los próximos días.</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.map((alert, index) => (
                    <Alert key={index}>
                      {alertIcons[alert.type]}
                      <AlertTitle>
                        <Link href={`/gestation/${alert.pigId}`} className="hover:underline">
                          Cerda: {alert.pigId}
                        </Link>
                      </AlertTitle>
                      <AlertDescription>
                        {alert.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                    <Bell className="w-12 h-12 mb-4" />
                    <p className="font-semibold">Todo en Orden</p>
                    <p className="text-sm">No hay alertas importantes por ahora.</p>
                </div>
              )}
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
