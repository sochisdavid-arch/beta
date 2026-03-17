
"use client";

import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { jsPDF } from 'jspdf';
import autoTable, { FontStyle } from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { differenceInDays, parseISO, format, getYear, getMonth, getWeek, startOfDay, endOfDay, eachYearOfInterval, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval, add, sub } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Event {
    id: string;
    type: string;
    date: string;
    liveBorn?: number;
    stillborn?: number;
    mummified?: number;
    details?: string;
    [key: string]: any;
}

interface Pig {
    id: string;
    breed: string;
    birthDate: string;
    events: Event[];
}

type GroupingUnit = 'year' | 'month' | 'week' | 'day';

interface Metrics {
    [key: string]: number;
}

const METRIC_DEFINITIONS = [
    { key: 'servicios', label: 'SERVICIOS', isHeader: true },
    { key: 'ia', label: 'I.A.' },
    { key: 'ia_p', label: 'I.A. (%)', isPercentage: true },
    { key: 'montaNatural', label: 'Monta natural' },
    { key: 'montaNatural_p', label: 'Monta natural (%)', isPercentage: true },
    { key: 'compraGestante', label: 'Compra de gestante' },
    { key: 'compraGestante_p', label: 'Compra de gestante (%)', isPercentage: true },
    { key: 'totalServicios', label: 'Total de Servicios', isBold: true },
    { key: 'servicio7dias', label: 'Servicio hasta 7 días' },
    { key: 'servicio7dias_p', label: 'Servicio hasta 7 días (%)', isPercentage: true },
    { key: 'servicioMas7dias', label: 'Servicios por encima 7 días' },
    { key: 'servicioMas7dias_p', label: 'Servicios por encima 7 días (%)', isPercentage: true },
    { key: 'reservicios', label: 'Reservicios' },
    { key: 'reservicios_p', label: 'Reservicios (%)', isPercentage: true },
    { key: 'primerizasServidas', label: 'Primerizas servidas' },
    { key: 'primerizasServidas_p', label: 'Primerizas servidas (%)', isPercentage: true },
    { key: 'multiplesMontas_p', label: '% Múltiples montas / I.A.', isPercentage: true },
    { key: 'montasPorServicio', label: 'Nº de montas / I.A. por servicio' },
    
    { key: 'perdidaReproductiva', label: 'PÉRDIDA REPRODUCTIVA', isHeader: true },
    { key: 'repeticionCelo', label: 'Repetición de celo' },
    { key: 'repeticionCelo_p', label: 'Repetición de celo (%)', isPercentage: true },
    { key: 'abortos', label: 'Abortos' },
    { key: 'abortos_p', label: 'Aborto (%)', isPercentage: true },
    { key: 'detectadaVacia', label: 'Detectada vacía' },
    { key: 'detectadaVacia_p', label: 'Detectada vacía (%)', isPercentage: true },
    { key: 'descarteGestante', label: 'Descarte de gestante' },
    { key: 'descarteGestante_p', label: 'Descarte de gestante (%)', isPercentage: true },
    { key: 'muerteGestante', label: 'Muerte de gestante' },
    { key: 'muerteGestante_p', label: 'Muerte de gestante (%)', isPercentage: true },
    { key: 'totalPerdidas', label: 'Total de pérdidas reproductivas', isBold: true },
    
    { key: 'intervalos', label: 'INTERVALOS', isHeader: true },
    { key: 'desteteServicio', label: 'Destete - Servicio' },
    { key: 'destetePrenez', label: 'Destete - Preñez' },
    { key: 'entrada1erServicio', label: 'Entrada - 1er Servicio' },
    { key: 'edad1erServicio', label: 'Edad - 1er Servicio' },

    { key: 'indicesComplementarios', label: 'ÍNDICES COMPLEMENTARIOS', isHeader: true },
    { key: 'pesoMadreServicio', label: 'Peso de la madre en el servicio' },
    { key: 'alimentoConsumido', label: 'Alimento consumido (Kg)' },
    { key: 'consumoHembraDia', label: 'Consumo hembra/día (Kg)' },
];

const pigBreeds = [
  "Duroc", "Yorkshire", "Landrace", "Hampshire", "Pietrain", "Berkshire", "Chester White", "Spotted", "Poland China", "Tamworth", "Large Black", "Cerdo Ibérico",
  "PIC", "Topigs Norsvin", "Hypor (Hendrix Genetics)", "DanBred", "Genus", "Choice Genetics", "Genesus",
  "Otro"
];

