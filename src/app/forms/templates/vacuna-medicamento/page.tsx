
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { Logo } from "@/components/Logo";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

export default function VacunaMedicamentoForm() {
    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("Registro de Vacuna / Medicamento", 14, 22);

        doc.setFontSize(12);
        doc.text("ID del Lote: __________________", 14, 40);
        doc.text("Fecha: __________________", 110, 40);

        autoTable(doc, {
            startY: 50,
            head: [['Producto', 'Tipo (Vacuna/Med)', 'Dosis/Animal', 'Nº Animales', 'Motivo']],
            body: Array.from({ length: 10 }, () => ['','','','','']),
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [22, 163, 74] },
            bodyStyles: { minCellHeight: 10 }
        });
        doc.save("formulario_vacuna_medicamento.pdf");
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
                  <h2 className="text-2xl font-bold uppercase">Vacuna / Medicamento</h2>
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
              </div>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Tipo (Vacuna/Med)</TableHead>
                          <TableHead>Dosis/Animal</TableHead>
                          <TableHead>Nº Animales</TableHead>
                          <TableHead>Motivo</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {Array.from({ length: 10 }).map((_, index) => (
                          <TableRow key={index}>
                              <TableCell className="h-12"></TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
              </CardContent>
          </Card>
      </main>
    </div>
  );
}
