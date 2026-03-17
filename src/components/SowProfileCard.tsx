
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO, isValid, differenceInDays, addDays } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Logo } from './Logo';
import { Separator } from './ui/separator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


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
    cause?: string;
    boarId?: string;
    [key: string]: any;
}

interface Pig {
    id: string;
    breed: string;
    birthDate: string;
    status: string;
    gender: string;
    events: Event[];
    [key: string]: any;
}

interface CycleData {
    cycle: number;
    serviceDate?: string;
    farrowingDate?: string;
    weaningDate?: string;
    liveBorn: number;
    stillborn: number;
    mummified?: number;
    pigletsWeaned: number;
    gestationDays?: number;
    lactationDays?: number;
    weaningToServiceDays?: number;
    farrowingInterval?: number;
    boarId?: string;
    totalBorn: number;
    servicesInCycle: number;
}

export interface SowData {
    cycles: CycleData[];
    generalEvents: Event[];
    kpis: any;
    lastService?: {
        date: string;
        boarId?: string;
    };
}

export const processSowHistory = (sow: Pig): SowData => {
    const cycles: CycleData[] = [];
    const generalEvents: Event[] = [];
    let cycleCounter = 0;
    let lastWeaningDate: string | null = null;
    let lastFarrowingDate: string | null = null;
    
    let servicesSinceLastParto: {date: string, boarId?: string}[] = [];
    
    const sortedEvents = [...sow.events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const event of sortedEvents) {
        if (event.type === 'Inseminación' || event.type === 'Monta Natural') {
            servicesSinceLastParto.push({ date: event.date, boarId: event.boarId });
        } else if (event.type === 'Parto') {
            cycleCounter++;
            
            const serviceForCycle = servicesSinceLastParto.length > 0 ? servicesSinceLastParto.shift() : {date: undefined, boarId: undefined};
            
            let farrowingInterval;
            if (lastFarrowingDate) {
                farrowingInterval = differenceInDays(parseISO(event.date), parseISO(lastFarrowingDate));
            }

            let gestationDays;
            if (serviceForCycle?.date) {
                gestationDays = differenceInDays(parseISO(event.date), parseISO(serviceForCycle.date));
            }
            
            cycles.push({
                cycle: cycleCounter,
                serviceDate: serviceForCycle?.date,
                boarId: serviceForCycle?.boarId,
                farrowingDate: event.date,
                liveBorn: event.liveBorn || 0,
                stillborn: event.stillborn || 0,
                mummified: event.mummified || 0,
                totalBorn: (event.liveBorn || 0) + (event.stillborn || 0) + (event.mummified || 0),
                pigletsWeaned: 0,
                gestationDays,
                farrowingInterval,
                servicesInCycle: 1, 
                weaningToServiceDays: lastWeaningDate && serviceForCycle?.date ? differenceInDays(parseISO(serviceForCycle.date), parseISO(lastWeaningDate)) : undefined,
                lactationDays: undefined,
                weaningDate: undefined,
            });
            
             lastFarrowingDate = event.date;
             lastWeaningDate = null;
             servicesSinceLastParto = [];

        } else if (event.type === 'Destete') {
             const farrowingCycle = cycles.find(c => c.farrowingDate === lastFarrowingDate);
             if (farrowingCycle) {
                 farrowingCycle.weaningDate = event.date;
                 farrowingCycle.pigletsWeaned = event.pigletCount || 0;
                 farrowingCycle.lactationDays = differenceInDays(parseISO(event.date), parseISO(farrowingCycle.farrowingDate!));
             }
             lastWeaningDate = event.date;
        } else {
            generalEvents.push(event);
        }
    }
    
    const lastService = servicesSinceLastParto.pop();
    
    const farrowingCycles = cycles.filter(c => c.farrowingDate);
    const weanedCycles = cycles.filter(c => c.weaningDate);
    
    const kpis = {
        totalFarrowings: farrowingCycles.length,
        avgTotalBorn: farrowingCycles.length > 0 ? farrowingCycles.reduce((s, c) => s + (c.totalBorn || 0), 0) / farrowingCycles.length : 0,
        avgLiveBorn: farrowingCycles.length > 0 ? farrowingCycles.reduce((s, c) => s + (c.liveBorn || 0), 0) / farrowingCycles.length : 0,
        avgStillborn: farrowingCycles.length > 0 ? farrowingCycles.reduce((s, c) => s + (c.stillborn || 0), 0) / farrowingCycles.length : 0,
        avgMummified: farrowingCycles.length > 0 ? farrowingCycles.reduce((s, c) => s + (c.mummified || 0), 0) / farrowingCycles.length : 0,
        avgWeaned: weanedCycles.length > 0 ? weanedCycles.reduce((s, c) => s + (c.pigletsWeaned || 0), 0) / weanedCycles.length : 0,
        avgFarrowingInterval: farrowingCycles.filter(c=>c.farrowingInterval).length > 1 ? farrowingCycles.filter(c=>c.farrowingInterval).reduce((s, c) => s + (c.farrowingInterval || 0), 0) / (farrowingCycles.filter(c=>c.farrowingInterval).length - 1) : 0,
        avgGestation: farrowingCycles.filter(c=>c.gestationDays).length > 0 ? farrowingCycles.reduce((s, c) => s + (c.gestationDays || 0), 0) / farrowingCycles.filter(c=>c.gestationDays).length : 0,
        avgLactation: weanedCycles.filter(c=>c.lactationDays).length > 0 ? weanedCycles.reduce((s, c) => s + (c.lactationDays || 0), 0) / weanedCycles.filter(c=>c.lactationDays).length : 0,
        avgWeanToService: cycles.filter(c=>c.weaningToServiceDays && c.weaningToServiceDays >= 0).length > 0 ? cycles.filter(c=>c.weaningToServiceDays && c.weaningToServiceDays >= 0).reduce((s, c) => s + (c.weaningToServiceDays || 0), 0) / cycles.filter(c=>c.weaningToServiceDays && c.weaningToServiceDays >= 0).length : 0,
    };

    return { cycles: cycles.reverse(), generalEvents, kpis, lastService };
};

