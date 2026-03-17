
"use client";

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, UserSearch, Download, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SowProfileCard, type SowData, processSowHistory, exportSowProfilePDF } from '@/components/SowProfileCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from 'next/link';
import { Logo } from '@/components/Logo';


interface Pig {
    id: string;
    breed: string;
    birthDate: string;
    status: string;
    gender: string;
    events: any[];
    location?: string;
}

const FarrowingRecordForm = () => (
    <div className="bg-white py-8" id="farrowing-form-printable">
      <div className="flex items-center justify-between mb-6 px-8 print:px-0">
          <div className="flex items-center gap-4">
              <Logo className="h-12 w-12 text-primary" />
              <div>
                  <h1 className="text-xl font-bold text-primary">SmartPig</h1>
                  <p className="text-sm text-muted-foreground">Granja Demo</p>
              </div>
          </div>
          <div className="text-right">
              <h2 className="text-2xl font-bold uppercase">Registro de Parto</h2>
          </div>
      </div>
      <Card className="w-full max-w-4xl mx-auto border-none shadow-none">
        <CardContent className="text-xs">
          <div className="grid grid-cols-3 gap-4 mb-4 border p-2 rounded-md">
            <div className="flex items-baseline gap-2"><p className="font-bold">FECHA PARTO:</p><div className="border-b flex-1"></div></div>
            <div className="flex items-baseline gap-2"><p className="font-bold">HORA INICIO:</p><div className="border-b flex-1"></div></div>
            <div className="flex items-baseline gap-2"><p className="font-bold">HORA FIN:</p><div className="border-b flex-1"></div></div>
            <div className="flex items-baseline gap-2"><p className="font-bold">PESO CAMADA:</p><div className="border-b flex-1"></div></div>
            <div className="flex items-baseline gap-2"><p className="font-bold">PESO PROMEDIO:</p><div className="border-b flex-1"></div></div>
            <div className="flex items-baseline gap-2"><p className="font-bold">Nº CERDA:</p><div className="border-b flex-1"></div></div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-1">
               <Table className="border">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="p-1 text-center font-bold text-black border" colSpan={3}>TEMPERATURA</TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead className="p-1 text-center font-bold text-black border">DÍA</TableHead>
                      <TableHead className="p-1 text-center font-bold text-black border">MAÑANA</TableHead>
                      <TableHead className="p-1 text-center font-bold text-black border">TARDE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell className="p-1 border text-center font-bold">1</TableCell><TableCell className="p-1 border h-6"></TableCell><TableCell className="p-1 border h-6"></TableCell></TableRow>
                    <TableRow><TableCell className="p-1 border text-center font-bold">2</TableCell><TableCell className="p-1 border h-6"></TableCell><TableCell className="p-1 border h-6"></TableCell></TableRow>
                    <TableRow><TableCell className="p-1 border text-center font-bold">3</TableCell><TableCell className="p-1 border h-6"></TableCell><TableCell className="p-1 border h-6"></TableCell></TableRow>
                  </TableBody>
                </Table>
            </div>
          </div>

          <Table className="border">
              <TableHeader>
                  <TableRow>
                      <TableHead className="p-1 border text-center text-black font-bold">Nº</TableHead>
                      <TableHead className="p-1 border text-center text-black font-bold">PESO</TableHead>
                      <TableHead className="p-1 border text-center text-black font-bold">HORA</TableHead>
                      <TableHead className="p-1 border text-center text-black font-bold">VIVO</TableHead>
                      <TableHead className="p-1 border text-center text-black font-bold">MUERTO</TableHead>
                      <TableHead className="p-1 border text-center text-black font-bold">MOMIA</TableHead>
                      <TableHead className="p-1 border text-center text-black font-bold">DEFORME</TableHead>
                      <TableHead className="p-1 border text-center text-black font-bold">BAJA V.</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {Array.from({ length: 20 }).map((_, index) => (
                      <TableRow key={index}>
                          <TableCell className="p-1 border h-6 text-center font-bold">{index + 1}</TableCell>
                          <TableCell className="p-1 border"></TableCell>
                          <TableCell className="p-1 border"></TableCell>
                          <TableCell className="p-1 border"></TableCell>
                          <TableCell className="p-1 border"></TableCell>
                          <TableCell className="p-1 border"></TableCell>
                          <TableCell className="p-1 border"></TableCell>
                          <TableCell className="p-1 border"></TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
);


export default function SowCardPage() {
    const searchParams = useSearchParams();
    const sowIdFromQuery = searchParams.get('sowId');
    
    const [allSows, setAllSows] = React.useState<Pig[]>([]);
    const [selectedSow, setSelectedSow] = React.useState<Pig | null>(null);
    const [open, setOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState("sow-card");
    const [sowData, setSowData] = React.useState<SowData | null>(null);

    React.useEffect(() => {
        const pigsFromStorage = localStorage.getItem('pigs');
        if (pigsFromStorage) {
            const allPigs: Pig[] = JSON.parse(pigsFromStorage);
            const femalePigs = allPigs.filter(p => p.gender === 'Hembra');
            setAllSows(femalePigs);

            if (sowIdFromQuery) {
                const sowToSelect = femalePigs.find(s => s.id === sowIdFromQuery);
                if(sowToSelect) {
                    const processedData = processSowHistory(sowToSelect);
                    setSelectedSow(sowToSelect);
                    setSowData(processedData);
                }
            }
        }
    }, [sowIdFromQuery]);

    const handleSowSelection = (sowId: string) => {
        const sowToSelect = allSows.find(s => s.id === sowId);
        if (sowToSelect) {
            setSelectedSow(sowToSelect);
            setSowData(processSowHistory(sowToSelect));
        }
        setOpen(false);
    };
    
    const handleExport = () => {
        if(activeTab === 'farrowing-form') {
            window.print();
        } else if (sowData && selectedSow) {
            exportSowProfilePDF(selectedSow, sowData);
        }
    }

    return (
        <div className="bg-gray-100 min-h-screen">
            <header className="bg-background p-4 border-b print:hidden">
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" asChild>
                            <Link href="/analysis/reproductive-loss-analysis">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver a Análisis
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                             <UserSearch className="h-6 w-6 text-primary" />
                             <h1 className="text-xl font-bold tracking-tight">Ficha de la Madre</h1>
                        </div>
                    </div>
                     <div className="flex flex-wrap items-center gap-2">
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={open}
                                    className="w-full sm:w-[250px] justify-between"
                                >
                                    {selectedSow
                                        ? selectedSow.id
                                        : "Seleccionar madre..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar por ID..." />
                                    <CommandList>
                                        <CommandEmpty>No se encontraron madres.</CommandEmpty>
                                        <CommandGroup>
                                            {allSows.map((sow) => (
                                                <CommandItem
                                                    key={sow.id}
                                                    value={sow.id}
                                                    onSelect={() => handleSowSelection(sow.id)}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedSow?.id === sow.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {sow.id}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                         <Button onClick={handleExport} disabled={!selectedSow}>
                            <Download className="mr-2 h-4 w-4" />
                            Guardar como PDF
                        </Button>
                    </div>
                </div>
            </header>

            <main className="p-4 print:p-0">
                <div className="max-w-5xl mx-auto bg-white shadow-lg print:shadow-none">
                     <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full print:hidden">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="sow-card">Ficha de Vida</TabsTrigger>
                            <TabsTrigger value="farrowing-form">Formulario de Parto</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    
                    <div className="mt-4">
                        {!selectedSow ? (
                            <Card className="flex items-center justify-center min-h-[400px] border-dashed print:hidden">
                                <div className="text-center text-muted-foreground">
                                    <UserSearch className="h-16 w-16 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold">Seleccione una madre</h3>
                                    <p>Elija una madre de la lista para ver su hoja de vida completa.</p>
                                </div>
                            </Card>
                        ) : (
                           <div id="printable-content">
                                {activeTab === 'sow-card' && sowData && <SowProfileCard sow={selectedSow} sowData={sowData} />}
                                {activeTab === 'farrowing-form' && <FarrowingRecordForm />}
                           </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

