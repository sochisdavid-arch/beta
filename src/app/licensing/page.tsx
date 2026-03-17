
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { CheckCircle, ArrowLeft, MessageSquareQuote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { getLicenseInfo, savePlanForActivation } from '@/lib/license';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const tiers = [
    { id: 'tier-a', label: '1 - 50 Madres', basePrice: 5, sowLimit: 50 },
    { id: 'tier-b', label: '51 - 100 Madres', basePrice: 10, sowLimit: 100 },
    { id: 'tier-c', label: '101 - 200 Madres', basePrice: 18, sowLimit: 200 },
    { id: 'tier-d', label: '201+ Madres', basePrice: 30, sowLimit: Infinity },
];

const billingCycles = [
    { id: 'monthly', label: 'Mensual', months: 1, discount: 0, tag: '' },
    { id: 'quarterly', label: 'Trimestral', months: 3, discount: 0.07, tag: 'Ahorra 7%' },
    { id: 'semiannual', label: 'Semestral', months: 6, discount: 0.12, tag: 'Ahorra 12%' },
    { id: 'annual', label: 'Anual', months: 12, discount: 0.25, tag: 'Ahorra 25%' },
];

const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const payuLinks: Record<string, Record<string, string>> = {
    'tier-a': {
        'monthly': 'https://biz.payulatam.com/L0faca4D7ABAB27',
        'quarterly': 'https://biz.payulatam.com/L0faca445C1F166',
        'semiannual': 'https://biz.payulatam.com/L0faca4DAE819A9',
        'annual': 'https://biz.payulatam.com/L0faca418D14B84',
    },
    'tier-b': {
        'monthly': 'https://biz.payulatam.com/L0faca473F58861',
        'quarterly': 'https://biz.payulatam.com/L0faca46CB10C39',
        'semiannual': 'https://biz.payulatam.com/L0faca4B4E9EA31',
        'annual': 'https://biz.payulatam.com/L0faca479339D10',
    },
    'tier-c': {
        'monthly': 'https://biz.payulatam.com/L0faca417C297DC',
        'quarterly': 'https://biz.payulatam.com/L0faca4B0E2C49E',
        'semiannual': 'https://biz.payulatam.com/L0faca44E5E136F',
        'annual': 'https://biz.payulatam.com/L0faca415913AEB',
    },
    'tier-d': {
        'monthly': 'https://biz.payulatam.com/L0faca4CD3678C2',
        'quarterly': 'https://biz.payulatam.com/L0faca43738E952',
        'semiannual': 'https://biz.payulatam.com/L0faca41CDE8816',
        'annual': 'https://biz.payulatam.com/L0faca49469FC2F',
    },
};


export default function LicensingPage() {
    const router = useRouter();
    const [selectedTierId, setSelectedTierId] = React.useState(tiers[0].id);
    const [selectedCycleId, setSelectedCycleId] = React.useState(billingCycles[0].id);
    const [licenseExists, setLicenseExists] = React.useState(false);
    const [isPaymentInfoOpen, setIsPaymentInfoOpen] = React.useState(false);

    React.useEffect(() => {
        const license = getLicenseInfo();
        if (license) {
            setLicenseExists(true);
        }
    }, []);

    const selectedTier = React.useMemo(() => tiers.find(t => t.id === selectedTierId)!, [selectedTierId]);
    const selectedCycle = React.useMemo(() => billingCycles.find(c => c.id === selectedCycleId)!, [selectedCycleId]);

    const pricing = React.useMemo(() => {
        const baseTotal = selectedTier.basePrice * selectedCycle.months;
        const totalDiscount = baseTotal * selectedCycle.discount;
        const finalPrice = baseTotal - totalDiscount;
        const effectiveMonthly = finalPrice / selectedCycle.months;
        return { finalPrice, effectiveMonthly };
    }, [selectedTier, selectedCycle]);
    
    const handlePaymentClick = () => {
        // Step 1: Save the selected plan so the activation page knows what to activate.
        savePlanForActivation(selectedTier.id, selectedCycle.id);

        // Step 2: Open the correct PayU link in a new tab.
        const payuLink = payuLinks[selectedTier.id]?.[selectedCycle.id] || 'https://biz.payulatam.com/L0faca4D7ABAB27';
        window.open(payuLink, '_blank');

        // Step 3: Show the informational dialog with WhatsApp instructions.
        setIsPaymentInfoOpen(true);
    };


    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <main className="w-full max-w-4xl mx-auto">
                 {licenseExists && (
                    <div className="mb-6">
                        <Button variant="outline" asChild>
                            <Link href="/dashboard">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver al Panel de Control
                            </Link>
                        </Button>
                    </div>
                )}
                <div className="text-center mb-10">
                    <Logo className="h-16 w-16 mx-auto mb-4 text-primary" />
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900">Elige tu Plan</h1>
                    <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
                        Selecciona tu plan y ciclo de pago. Serás redirigido a PayU para completar tu compra de forma segura. Luego, activa tu licencia con el código de la transacción.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>1. ¿Cuántas madres productivas tienes en tu granja?</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RadioGroup value={selectedTierId} onValueChange={setSelectedTierId} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {tiers.map((tier) => (
                                        <Label key={tier.id} htmlFor={tier.id} className={cn(
                                            "flex items-center justify-between rounded-lg border-2 p-4 cursor-pointer transition-all",
                                            selectedTierId === tier.id ? "border-primary bg-primary/5" : "border-gray-200 bg-white hover:bg-gray-50"
                                        )}>
                                            <span className="font-semibold">{tier.label}</span>
                                            <RadioGroupItem value={tier.id} id={tier.id} className="sr-only"/>
                                            {selectedTierId === tier.id && <CheckCircle className="h-5 w-5 text-primary" />}
                                        </Label>
                                    ))}
                                </RadioGroup>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>2. Elige tu ciclo de facturación</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RadioGroup value={selectedCycleId} onValueChange={setSelectedCycleId} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {billingCycles.map((cycle) => (
                                        <Label key={cycle.id} htmlFor={cycle.id} className={cn(
                                            "relative flex flex-col rounded-lg border-2 p-4 cursor-pointer transition-all",
                                            selectedCycleId === cycle.id ? "border-primary bg-primary/5" : "border-gray-200 bg-white hover:bg-gray-50"
                                        )}>
                                            {cycle.tag && <div className="absolute -top-3 right-3 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-full">{cycle.tag}</div>}
                                            <div className="flex justify-between items-center w-full">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-lg">{cycle.label}</span>
                                                </div>
                                                <RadioGroupItem value={cycle.id} id={cycle.id} className="sr-only"/>
                                                 {selectedCycleId === cycle.id && <CheckCircle className="h-5 w-5 text-primary" />}
                                            </div>
                                        </Label>
                                    ))}
                                </RadioGroup>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1 sticky top-8">
                        <Card className="shadow-lg">
                            <CardHeader className="bg-gray-50">
                                <CardTitle className="text-center text-primary">Resumen de tu Suscripción</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="flex justify-between items-baseline"><span className="text-gray-600">Plan:</span><span className="font-bold">{selectedTier.label}</span></div>
                                <div className="flex justify-between items-baseline"><span className="text-gray-600">Ciclo:</span><span className="font-bold">{selectedCycle.label}</span></div>
                                <div className="border-t pt-4 mt-4">
                                    <div className="flex justify-between items-center"><span className="text-gray-600">Pagas hoy</span><span className="text-2xl font-bold text-gray-900">{formatCurrency(pricing.finalPrice)}</span></div>
                                    <p className="text-right text-sm text-gray-500">Efectivo a {formatCurrency(pricing.effectiveMonthly)} / mes</p>
                                </div>
                                <Button size="lg" className="w-full" onClick={handlePaymentClick}>
                                    Proceder al Pago
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            <Dialog open={isPaymentInfoOpen} onOpenChange={setIsPaymentInfoOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                           <MessageSquareQuote className="h-6 w-6 text-primary"/>
                           Instrucciones de Pago y Activación
                        </DialogTitle>
                         <DialogDescription>
                            Sigue estos pasos para activar tu licencia de SmartPig.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p>Para finalizar tu compra, por favor envía el comprobante de pago al siguiente número de WhatsApp para recibir tu código de activación:</p>
                        <p className="text-center text-lg font-bold bg-green-100 text-green-800 p-3 rounded-md">
                           +57 316 955 7978
                        </p>
                        <p>Una vez que recibas tu código, ve a la sección de <strong className="text-primary">Verificar y Activar Licencia</strong> para activar tu plan.</p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsPaymentInfoOpen(false)}>Entendido</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
