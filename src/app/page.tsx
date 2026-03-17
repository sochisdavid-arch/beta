
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { auth } from '@/lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { FirebaseError } from 'firebase/app';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (error) {
      if (error instanceof FirebaseError && ['auth/cancelled-popup-request', 'auth/popup-closed-by-user', 'auth/popup-blocked'].includes(error.code)) {
        console.log("Sign-in popup action cancelled or blocked by user/browser.");
        return;
      }
      console.error("Error during Google sign-in:", error);
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión con Google",
        description: "No se pudo iniciar sesión. Por favor, inténtalo de nuevo más tarde.",
      });
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error) {
      console.error("Error during email sign-in:", error);
      let description = "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.";
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          description = "Correo electrónico o contraseña incorrectos. Por favor, verifica tus credenciales.";
        } else if (error.code === 'auth/invalid-email') {
            description = "El formato del correo electrónico es inválido. Por favor, verifica que esté bien escrito.";
        }
      }
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: description,
      });
    }
  };
  
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
        toast({ variant: 'destructive', title: 'Error', description: 'Por favor, introduce tu correo electrónico.' });
        return;
    }
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        toast({
            title: 'Correo Enviado',
            description: 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña.',
        });
        setIsResetDialogOpen(false);
        setResetEmail('');
    } catch (error) {
        console.error("Error sending password reset email:", error);
        let description = "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.";
        if (error instanceof FirebaseError) {
             if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
                description = "El correo electrónico no está registrado o es inválido.";
             }
        }
        toast({ variant: 'destructive', title: 'Error', description });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-bold">SmartPig</CardTitle>
          <CardDescription>Introduce tus credenciales para iniciar sesión</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSignIn}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="m@ejemplo.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Contraseña</Label>
                   <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                      <DialogTrigger asChild>
                         <Button variant="link" type="button" className="ml-auto inline-block text-sm underline p-0 h-auto">
                            ¿Olvidaste tu contraseña?
                          </Button>
                      </DialogTrigger>
                      <DialogContent>
                          <DialogHeader>
                              <DialogTitle>Restablecer Contraseña</DialogTitle>
                              <DialogDescription>
                                  Introduce tu correo electrónico para recibir un enlace de recuperación.
                              </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handlePasswordReset} id="reset-form" className="py-4">
                              <div className="grid gap-2">
                                  <Label htmlFor="reset-email">Correo electrónico</Label>
                                  <Input
                                      id="reset-email"
                                      type="email"
                                      placeholder="m@ejemplo.com"
                                      required
                                      value={resetEmail}
                                      onChange={(e) => setResetEmail(e.target.value)}
                                  />
                              </div>
                          </form>
                           <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsResetDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" form="reset-form">Enviar enlace</Button>
                           </DialogFooter>
                      </DialogContent>
                  </Dialog>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Iniciar sesión
              </Button>
            </div>
          </form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">O continuar con</span>
            </div>
          </div>
          <div className="grid gap-2">
             <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
                Google
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            ¿No tienes una cuenta?{' '}
            <Link href="/signup" className="underline">
              Regístrate
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
