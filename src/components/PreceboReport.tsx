
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Button } from './ui/button';
import { Printer } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

export interface HealthRecord {
    date: string;
    type: string;
    product: string;
    details: string;
}

export interface PreceboReportData {
    batchId: string;
    generationDate: string;
    liquidationReason: string;
    startDate: string;
    endDate: string;
    initialCount: number;
    finalCount: number;
    initialAge: number;
    finalAge: number;
    daysInPrecebo: number;
    weeksOfLife: number;
    totalDeaths: number;
    mortalityRate: number;
    avgMortalityAge: number;
    initialTotalWeight: number;
    finalTotalWeight: number;
    initialAvgWeight: number;
    finalAvgWeight: number;
    totalWeightGain: number;
    animalWeightGain: number;
    dailyWeightGain: number; // in grams
    totalFeedConsumed: number;
    dailyAnimalConsumption: number;
    feedConversion: number;
    saleValue?: number;
    healthRecords: HealthRecord[];
}

interface ReportMetricProps {
    label: string;
    value: string | number;
    unit?: string;
    isGood?: boolean;
    isBad?: boolean;
}

const ReportMetric: React.FC<ReportMetricProps> = ({ label, value, unit, isGood, isBad }) => (
    <div className="flex justify-between items-center py-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn(
            "font-semibold text-sm",
            { "text-green-600": isGood, "text-red-600": isBad }
        )}>
            {value} {unit}
        </span>
    </div>
);