const formatPeriodKey = (date: Date, unit: GroupingUnit): string => {
    switch (unit) {
        case 'year': return getYear(date).toString();
        case 'month': return format(date, 'yyyy-MM');
        case 'week': return `${getYear(date)}-W${getWeek(date, { weekStartsOn: 1, firstWeekContainsDate: 4 })}`;
        case 'day': return format(date, 'yyyy-MM-dd');
    }
};

const getPeriodLabel = (key: string, unit: GroupingUnit): string => {
    try {
        if (unit === 'year') return key;
        if (unit === 'month') return format(parseISO(`${key}-01`), 'MMM yyyy', { locale: es });
        if (unit === 'week') {
            const [year, weekNum] = key.split('-W');
            return `Sem ${weekNum}, ${year}`;
        }
        if (unit === 'day') return format(parseISO(key), 'dd MMM yyyy', { locale: es });
    } catch {
        return key; // Fallback
    }
    return key;
};

const calculateMetrics = (pigs: Pig[], startDate: Date, endDate: Date, unit: GroupingUnit): Map<string, Metrics> => {
    const periodMetrics = new Map<string, Metrics>();

    const filteredPigs = pigs.filter(pig => 
        pig.events.some(event => {
            const eventDate = parseISO(event.date);
            return eventDate >= startDate && eventDate <= endDate;
        })
    );
    
    filteredPigs.forEach(pig => {
        pig.events.forEach((event, index) => {
            const eventDate = parseISO(event.date);
            if (eventDate >= startDate && eventDate <= endDate) {
                const periodKey = formatPeriodKey(eventDate, unit);
                
                if (!periodMetrics.has(periodKey)) {
                    periodMetrics.set(periodKey, {});
                }
                const metrics = periodMetrics.get(periodKey)!;

                const initMetric = (k: string) => metrics[k] = metrics[k] || 0;
                
                if (event.type === 'Inseminación' || event.type === 'Monta Natural' || event.type === 'Compra Gestante') {
                    initMetric('totalServicios');
                    metrics['totalServicios']++;

                    if (event.type === 'Inseminación') {
                        initMetric('ia');
                        metrics['ia']++;
                    } else if (event.type === 'Monta Natural') {
                        initMetric('montaNatural');
                        metrics['montaNatural']++;
                    } else if (event.type === 'Compra Gestante') {
                         initMetric('compraGestante');
                        metrics['compraGestante']++;
                    }
                    
                    const desteteEvent = pig.events.find(e => e.type === 'Destete' && parseISO(e.date) < eventDate);
                    if (desteteEvent) {
                        const interval = differenceInDays(eventDate, parseISO(desteteEvent.date));
                        if (interval <= 7) {
                            initMetric('servicio7dias');
                            metrics['servicio7dias']++;
                        } else {
                            initMetric('servicioMas7dias');
                            metrics['servicioMas7dias']++;
                        }
                    }
                }
                
                if (event.type === 'Parto') {
                    // This event type can be used for other calculations if needed, but won't be displayed directly.
                }
                if (event.type === 'Aborto') {
                    initMetric('abortos');
                    metrics['abortos']++;
                }
                if (event.type === 'Celo no Servido') { // Assuming this is repeticion de celo
                    initMetric('repeticionCelo');
                    metrics['repeticionCelo']++;
                }
                 if (event.type === 'Vacia') { // Custom event type
                    initMetric('detectadaVacia');
                    metrics['detectadaVacia']++;
                }
                 if (event.type === 'Descarte' && index > 0 && ['Inseminación', 'Monta Natural'].includes(pig.events[index-1].type)) {
                    initMetric('descarteGestante');
                    metrics['descarteGestante']++;
                }
                 if (event.type === 'Muerte' && index > 0 && ['Inseminación', 'Monta Natural'].includes(pig.events[index-1].type)) {
                    initMetric('muerteGestante');
                    metrics['muerteGestante']++;
                }
            }
        });
    });
    
    periodMetrics.forEach(metrics => {
        const totalServicios = metrics['totalServicios'] || 0;
        if (totalServicios > 0) {
            metrics['ia_p'] = (metrics['ia'] || 0) / totalServicios * 100;
            metrics['montaNatural_p'] = (metrics['montaNatural'] || 0) / totalServicios * 100;
            metrics['compraGestante_p'] = (metrics['compraGestante'] || 0) / totalServicios * 100;
            metrics['repeticionCelo_p'] = (metrics['repeticionCelo'] || 0) / totalServicios * 100;
            metrics['abortos_p'] = (metrics['abortos'] || 0) / totalServicios * 100;
            metrics['detectadaVacia_p'] = (metrics['detectadaVacia'] || 0) / totalServicios * 100;
            metrics['descarteGestante_p'] = (metrics['descarteGestante'] || 0) / totalServicios * 100;
            metrics['muerteGestante_p'] = (metrics['muerteGestante'] || 0) / totalServicios * 100;
            metrics['reservicios_p'] = (metrics['reservicios'] || 0) / totalServicios * 100;
            metrics['primerizasServidas_p'] = (metrics['primerizasServidas'] || 0) / totalServicios * 100;

        } else {
             metrics['ia_p'] = 0;
             metrics['montaNatural_p'] = 0;
             metrics['compraGestante_p'] = 0;
             metrics['repeticionCelo_p'] = 0;
             metrics['abortos_p'] = 0;
             metrics['detectadaVacia_p'] = 0;
             metrics['descarteGestante_p'] = 0;
             metrics['muerteGestante_p'] = 0;
             metrics['reservicios_p'] = 0;
             metrics['primerizasServidas_p'] = 0;
        }

        const totalServiciosPostDestete = (metrics['servicio7dias'] || 0) + (metrics['servicioMas7dias'] || 0);
        if (totalServiciosPostDestete > 0) {
            metrics['servicio7dias_p'] = (metrics['servicio7dias'] || 0) / totalServiciosPostDestete * 100;
            metrics['servicioMas7dias_p'] = (metrics['servicioMas7dias'] || 0) / totalServiciosPostDestete * 100;
        } else {
            metrics['servicio7dias_p'] = 0;
            metrics['servicioMas7dias_p'] = 0;
        }

        metrics['totalPerdidas'] = (metrics['repeticionCelo'] || 0) + (metrics['abortos'] || 0) + (metrics['detectadaVacia'] || 0) + (metrics['descarteGestante'] || 0) + (metrics['muerteGestante'] || 0);
    });

    return periodMetrics;
};

