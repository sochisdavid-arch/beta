
"use client";

import { useState, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPigDiagnosis, type PigDoctorOutput } from '@/ai/flows/pig-doctor';
import { Camera, Loader2, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Label } from './ui/label';

const formSchema = z.object({
  symptoms: z.string().min(10, { message: "Describa los síntomas con al menos 10 caracteres." }),
  photoDataUri: z.string().optional(),
});

type PigDoctorInputCardProps = {
    onNewDiagnosis: (diagnosis: PigDoctorOutput | null) => void;
    onLoading: (isLoading: boolean) => void;
    onError: () => void;
    isLoading: boolean;
}

export function PigDoctorInputCard({ onNewDiagnosis, onLoading, onError, isLoading }: PigDoctorInputCardProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symptoms: 'Lechón de 35 días presenta diarrea acuosa amarillenta, deshidratación severa y letargo. No quiere comer. Se observan 4 casos similares en el mismo corral.',
      photoDataUri: undefined,
    },
  });

  const { setValue, watch } = form;
  const photoDataUri = watch('photoDataUri');

  const getCameraPermission = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
           toast({ variant: 'destructive', title: 'Error', description: 'La cámara no es soportada por este navegador.' });
           return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setIsCameraActive(false);
        toast({
          variant: 'destructive',
          title: 'Acceso a la Cámara Denegado',
          description: 'Por favor, habilita los permisos de la cámara en los ajustes de tu navegador.',
        });
      }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('photoDataUri', reader.result as string);
        if (isCameraActive) {
          stopCamera();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    onLoading(true);
    onNewDiagnosis(null);

    let submissionValues = { ...values };

    if (isCameraActive && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if(context) {
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUri = canvas.toDataURL('image/jpeg');
            submissionValues.photoDataUri = dataUri;
        }
        stopCamera();
    }
    
    try {
      const result = await getPigDiagnosis(submissionValues);
      onNewDiagnosis(result);
    } catch (error) {
      console.error("Error al obtener el diagnóstico:", error);
      onError();
    } finally {
      onLoading(false);
    }
  }

  const clearImage = () => {
    setValue('photoDataUri', undefined);
    if (isCameraActive) {
      stopCamera();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Información Clínica</CardTitle>
          <CardDescription>Describa los síntomas y adjunte una foto para que la IA genere un análisis.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col">
              <FormField
                control={form.control}
                name="symptoms"
                render={({ field }) => (
                  <FormItem className="flex-1 flex flex-col">
                    <FormLabel>Síntomas, Historial y Observaciones</FormLabel>
                    <FormControl className="flex-1">
                      <Textarea placeholder="Describa todo lo que observa: síntomas, edad, etapa, condiciones del corral, etc." {...field} className="h-full"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormLabel>Foto (Opcional)</FormLabel>
                {!(photoDataUri || isCameraActive) && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={getCameraPermission}>
                        <Camera className="mr-2 h-4 w-4" /> Cámara
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" /> Subir Foto
                    </Button>
                    <Input 
                        type="file" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*"
                    />
                  </div>
                )}
                
                {(photoDataUri || isCameraActive) && (
                    <div className="relative aspect-video w-full">
                        {isCameraActive ? (
                            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover rounded-md bg-muted" />
                        ) : photoDataUri ? (
                            <img src={photoDataUri} alt="Vista previa" className="w-full h-full object-cover rounded-md" />
                        ) : (
                             <Alert variant="destructive">
                                <AlertTitle>Acceso a la Cámara Denegado</AlertTitle>
                                <AlertDescription>
                                    Habilite los permisos en su navegador para usar la cámara.
                                </AlertDescription>
                            </Alert>
                        )}

                        {(photoDataUri || isCameraActive) && (
                             <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6 rounded-full z-10"
                                onClick={clearImage}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                )}
              </div>
              
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando...</> : 'Obtener Diagnóstico IA'}
              </Button>
            </form>
          </Form>
        </CardContent>
    </Card>
  );
}
