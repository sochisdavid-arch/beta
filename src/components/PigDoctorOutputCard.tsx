
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type PigDoctorOutput } from '@/ai/flows/pig-doctor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, Loader2, Syringe, AlertTriangle, Microscope, FlaskConical, ShieldCheck } from 'lucide-react';
import { Separator } from './ui/separator';

type PigDoctorOutputCardProps = {
    diagnosis: PigDoctorOutput | null;
    isLoading: boolean;
}

export function PigDoctorOutputCard({ diagnosis, isLoading }: PigDoctorOutputCardProps) {
    
    if (isLoading) {
        return (
            <Card className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center text-muted-foreground p-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <h3 className="text-xl font-semibold">Procesando Datos Clínicos</h3>
                    <p>PigDoctor está correlacionando síntomas, historial y datos ambientales para encontrar el diagnóstico más probable. Por favor espera.</p>
                </div>
            </Card>
        );
    }
    
    if (!diagnosis) {
        return (
            <Card className="flex h-full items-center justify-center border-dashed">
                <div className="flex flex-col items-center gap-4 text-center text-muted-foreground p-8">
                    <FlaskConical className="h-12 w-12" />
                    <h3 className="text-xl font-semibold">Esperando Datos del Caso</h3>
                    <p>Completa el formulario para que PigDoctor AI pueda analizar el caso y generar un diagnóstico presuntivo.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="bg-secondary/50 h-full flex flex-col">
            <CardHeader>
              <CardTitle>Análisis de PigDoctor AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 overflow-y-auto">
                <Alert variant={diagnosis.riskLevel === "Brote Potencial" ? "destructive" : "default"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Riesgo Sanitario: {diagnosis.riskLevel}</AlertTitle>
                    <AlertDescription>Nivel de riesgo estimado basado en el número de casos y síntomas.</AlertDescription>
                </Alert>

                <div className="p-4 border rounded-lg bg-background">
                    <div className="flex items-start gap-4">
                        <Microscope className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="font-semibold text-lg">Diagnóstico Presuntivo</h4>
                            <p className="text-xl font-bold text-primary">{diagnosis.presumptiveDiagnosis.diseaseName} ({diagnosis.presumptiveDiagnosis.probability}%)</p>
                            <p className="text-sm text-muted-foreground mt-1">{diagnosis.presumptiveDiagnosis.justification}</p>
                        </div>
                    </div>
                    <Separator className="my-4" />
                    <h5 className="font-semibold mb-2">Diagnósticos Diferenciales</h5>
                    <ul className="space-y-2 text-sm">
                        {diagnosis.differentialDiagnoses.map((d, i) => (
                           <li key={i} className="flex justify-between items-center">
                               <span>{d.diseaseName}</span>
                               <span className="font-mono text-xs p-1 bg-muted rounded-md">{d.probability}%</span>
                           </li>
                        ))}
                    </ul>
                </div>
                
                <Alert>
                    <Syringe className="h-4 w-4" />
                    <AlertTitle>Tratamiento Sugerido</AlertTitle>
                    <AlertDescription>
                        <p className="font-semibold">Medicación:</p>
                        <p>{diagnosis.recommendedTreatment.medication}</p>
                        <p className="font-semibold mt-2">Medidas Complementarias:</p>
                        <p>{diagnosis.recommendedTreatment.complementaryMeasures}</p>
                        <p className="font-semibold mt-2">Período de Retiro:</p>
                        <p>{diagnosis.recommendedTreatment.withdrawalPeriod}</p>
                    </AlertDescription>
                </Alert>

                <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>Recomendaciones Operativas</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc pl-5 space-y-1">
                            {diagnosis.operationalRecommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                        </ul>
                    </AlertDescription>
                </Alert>

                <Alert variant="destructive">
                    <ShieldCheck className="h-4 w-4" />
                    <AlertTitle>Aviso Importante</AlertTitle>
                    <AlertDescription>Este es un diagnóstico presuntivo y debe ser validado por un médico veterinario.</AlertDescription>
                </Alert>
            </CardContent>
          </Card>
    );
}

