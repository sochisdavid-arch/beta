
"use client";

import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ClipboardList } from 'lucide-react';
import Link from 'next/link';

const forms = [
    { title: "Formulario de Servicio", description: "Registrar una inseminación o monta natural con fecha y reproductor.", href: "/forms/templates/servicio" },
    { title: "Formulario de Parto", description: "Recolectar todos los datos de un nuevo parto.", href: "/forms/templates/parto" },
    { title: "Formulario de Destete", description: "Registrar los detalles de un destete de camada.", href: "/forms/templates/destete" },
    { title: "Pérdida Reproductiva", description: "Anotar abortos, repeticiones de celo u otras pérdidas.", href: "/forms/templates/perdida-reproductiva" },
    { title: "Muerte/Movimiento de Lechones", description: "Registrar bajas y transferencias de lechones en maternidad.", href: "/forms/templates/movimiento-lechones" },
    { title: "Formulario de Nodrizas", description: "Registrar y gestionar madres nodrizas.", href: "/forms/templates/nodriza" },
    { title: "Consumo de Alimento (Lote)", description: "Registrar el consumo de alimento para lotes de precebo o ceba.", href: "/forms/templates/consumo-alimento" },
    { title: "Gestión de Lotes", description: "Registrar muertes, transferencias o ventas de lechones de un lote.", href: "/forms/templates/gestion-lote" },
    { title: "Vacuna/Medicamento (Lote)", description: "Aplicar vacunas o medicamentos a un lote completo.", href: "/forms/templates/vacuna-medicamento" },
];

const FormCard = ({ title, description, href }: { title: string, description: string, href: string }) => (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
        <CardHeader className="flex-grow">
            <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{title}</CardTitle>
                <FileText className="h-6 w-6 text-muted-foreground"/>
            </div>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild className="w-full">
                <Link href={href}>Ver Formulario</Link>
            </Button>
        </CardContent>
    </Card>
)

export default function FormsPage() {
    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <ClipboardList className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">Formularios Imprimibles</h1>
                </div>
                <p className="text-muted-foreground max-w-3xl">
                    Utilice estos formularios para la recolección de datos en campo. Puede imprimirlos directamente desde su navegador.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {forms.map(form => (
                       <FormCard key={form.title} {...form} />
                   ))}
                </div>
            </div>
        </AppLayout>
    );
}