export function SowProfileCard({ sow, sowData }: { sow: Pig, sowData: SowData }) {
    const { cycles, kpis, lastService, generalEvents } = sowData;
    
    return (
        <Card className="w-full max-w-5xl mx-auto border-none shadow-none">
            <CardContent className="p-4 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start p-2 border rounded-lg">
                    <div className="flex items-center gap-4">
                        <Logo className="h-16 w-16 text-primary" />
                        <div>
                            <h2 className="text-xl font-bold">FICHA DE VIDA DE LA MADRE</h2>
                            <p className="text-muted-foreground">SmartPig - Granja Demo</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold">{sow.id}</p>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(`https://smartpig-lite.web.app/analysis/sow-card?sowId=${sow.id}`)}`}
                            alt="QR Code"
                            width={60}
                            height={60}
                        />
                    </div>
                </div>

                {/* Sow Details */}
                <div className="grid grid-cols-4 gap-4 p-2 border rounded-lg text-sm">
                    <div><span className="font-semibold">Genética:</span> {sow.breed}</div>
                    <div><span className="font-semibold">Fecha Nac:</span> {isValid(parseISO(sow.birthDate)) ? format(parseISO(sow.birthDate), 'dd/MM/yyyy') : '--'}</div>
                    <div><span className="font-semibold">Estado:</span> {sow.status}</div>
                    <div><span className="font-semibold">Nº Partos:</span> {kpis.totalFarrowings}</div>
                </div>

                {/* KPIs */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Indicadores Clave de Rendimiento (Promedios)</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-semibold p-2">Nacidos Totales:</TableCell>
                                    <TableCell className="p-2">{kpis.avgTotalBorn.toFixed(2)}</TableCell>
                                    <TableCell className="font-semibold p-2">Nacidos Vivos:</TableCell>
                                    <TableCell className="p-2">{kpis.avgLiveBorn.toFixed(2)}</TableCell>
                                    <TableCell className="font-semibold p-2">Destetados:</TableCell>
                                    <TableCell className="p-2">{kpis.avgWeaned.toFixed(2)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-semibold p-2">Días Gestación:</TableCell>
                                    <TableCell className="p-2">{kpis.avgGestation.toFixed(1)}</TableCell>
                                    <TableCell className="font-semibold p-2">Días Lactancia:</TableCell>
                                    <TableCell className="p-2">{kpis.avgLactation.toFixed(1)}</TableCell>
                                    <TableCell className="font-semibold p-2">Int. Destete-Servicio:</TableCell>
                                    <TableCell className="p-2">{kpis.avgWeanToService.toFixed(1)}</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell className="font-semibold p-2">Intervalo Entre Partos:</TableCell>
                                    <TableCell className="p-2">{kpis.avgFarrowingInterval.toFixed(1)}</TableCell>
                                    <TableCell colSpan={4}></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Cycles History */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Historial de Ciclos Reproductivos</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ciclo</TableHead>
                                    <TableHead>F. Servicio</TableHead>
                                    <TableHead>Macho</TableHead>
                                    <TableHead>F. Parto</TableHead>
                                    <TableHead>NV</TableHead>
                                    <TableHead>NM</TableHead>
                                    <TableHead>Mom.</TableHead>
                                    <TableHead>Días Gest.</TableHead>
                                    <TableHead>F. Destete</TableHead>
                                    <TableHead>Dest.</TableHead>
                                    <TableHead>Días Lact.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cycles.map(cycle => (
                                    <TableRow key={cycle.cycle}>
                                        <TableCell>{cycle.cycle}</TableCell>
                                        <TableCell>{cycle.serviceDate ? format(parseISO(cycle.serviceDate), 'dd/MM/yy') : '--'}</TableCell>
                                        <TableCell>{cycle.boarId || '--'}</TableCell>
                                        <TableCell>{cycle.farrowingDate ? format(parseISO(cycle.farrowingDate), 'dd/MM/yy') : '--'}</TableCell>
                                        <TableCell>{cycle.liveBorn}</TableCell>
                                        <TableCell>{cycle.stillborn}</TableCell>
                                        <TableCell>{cycle.mummified}</TableCell>
                                        <TableCell>{cycle.gestationDays}</TableCell>
                                        <TableCell>{cycle.weaningDate ? format(parseISO(cycle.weaningDate), 'dd/MM/yy') : '--'}</TableCell>
                                        <TableCell>{cycle.pigletsWeaned}</TableCell>
                                        <TableCell>{cycle.lactationDays}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Last Service & General Events */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Card>
                        <CardHeader><CardTitle className="text-base">Último Servicio Registrado</CardTitle></CardHeader>
                        <CardContent>
                            {lastService ? (
                                <div className="space-y-2">
                                    <p><span className="font-semibold">Fecha:</span> {format(parseISO(lastService.date), 'dd/MM/yyyy')}</p>
                                    <p><span className="font-semibold">Macho:</span> {lastService.boarId || 'No registrado'}</p>
                                    <p className="text-blue-600 font-semibold"><span className="font-semibold">Fecha Probable de Parto:</span> {format(addDays(parseISO(lastService.date), 114), 'dd/MM/yyyy')}</p>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">No hay servicios pendientes registrados.</p>
                            )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle className="text-base">Eventos Generales Recientes</CardTitle></CardHeader>
                        <CardContent>
                           <ul className="space-y-1 text-sm">
                                {generalEvents.slice(0, 5).map(event => (
                                    <li key={event.id}>
                                        <span className="font-semibold">{isValid(parseISO(event.date)) ? format(parseISO(event.date), 'dd/MM/yy') : '--'}</span> - {event.type}: {event.details}
                                    </li>
                                ))}
                                {generalEvents.length === 0 && <li className="text-muted-foreground">No hay eventos generales.</li>}
                           </ul>
                        </CardContent>
                    </Card>
                 </div>
            </CardContent>
        </Card>
    );
}


export const exportSowProfilePDF = (sow: Pig, sowData: SowData) => {
    const { cycles, kpis, generalEvents } = sowData;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text(`Ficha de Vida: ${sow.id}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Granja Demo`, 14, 28);
    doc.text(`Raza: ${sow.breed}`, 14, 34);
    doc.text(`Estado: ${sow.status}`, 14, 40);

    // KPIs
    doc.setFontSize(14);
    doc.text("Indicadores de Rendimiento (Promedios)", 14, 55);
    autoTable(doc, {
        startY: 60,
        body: [
            ['Nacidos Totales', kpis.avgTotalBorn.toFixed(2), 'Nacidos Vivos', kpis.avgLiveBorn.toFixed(2)],
            ['Destetados', kpis.avgWeaned.toFixed(2), 'Días Gestación', kpis.avgGestation.toFixed(1)],
            ['Días Lactancia', kpis.avgLactation.toFixed(1), 'Int. Destete-Servicio', kpis.avgWeanToService.toFixed(1)],
            ['Int. Entre Partos', kpis.avgFarrowingInterval.toFixed(1), '', ''],
        ],
        theme: 'grid'
    });

    let finalY = (doc as any).lastAutoTable.finalY;

    // Cycles
    doc.setFontSize(14);
    doc.text("Historial de Ciclos", 14, finalY + 15);
    autoTable(doc, {
        startY: finalY + 20,
        head: [['Ciclo', 'F. Servicio', 'Macho', 'F. Parto', 'NV', 'NM', 'Mom', 'D. Gest', 'F. Dest', 'Dest', 'D. Lact']],
        body: cycles.map(c => [
            c.cycle ?? '-',
            c.serviceDate ? format(parseISO(c.serviceDate), 'dd/MM/yy') : '-',
            c.boarId || '-',
            c.farrowingDate ? format(parseISO(c.farrowingDate), 'dd/MM/yy') : '-',
            c.liveBorn ?? '-',
            c.stillborn ?? '-',
            c.mummified ?? '-',
            c.gestationDays ?? '-',
            c.weaningDate ? format(parseISO(c.weaningDate), 'dd/MM/yy') : '-',
            c.pigletsWeaned ?? '-',
            c.lactationDays ?? '-'
        ]),
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] }
    });
    
    finalY = (doc as any).lastAutoTable.finalY;

     // General Events
    doc.setFontSize(14);
    doc.text("Eventos Generales Recientes", 14, finalY + 15);
     autoTable(doc, {
        startY: finalY + 20,
        head: [['Fecha', 'Tipo', 'Detalles']],
        body: generalEvents.slice(0,5).map(e => [
            isValid(parseISO(e.date)) ? format(parseISO(e.date), 'dd/MM/yyyy') : '-',
            e.type,
            e.details || ''
        ]),
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] }
    });


    doc.save(`ficha_vida_${sow.id}.pdf`);
};