export default function GestationPerformancePage() {
    const [pigs, setPigs] = React.useState<Pig[]>([]);
    const [filteredPigs, setFilteredPigs] = React.useState<Pig[]>([]);
    const [metrics, setMetrics] = React.useState<Map<string, Metrics>>(new Map());
    
    // Period navigation state
    const [currentPeriodIndex, setCurrentPeriodIndex] = React.useState(0);
    const [visiblePeriods, setVisiblePeriods] = React.useState<string[]>([]);
    const [allPeriodKeys, setAllPeriodKeys] = React.useState<string[]>([]);
    const periodsPerPage = 5;


    const [startDate, setStartDate] = React.useState<string>(format(sub(new Date(), { years: 1 }), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [groupBy, setGroupBy] = React.useState<GroupingUnit>('month');
    const [breedFilter, setBreedFilter] = React.useState('all');

    const [openCategories, setOpenCategories] = React.useState<{[key: string]: boolean}>({
        'servicios': true,
        'perdidaReproductiva': true,
        'intervalos': true,
        'indicesComplementarios': true,
    });
    
    React.useEffect(() => {
        const pigsFromStorage = localStorage.getItem('pigs');
        const allPigs: Pig[] = pigsFromStorage ? JSON.parse(pigsFromStorage) : [];
        setPigs(allPigs);
    }, []);

    const handleFilter = React.useCallback(() => {
        let tempPigs = pigs;
        if (breedFilter !== 'all') {
            tempPigs = pigs.filter(p => p.breed === breedFilter);
        }
        setFilteredPigs(tempPigs);

        const start = startOfDay(parseISO(startDate));
        const end = endOfDay(parseISO(endDate));
        
        const calculatedMetrics = calculateMetrics(tempPigs, start, end, groupBy);
        setMetrics(calculatedMetrics);

        let headers: Date[] = [];
        if (groupBy === 'year') headers = eachYearOfInterval({ start, end });
        else if (groupBy === 'month') headers = eachMonthOfInterval({ start, end });
        else if (groupBy === 'week') headers = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
        else if (groupBy === 'day') headers = eachDayOfInterval({ start, end });
        
        const headerKeys = headers.map(d => formatPeriodKey(d, groupBy)).sort();
        setAllPeriodKeys(headerKeys);
        setCurrentPeriodIndex(0);

    }, [pigs, startDate, endDate, groupBy, breedFilter]);

     React.useEffect(() => {
        const end = Math.min(currentPeriodIndex + periodsPerPage, allPeriodKeys.length);
        setVisiblePeriods(allPeriodKeys.slice(currentPeriodIndex, end));
    }, [currentPeriodIndex, allPeriodKeys]);

    React.useEffect(() => {
        handleFilter();
    }, [handleFilter]);
    
    const navigatePeriods = (direction: 'next' | 'prev') => {
        if (direction === 'next') {
            setCurrentPeriodIndex(prev => Math.min(prev + periodsPerPage, allPeriodKeys.length - periodsPerPage));
        } else {
            setCurrentPeriodIndex(prev => Math.max(prev - periodsPerPage, 0));
        }
    };


    const toggleCategory = (key: string) => {
        setOpenCategories(prev => ({ ...prev, [key]: !prev[key] }));
    }

    const formatValue = (value?: number, isPercentage = false) => {
        if (value === undefined || value === null || isNaN(value)) return '-';
        if (isPercentage) return value.toFixed(2);
        return Math.round(value).toString();
    };
    
    const getCategoryKey = (metricKey: string) => {
        if (['ia', 'ia_p', 'montaNatural', 'montaNatural_p', 'compraGestante', 'compraGestante_p', 'totalServicios', 'reservicios', 'reservicios_p', 'primerizasServidas', 'primerizasServidas_p', 'multiplesMontas_p', 'montasPorServicio', 'servicio7dias', 'servicio7dias_p', 'servicioMas7dias', 'servicioMas7dias_p'].includes(metricKey)) return 'servicios';
        if (['repeticionCelo', 'repeticionCelo_p', 'abortos', 'abortos_p', 'detectadaVacia', 'detectadaVacia_p', 'descarteGestante', 'descarteGestante_p', 'muerteGestante', 'muerteGestante_p', 'totalPerdidas'].includes(metricKey)) return 'perdidaReproductiva';
        if (['desteteServicio', 'destetePrenez', 'entrada1erServicio', 'edad1erServicio'].includes(metricKey)) return 'intervalos';
        if (['pesoMadreServicio', 'alimentoConsumido', 'consumoHembraDia'].includes(metricKey)) return 'indicesComplementarios';
        return 'default';
    };

    const getTableData = () => {
        const head = ['Métricas de Desempeño', 'Metas', ...visiblePeriods.map(p => getPeriodLabel(p, groupBy)), 'Media', 'Total'];
        const body = METRIC_DEFINITIONS.map(metric => {
            if (metric.isHeader) {
                return { isHeader: true, label: metric.label, key: metric.key };
            }

            const categoryKey = getCategoryKey(metric.key);
            if (!openCategories[categoryKey]) return null;

            let total = 0;
            let count = 0;
            allPeriodKeys.forEach(header => {
                const value = metrics.get(header)?.[metric.key];
                if (value !== undefined && !isNaN(value)) {
                    total += value;
                    count++;
                }
            });

            const average = count > 0 ? total / count : 0;
            const isSummable = !metric.isPercentage && !metric.key.toLowerCase().includes('intervalo') && !metric.key.toLowerCase().includes('consumo') && !metric.key.toLowerCase().includes('peso') && !metric.key.toLowerCase().includes('montasporservicio');
            const isAverageable = metric.isPercentage || metric.key.toLowerCase().includes('intervalo') || metric.key.toLowerCase().includes('consumo') || metric.key.toLowerCase().includes('peso') || metric.key.toLowerCase().includes('montasporservicio');
            let finalTotalValue: number | undefined;

            if (isSummable) {
                finalTotalValue = total;
            } else if (isAverageable) {
                 if (metric.isPercentage) {
                    let totalNumerator = 0;
                    let totalDenominator = 0;
                    let numeratorKey = metric.key.replace('_p', '');
                    let denominatorKey: string | undefined;

                    if (['ia_p', 'montaNatural_p', 'compraGestante_p', 'repeticionCelo_p', 'abortos_p', 'detectadaVacia_p', 'descarteGestante_p', 'muerteGestante_p', 'reservicios_p', 'primerizasServidas_p'].includes(metric.key)) {
                        denominatorKey = 'totalServicios';
                    } else if (['servicio7dias_p', 'servicioMas7dias_p'].includes(metric.key)) {
                        allPeriodKeys.forEach(header => {
                            const m = metrics.get(header);
                            if(m) {
                               totalNumerator += m[numeratorKey] || 0;
                               totalDenominator += (m['servicio7dias'] || 0) + (m['servicioMas7dias'] || 0);
                            }
                        });
                    }

                    if(denominatorKey) {
                        allPeriodKeys.forEach(header => {
                            const m = metrics.get(header);
                            if(m) {
                                totalNumerator += m[numeratorKey] || 0;
                                totalDenominator += m[denominatorKey] || 0;
                            }
                        });
                    }
                    finalTotalValue = totalDenominator > 0 ? (totalNumerator / totalDenominator) * 100 : 0;
                } else {
                     finalTotalValue = average;
                }
            }

            return {
                isHeader: false,
                label: metric.label,
                goal: '-',
                values: visiblePeriods.map(p => formatValue(metrics.get(p)?.[metric.key], metric.isPercentage)),
                average: formatValue(average, metric.isPercentage),
                total: formatValue(finalTotalValue, metric.isPercentage)
            };
        }).filter(Boolean);

        return { head, body };
    };

    const handleExport = (formatType: 'pdf' | 'csv' | 'xlsx') => {
        const { head, body } = getTableData();

        const title = "Informe de Desempeño de Gestación";
        const dateRange = `Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} - ${format(parseISO(endDate), 'dd/MM/yyyy')}`;

        if (formatType === 'pdf') {
            const doc = new jsPDF({ orientation: 'landscape' });
            doc.text(title, 14, 16);
            doc.setFontSize(10);
            doc.text(dateRange, 14, 22);
            autoTable(doc, {
                head: [head],
                body: body.map((row) => {
 if (row!.isHeader) return [{ content: row!.label, colSpan: head.length, styles: { fontStyle: 'bold' as FontStyle, fillColor: '#f0f0f0' } }]; return [{ content: row!.label }, { content: row!.goal }, ...(row!.values || []).map(v => ({ content: v })), { content: formatValue(row!.average as number | undefined) }, { content: formatValue(row!.total as number | undefined) }];
                }).filter(Boolean), // Added filter(Boolean) here as well
                startY: 28,
                theme: 'grid',
                headStyles: { fillColor: '#e07a5f' },
            });
            doc.save(`desempeno_gestacion_${new Date().toISOString().split('T')[0]}.pdf`);
        }

        if (formatType === 'csv' || formatType === 'xlsx') {
            const dataToExport = body.map(row => {
                 if (row!.isHeader) return { 'Métricas de Desempeño': row!.label };
                 const rowData: {[key:string]: any} = { 'Métricas de Desempeño': row!.label, 'Metas': row!.goal };
                 head.slice(2, -2).forEach((h, i) => rowData[h] = (row!.values || [])[i]); // Added || []
                 rowData['Media'] = row!.average;
                 rowData['Total'] = row!.total;
                 return rowData;
            });

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Desempeño");
            XLSX.writeFile(wb, `desempeno_gestacion_${new Date().toISOString().split('T')[0]}.${formatType}`);
        }
    };


    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Desempeño de la gestación</h1>
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
                
                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="start-date">Fecha inicial *</Label>
                                <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-date">Fecha final *</Label>
                                <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="group-by">Agrupar resultados por</Label>
                                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupingUnit)}>
                                    <SelectTrigger id="group-by"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="year">Año</SelectItem>
                                        <SelectItem value="month">Mes</SelectItem>
                                        <SelectItem value="week">Semana</SelectItem>
                                        <SelectItem value="day">Día</SelectItem>
                                    </SelectContent>
                                </Select>
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
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Resultados del Análisis</CardTitle>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => navigatePeriods('prev')} disabled={currentPeriodIndex === 0}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => navigatePeriods('next')} disabled={currentPeriodIndex + periodsPerPage >= allPeriodKeys.length}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[250px] sticky left-0 bg-card z-10">Métricas de Desempeño</TableHead>
                                        <TableHead className="w-[100px] text-center">Metas</TableHead>
                                        {visiblePeriods.map(header => (
                                            <TableHead key={header} className="min-w-[100px] text-center">{getPeriodLabel(header, groupBy)}</TableHead>
                                        ))}
                                        <TableHead className="min-w-[100px] text-center font-bold">Media</TableHead>
                                        <TableHead className="min-w-[100px] text-center font-bold">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {METRIC_DEFINITIONS.map(metric => {
                                        if (metric.isHeader) {
                                            const categoryKey = metric.key;
                                            return (
                                                <TableRow key={metric.key} className="bg-muted/50 hover:bg-muted/60 sticky left-0">
                                                    <TableCell 
                                                        className="font-bold sticky left-0 bg-muted/50 z-10 cursor-pointer" 
                                                        onClick={() => toggleCategory(categoryKey)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {openCategories[categoryKey] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                            {metric.label}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell colSpan={visiblePeriods.length + 3}></TableCell>
                                                </TableRow>
                                            )
                                        }
                                        
                                        const categoryKey = getCategoryKey(metric.key);
                                        if (!openCategories[categoryKey]) return null;

                                        let total = 0;
                                        let count = 0;
                                        
                                        allPeriodKeys.forEach(header => {
                                            const value = metrics.get(header)?.[metric.key];
                                            if (value !== undefined && !isNaN(value)) {
                                                total += value;
                                                count++;
                                            }
                                        });

                                        const average = count > 0 ? total / count : 0;
                                        
                                        const isSummable = !metric.isPercentage && !metric.key.toLowerCase().includes('intervalo') && !metric.key.toLowerCase().includes('consumo') && !metric.key.toLowerCase().includes('peso') && !metric.key.toLowerCase().includes('montasporservicio');
                                        const isAverageable = metric.isPercentage || metric.key.toLowerCase().includes('intervalo') || metric.key.toLowerCase().includes('consumo') || metric.key.toLowerCase().includes('peso') || metric.key.toLowerCase().includes('montasporservicio');
                                        
                                        let finalTotalValue: number | undefined;

                                        if (isSummable) {
                                            finalTotalValue = total;
                                        } else if (isAverageable) {
                                            if (metric.isPercentage) {
                                                let totalNumerator = 0;
                                                let totalDenominator = 0;

                                                let numeratorKey = metric.key.replace('_p', '');
                                                let denominatorKey: string | undefined;

                                                 if (['ia_p', 'montaNatural_p', 'compraGestante_p', 'repeticionCelo_p', 'abortos_p', 'detectadaVacia_p', 'descarteGestante_p', 'muerteGestante_p', 'reservicios_p', 'primerizasServidas_p'].includes(metric.key)) {
                                                    denominatorKey = 'totalServicios';
                                                } else if (['servicio7dias_p', 'servicioMas7dias_p'].includes(metric.key)) {
                                                    // This one needs a custom denominator based on the sum of its parts
                                                    allPeriodKeys.forEach(header => {
                                                        const m = metrics.get(header);
                                                        if(m) {
                                                           totalNumerator += m[numeratorKey] || 0;
                                                           totalDenominator += (m['servicio7dias'] || 0) + (m['servicioMas7dias'] || 0);
                                                        }
                                                    });
                                                }

                                                if(denominatorKey) {
                                                    allPeriodKeys.forEach(header => {
                                                        const m = metrics.get(header);
                                                        if(m) {
                                                            totalNumerator += m[numeratorKey] || 0;
                                                            totalDenominator += m[denominatorKey] || 0;
                                                        }
                                                    });
                                                }
                                                
                                                if (totalDenominator > 0) {
                                                    finalTotalValue = (totalNumerator / totalDenominator) * 100;
                                                } else {
                                                    finalTotalValue = 0;
                                                }

                                            } else {
                                                 finalTotalValue = average;
                                            }
                                        }

                                        return (
                                            <TableRow key={metric.key}>
                                                <TableCell className={cn("sticky left-0 bg-card z-10", metric.isBold && "font-bold")}>{metric.label}</TableCell>
                                                <TableCell className="text-center">-</TableCell>
                                                {visiblePeriods.map(header => (
                                                    <TableCell key={header} className="text-center">{formatValue(metrics.get(header)?.[metric.key], metric.isPercentage)}</TableCell>
                                                ))}
                                                <TableCell className="text-center">{formatValue(average, metric.isPercentage)}</TableCell>
                                                <TableCell className="text-center font-bold">{formatValue(finalTotalValue, metric.isPercentage)}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
