
"use client";

import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
    const { toast } = useToast();
    const [isDarkMode, setIsDarkMode] = React.useState(false);
    const [pushNotificationsEnabled, setPushNotificationsEnabled] = React.useState(false);
    const [emailNotificationsEnabled, setEmailNotificationsEnabled] = React.useState(false);

    React.useEffect(() => {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        setIsDarkMode(darkMode);
        document.documentElement.classList.toggle('dark', darkMode);
        
        const emailNotifications = localStorage.getItem('emailNotificationsEnabled') === 'true';
        setEmailNotificationsEnabled(emailNotifications);

        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                setPushNotificationsEnabled(true);
            }
        }
    }, []);

    const handleDarkModeToggle = (checked: boolean) => {
        setIsDarkMode(checked);
        localStorage.setItem('darkMode', String(checked));
        document.documentElement.classList.toggle('dark', checked);
        toast({ title: `Modo ${checked ? 'Oscuro' : 'Claro'} Activado` });
    };

    const handleEmailNotificationsToggle = (checked: boolean) => {
        setEmailNotificationsEnabled(checked);
        localStorage.setItem('emailNotificationsEnabled', String(checked));
        toast({ title: `Notificaciones por correo ${checked ? 'activadas' : 'desactivadas'}` });
    }

    const handlePushNotificationsToggle = async (checked: boolean) => {
        if (!('Notification' in window)) {
            toast({ variant: 'destructive', title: 'Error', description: 'Este navegador no soporta notificaciones push.' });
            return;
        }

        if (!window.isSecureContext) {
            toast({
                variant: 'destructive',
                title: 'Contexto no seguro',
                description: 'Las notificaciones solo se pueden activar en un sitio con HTTPS o en localhost.',
            });
            setPushNotificationsEnabled(false);
            return;
        }

        if (checked) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setPushNotificationsEnabled(true);
                toast({ title: 'Notificaciones Activadas', description: 'Recibirás notificaciones importantes.' });
                new Notification('¡Bienvenido a las notificaciones!', {
                    body: 'Gracias por activar las notificaciones de SmartPig.',
                    icon: '/favicon.ico' 
                });
            } else {
                setPushNotificationsEnabled(false);
                toast({ variant: 'destructive', title: 'Permiso Denegado', description: 'No se pudieron activar las notificaciones.' });
            }
        } else {
            setPushNotificationsEnabled(false);
            toast({ title: 'Notificaciones Desactivadas' });
        }
    };


    return (
        <AppLayout>
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold tracking-tight mb-6">Configuración</h1>
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notificaciones</CardTitle>
                            <CardDescription>Gestiona cómo recibes las notificaciones de la aplicación.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="email-notifications">Notificaciones por correo electrónico</Label>
                                <Switch 
                                    id="email-notifications" 
                                    checked={emailNotificationsEnabled}
                                    onCheckedChange={handleEmailNotificationsToggle}
                                />
                            </div>
                             <div className="flex items-center justify-between">
                                <Label htmlFor="push-notifications">Notificaciones push</Label>
                                <Switch 
                                    id="push-notifications" 
                                    checked={pushNotificationsEnabled}
                                    onCheckedChange={handlePushNotificationsToggle}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Apariencia</CardTitle>
                             <CardDescription>Personaliza la apariencia de la aplicación.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="flex items-center justify-between">
                                <Label htmlFor="dark-mode">Modo Oscuro</Label>
                                <Switch 
                                    id="dark-mode"
                                    checked={isDarkMode}
                                    onCheckedChange={handleDarkModeToggle}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    <Button onClick={() => toast({title: "Preferencias guardadas"})}>Guardar Preferencias</Button>
                </div>
            </div>
        </AppLayout>
    );
}
