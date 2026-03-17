
"use client";

import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { auth } from '@/lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';

export default function ProfilePage() {
    const { toast } = useToast();
    const [profileImage, setProfileImage] = React.useState<string | null>("https://placehold.co/100x100.png");
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [currentPassword, setCurrentPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmNewPassword, setConfirmNewPassword] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);


    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result as string);
                // Here you would typically upload the image to a storage service
                // and save the URL to the user's profile.
                toast({
                    title: "Imagen de perfil actualizada",
                    description: "Tu nueva foto de perfil se ha guardado localmente.",
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };
    
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (newPassword !== confirmNewPassword) {
            toast({ variant: 'destructive', title: 'Error', description: 'Las nuevas contraseñas no coinciden.' });
            setIsLoading(false);
            return;
        }

        if (!newPassword || newPassword.length < 6) {
            toast({ variant: 'destructive', title: 'Error', description: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            setIsLoading(false);
            return;
        }
        
        const user = auth.currentUser;
        if (!user || !user.email) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar el usuario actual.' });
            setIsLoading(false);
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);

            toast({
                title: 'Éxito',
                description: 'Tu contraseña ha sido actualizada correctamente.',
            });
            
            // Clear password fields after success
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');

        } catch (error) {
            console.error("Error updating password:", error);
            let description = 'Ocurrió un error inesperado.';
            if (error instanceof FirebaseError) {
                if(error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    description = 'La contraseña actual es incorrecta.';
                } else if (error.code === 'auth/requires-recent-login') {
                    description = 'Esta operación requiere un inicio de sesión reciente. Por favor, cierra sesión y vuelve a entrar.';
                }
            }
            toast({ variant: 'destructive', title: 'Error al cambiar la contraseña', description });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AppLayout>
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold tracking-tight mb-6">Perfil de Usuario</h1>
                <form onSubmit={handlePasswordChange}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Información de la Cuenta</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={profileImage || undefined} />
                                    <AvatarFallback>A</AvatarFallback>
                                </Avatar>
                                <Input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                    className="hidden"
                                    accept="image/*"
                                />
                                <Button type="button" variant="outline" onClick={handleButtonClick}>Cambiar foto</Button>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nombre</Label>
                                    <Input id="name" defaultValue="Admin de la Granja" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Correo Electrónico</Label>
                                    <Input id="email" type="email" defaultValue={auth.currentUser?.email || "admin@smartpig.com"} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="current-password">Contraseña Actual</Label>
                                    <Input id="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">Nueva Contraseña</Label>
                                    <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required/>
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="confirm-new-password">Confirmar Nueva Contraseña</Label>
                                    <Input id="confirm-new-password" type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required/>
                                </div>
                            </div>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}
