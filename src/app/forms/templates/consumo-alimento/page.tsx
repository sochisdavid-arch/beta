
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Logo } from "@/components/Logo";
import { Download, ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

export default function ConsumoAlimentoForm() {
    const handleExportPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.text("Registro de Consumo de Alimento", 14, 22);
        doc.setFontSize(12);
        doc.text("ID del Lote: ______________", 14, 40);
        doc.text("Fecha: ______________", 100, 40);
        doc.text("Fase: ______________", 14, 50);
        doc.text("Semana N°: ______________", 100, 50);

        autoTable(doc, {
            startY: 60,
            head: [['Día', 'Alimento', 'Cantidad (kg)', 'Observaciones']],
            body: Array.from({ length: 7 }, (_, i) => [`Día ${i + 1}`, '', '', '']),
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [22, 163, 74] },
            bodyStyles: { minCellHeight: 10 }
        });
        
        let finalY = (doc as any).lastAutoTable.finalY;
        doc.text("Observaciones Generales de la Semana:", 14, finalY + 10);

        doc.save("formulario_consumo_alimento.pdf");
    };

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-8">
        <header className="max-w-4xl mx-auto flex justify-between items-center py-4">
            <Button variant="outline" asChild>
                <Link href="/forms">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Formularios
                </Link>
            </Button>
            <Button onClick={handleExportPDF}>
                <Download className="mr-2 h-4 w-4" />
                Guardar como PDF
            </Button>
        </header>
        <main id="printable-content" className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-lg">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Logo className="h-16 w-16 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold text-primary">SmartPig</h1>
                        <p className="text-muted-foreground">Granja Demo</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold uppercase">Consumo de Alimento</h2>
                </div>
            </div>
            <Card className="w-full border-none shadow-none">
                <CardContent className="p-0">
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <div className="flex items-baseline gap-2">
                            <p className="font-semibold w-24">ID del Lote:</p>
                            <div className="border-b flex-1"></div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="font-semibold w-24">Fecha:</p>
                            <div className="border-b flex-1"></div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="font-semibold w-24">Fase:</p>
                            <div className="border-b flex-1"></div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="font-semibold w-24">Semana N°:</p>
                            <div className="border-b flex-1"></div>
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Día</TableHead>
                                <TableHead>Alimento</TableHead>
                                <TableHead>Cantidad (kg)</TableHead>
                                <TableHead>Observaciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 7 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium h-12">Día {index + 1}</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="mt-8">
                        <h4 className="font-semibold mb-2">Observaciones Generales de la Semana:</h4>
                        <div className="border-b h-24"></div>
                    </div>
                </CardContent>
            </Card>
        </main>
    </div>
  );
}
