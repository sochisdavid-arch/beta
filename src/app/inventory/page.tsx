
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Boxes, Pill, Syringe } from 'lucide-react';

interface CategoryCardProps {
    title: string;
    description: string;
    icon: React.ReactElement;
    onClick: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ title, description, icon, onClick }) => (
    <Card 
        className="hover:bg-accent/50 cursor-pointer transition-colors duration-200"
        onClick={onClick}
    >
        <CardHeader className="flex flex-row items-center gap-4">
            {icon}
            <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </div>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">Haga clic para ver y gestionar el stock de esta categoría.</p>
        </CardContent>
    </Card>
);


export default function InventoryPage() {
    const router = useRouter();

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Inventario</h1>
                    <p className="text-muted-foreground">Seleccione una categoría para ver y gestionar su stock.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <CategoryCard 
                        title="Alimentos"
                        description="Stock de concentrados y alimentos."
                        icon={<Boxes className="h-8 w-8 text-primary" />}
                        onClick={() => router.push('/inventory/alimentos')}
                    />
                    <CategoryCard 
                        title="Medicamentos"
                        description="Stock de productos farmacéuticos."
                        icon={<Pill className="h-8 w-8 text-red-500" />}
                        onClick={() => router.push('/inventory/medicamentos')}
                    />
                    <CategoryCard 
                        title="Vacunas"
                        description="Stock de productos biológicos."
                        icon={<Syringe className="h-8 w-8 text-green-500" />}
                        onClick={() => router.push('/inventory/vacunas')}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
