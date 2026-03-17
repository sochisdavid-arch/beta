
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { Globe, Building, Phone, Loader2 } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';

const FARM_INFO_KEY = 'farmInformation';

export default function FarmSetupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const user = auth.currentUser;
        
        if (!user) {
            toast({
                variant: 'destructive',
                title: 'Error de autenticación',
                description: 'Debes estar conectado para configurar tu granja.',
            });
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData(event.currentTarget);
        
        // Generamos un ID único para la granja
        const farmId = `farm_${Date.now()}_${user.uid.substring(0, 5)}`;
        
        const farmData = {
            id: farmId,
            name: formData.get('farmName') as string,
            location: formData.get('location') as string,
            country: formData.get('country') as string,
            phone: formData.get('phone') as string,
            ownerId: user.uid,
            members: {
                [user.uid]: 'owner'
            },
            createdAt: new Date().toISOString(),
        };

        try {
            // 1. Crear el documento de la granja
            await setDoc(doc(db, 'farms', farmId), farmData);
            
            // 2. Vincular la granja al usuario
            await setDoc(doc(db, 'users', user.uid), { 
                farmId: farmId,
                farmInfo: farmData 
            }, { merge: true });
            
            localStorage.setItem(FARM_INFO_KEY, JSON.stringify(farmData));

            toast({
                title: '¡Granja Configurada!',
                description: 'Tu granja ha sido creada en la nube de forma segura.',
            });
            
            router.push('/dashboard');
        } catch (error) {
            console.error("Error saving farm info:", error);
            toast({
                variant: 'destructive',
                title: 'Error al guardar',
                description: 'No pudimos crear la granja en la base de datos.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="mx-auto w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mb-4 flex justify-center">
                        <Logo className="h-12 w-12" />
                    </div>
                    <CardTitle className="text-2xl font-bold">¡Bienvenido a SmartPig!</CardTitle>
                    <CardDescription>Configura tu granja para empezar a guardar datos en la nube.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="farmName">Nombre de la Granja</Label>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input id="farmName" name="farmName" placeholder="Ej: Granja El Porvenir" required className="pl-10" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">Ubicación</Label>
                             <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input id="location" name="location" placeholder="Ciudad o Municipio" required className="pl-10" />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="country">País</Label>
                            <Input id="country" name="country" placeholder="Ej: Colombia" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                             <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input id="phone" name="phone" type="tel" placeholder="Ej: 3101234567" required className="pl-10" />
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                            ) : (
                                'Crear Granja y Empezar'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