export function PreceboReport({ reportData }: { reportData: PreceboReportData }) {
    
    // Performance thresholds (example values, should be configurable)
    const isCeba = reportData.batchId.includes('CEBA');
    const DAILY_GAIN_TARGET = isCeba ? 800 : 450; // grams
    const FEED_CONVERSION_TARGET = isCeba ? 2.8 : 1.6;
    const DAILY_CONSUMPTION_TARGET = isCeba ? 2.5 : 0.7; // kg

    const handlePrint = () => {
        const printContent = document.getElementById('report-to-print');
        const originalContents = document.body.innerHTML;
        
        if(printContent) {
            const printHtml = printContent.innerHTML;
            document.body.innerHTML = `
                <html>
                    <head>
                        <title>Informe de Lote ${reportData.batchId}</title>
                        <style>
                            @import url('https://rsms.me/inter/inter.css');
                            body { font-family: 'Inter', sans-serif; margin: 20px; }
                            .print-container { max-width: 800px; margin: auto; }
                            h1, h2, h3 { color: #333; }
                            table { width: 100%; border-collapse: collapse; font-size: 12px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; }
                            .metric { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; }
                            .metric-label { color: #555; }
                            .metric-value { font-weight: bold; }
                            .no-print { display: none; }
                        </style>
                    </head>
                    <body>
                        ${printHtml}
                    </body>
                </html>
            `;
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload(); // Reload to restore scripts and styles
        }
    };


    return (
        <div id="report-to-print" className="print-container">
            <Card className="shadow-none border-none">
                 <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle>
                            {isCeba ? `Informe Final de Lote de Ceba: ${reportData.batchId}` : `Informe Final de Lote de Precebo: ${reportData.batchId}`}
                        </CardTitle>
                        <CardDescription>Generado el {isValid(parseISO(reportData.generationDate)) ? format(parseISO(reportData.generationDate), 'dd/MM/yyyy HH:mm') : 'N/A'}</CardDescription>
                    </div>
                     <Button variant="outline" onClick={handlePrint} className="no-print">
                        <Printer className="mr-2 h-4 w-4"/> Imprimir
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader><CardTitle className="text-base">Resumen General</CardTitle></CardHeader>
                            <CardContent>
                                <ReportMetric label="Motivo Liquidación" value={reportData.liquidationReason || 'N/A'} />
                                <ReportMetric label="Fecha Inicio" value={isValid(parseISO(reportData.startDate)) ? format(parseISO(reportData.startDate), 'dd/MM/yyyy') : 'N/A'} />
                                <ReportMetric label="Fecha Fin" value={isValid(parseISO(reportData.endDate)) ? format(parseISO(reportData.endDate), 'dd/MM/yyyy') : 'N/A'} />
                                <ReportMetric label={isCeba ? "Días en Ceba" : "Días en Precebo"} value={reportData.daysInPrecebo || 0} unit="días"/>
                                {reportData.saleValue !== undefined && (
                                    <ReportMetric label="Valor de Venta" value={reportData.saleValue.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })} />
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-base">Población</CardTitle></CardHeader>
                            <CardContent>
                                <ReportMetric label="Nº Inicial" value={reportData.initialCount || 0} unit="animales"/>
                                <ReportMetric label="Nº Final" value={reportData.finalCount || 0} unit="animales"/>
                                <ReportMetric label="Nº Muertes" value={reportData.totalDeaths || 0} unit="animales"/>
                                <ReportMetric label="Mortalidad" value={`${(reportData.mortalityRate || 0).toFixed(2)}%`} isBad={(reportData.mortalityRate || 0) > 5} />
                                <ReportMetric label="Edad Inicial" value={reportData.initialAge || 0} unit="días"/>
                                <ReportMetric label="Edad Final" value={reportData.finalAge || 0} unit="días"/>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-base">Peso y Ganancia</CardTitle></CardHeader>
                            <CardContent>
                                <ReportMetric label="Peso Prom. Inicial" value={(reportData.initialAvgWeight || 0).toFixed(2)} unit="kg"/>
                                <ReportMetric label="Peso Prom. Final" value={(reportData.finalAvgWeight || 0).toFixed(2)} unit="kg"/>
                                <ReportMetric label="Ganancia por Animal" value={(reportData.animalWeightGain || 0).toFixed(2)} unit="kg"/>
                                <ReportMetric label="Ganancia Diaria" value={(reportData.dailyWeightGain || 0).toFixed(0)} unit="g/día" isGood={(reportData.dailyWeightGain || 0) >= DAILY_GAIN_TARGET} isBad={(reportData.dailyWeightGain || 0) < (DAILY_GAIN_TARGET * 0.8)}/>
                            </CardContent>
                        </Card>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Análisis de Consumo y Conversión</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-muted/40">
                                <CardContent className="pt-6">
                                    <ReportMetric label="Alimento Total Consumido" value={(reportData.totalFeedConsumed || 0).toFixed(2)} unit="kg"/>
                                </CardContent>
                            </Card>
                             <Card className="bg-muted/40">
                                <CardContent className="pt-6">
                                    <ReportMetric label="Consumo Diario / Animal" value={(reportData.dailyAnimalConsumption || 0).toFixed(3)} unit="kg" isGood={(reportData.dailyAnimalConsumption || 0) >= DAILY_CONSUMPTION_TARGET} isBad={(reportData.dailyAnimalConsumption || 0) < (DAILY_CONSUMPTION_TARGET*0.9)} />
                                </CardContent>
                            </Card>
                            <Card className="bg-muted/40">
                                <CardContent className="pt-6">
                                    <ReportMetric label="Conversión Alimenticia" value={(reportData.feedConversion || 0).toFixed(2)} isGood={(reportData.feedConversion || 0) <= FEED_CONVERSION_TARGET && (reportData.feedConversion || 0) > 0} isBad={(reportData.feedConversion || 0) > (FEED_CONVERSION_TARGET * 1.1)} />
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <Separator />
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Historial Sanitario del Lote</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Detalles</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.healthRecords && reportData.healthRecords.length > 0 ? reportData.healthRecords.map((record, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{isValid(parseISO(record.date)) ? format(parseISO(record.date), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                        <TableCell>{record.type}</TableCell>
                                        <TableCell>{record.product}</TableCell>
                                        <TableCell>{record.details}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">No se registraron eventos sanitarios para este lote.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
