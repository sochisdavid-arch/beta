
"use client";

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Search, PlusCircle, MoreHorizontal, Loader2, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { differenceInWeeks, parseISO, format, isValid, addDays } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser, useFirestore, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

type StatusType = 'Gestante' | 'Vacia' | 'Destetada' | 'Remplazo' | 'Lactante';

interface Pig {
    id: string;
    breed: string;
    birthDate?: string;
    arrivalDate?: string;
    weight: number;
    gender: string;
    status: StatusType;
    lastEvent: { type: string; date: string; [key: string]: any };
    events: any[];
    purchaseValue?: number;
}

const pigBreeds = ["Duroc", "Yorkshire", "Landrace", "Hampshire", "Pietrain", "PIC", "Topigs Norsvin", "Otro"];

export default function GestationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [farmId, setFarmId] = React.useState<string | null>(null);
  
  React.useEffect(() => {
      const stored = localStorage.getItem('farmInformation');
      if (stored) {
          setFarmId(JSON.parse(stored).id);
      }
  }, []);

  const pigsQuery = useMemoFirebase(() => {
    if (!firestore || !farmId) return null;
    return collection(firestore, 'farms', farmId, 'pigs');
  }, [firestore, farmId]);

  const { data: pigs, isLoading } = useCollection<Pig>(pigsQuery);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingPig, setEditingPig] = React.useState<Pig | null>(null);
  const [gender, setGender] = React.useState<'Hembra' | 'Macho'>('Hembra');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [pigToDelete, setPigToDelete] = React.useState<Pig | null>(null);

  const [filterId, setFilterId] = React.useState('');
  const [filterBreed, setFilterBreed] = React.useState('all');

  const filteredPigs = React.useMemo(() => {
    if (!pigs) return [];
    let temp = pigs.filter(p => p.status !== 'Lactante');
    if (filterId) temp = temp.filter(p => p.id.toLowerCase().includes(filterId.toLowerCase()));
    if (filterBreed !== 'all') temp = temp.filter(p => p.breed === filterBreed);
    return temp;
  }, [pigs, filterId, filterBreed]);

  const kpis = React.useMemo(() => {
    const source = filteredPigs;
    return {
      gestantes: source.filter(p => p.status === 'Gestante').length,
      vacias: source.filter(p => p.status === 'Vacia').length,
      reemplazos: source.filter(p => p.status === 'Remplazo').length,
    };
  }, [filteredPigs]);

  const handleAnimalFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!farmId || !firestore || !user) return;

    const formData = new FormData(event.currentTarget);
    const pigId = formData.get('id') as string;
    
    const pigData = {
      id: pigId,
      farmId: farmId,
      breed: formData.get('breed') as string,
      gender: formData.get('gender') as string,
      birthDate: (formData.get('birthDate') as string) || '',
      arrivalDate: (formData.get('arrivalDate') as string) || '',
      weight: Number(formData.get('weight')),
      purchaseValue: formData.get('purchaseValue') ? Number(formData.get('purchaseValue')) : undefined,
      status: editingPig?.status || 'Remplazo',
      members: { [user.uid]: 'owner' },
      lastEvent: editingPig?.lastEvent || { type: 'Ninguno', date: '' },
      events: editingPig?.events || [],
    };

    const pigRef = doc(firestore, 'farms', farmId, 'pigs', pigId);
    setDocumentNonBlocking(pigRef, pigData, { merge: true });

    toast({
        title: editingPig ? "Animal Actualizado" : "Animal Añadido",
        description: `El animal ${pigId} se ha guardado en la nube.`
    });

    setIsFormOpen(false);
    setEditingPig(null);
  };

  React.useEffect(() => {
    if (!isFormOpen) return;
    setGender((editingPig?.gender as 'Hembra' | 'Macho') || 'Hembra');
  }, [isFormOpen, editingPig]);

  const handleDeleteConfirm = () => {
    if (pigToDelete && farmId && firestore) {
        const pigRef = doc(firestore, 'farms', farmId, 'pigs', pigToDelete.id);
        deleteDocumentNonBlocking(pigRef);
        toast({ title: "Eliminado", description: "Animal borrado de la base de datos.", variant: "destructive" });
    }
    setIsDeleteDialogOpen(false);
  };

  if (isLoading) return <AppLayout><div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Panel Gestación</h1>
            <p className="text-sm text-muted-foreground">Control de hembras y nutrición</p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Cargar
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs font-semibold text-muted-foreground">GESTANTES</p>
                <p className="mt-2 text-2xl font-bold">{kpis.gestantes}</p>
                <p className="text-xs text-muted-foreground">Activas</p>
              </div>
              <div className="rounded-lg border-2 border-red-300 bg-background p-4">
                <p className="text-xs font-semibold text-muted-foreground">VACÍAS</p>
                <p className="mt-2 text-2xl font-bold">{kpis.vacias}</p>
                <p className="text-xs text-muted-foreground">Servicio</p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs font-semibold text-muted-foreground">REEMPLAZOS</p>
                <p className="mt-2 text-2xl font-bold">{kpis.reemplazos}</p>
                <p className="text-xs text-muted-foreground">Cría</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Button
            className="h-12 w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => { setEditingPig(null); setIsFormOpen(true); }}
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Añadir Animal
          </Button>
          <Button
            className="h-12 w-full bg-orange-500 hover:bg-orange-600"
            onClick={() => router.push('/forms/templates/consumo-alimento')}
          >
            Consumo
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ID / Chapeta"
                  value={filterId}
                  onChange={(e) => setFilterId(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Select value={filterBreed} onValueChange={setFilterBreed}>
                  <SelectTrigger className="pl-9">
                    <SelectValue placeholder="Raza" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {pigBreeds.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              {filteredPigs.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Sin resultados
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredPigs.map((pig) => (
                    <div
                      key={pig.id}
                      onClick={() => router.push(`/gestation/${pig.id}`)}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-background p-4 hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{pig.id}</p>
                        <p className="text-sm text-muted-foreground">{pig.breed}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="hidden sm:block">
                          <span className="rounded-md border px-2 py-1 text-xs">{pig.status}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" aria-label="Acciones">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => { setEditingPig(pig); setIsFormOpen(true); }}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => { setPigToDelete(pig); setIsDeleteDialogOpen(true); }}
                              className="text-red-500"
                            >
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPig ? 'Editar' : 'Añadir Nueva Hembra'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAnimalFormSubmit} className="grid gap-5 py-2">
                <div className="space-y-2">
                  <Label>Género *</Label>
                  <input type="hidden" name="gender" value={gender} />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={gender === 'Hembra' ? 'default' : 'outline'}
                      className="h-10"
                      onClick={() => setGender('Hembra')}
                    >
                      Hembra
                    </Button>
                    <Button
                      type="button"
                      variant={gender === 'Macho' ? 'default' : 'outline'}
                      className="h-10"
                      onClick={() => setGender('Macho')}
                    >
                      Macho
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id">ID / Chapeta *</Label>
                  <Input
                    id="id"
                    name="id"
                    placeholder="Ej: H102"
                    required
                    defaultValue={editingPig?.id}
                    disabled={!!editingPig}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="breed">Raza *</Label>
                    <Select name="breed" required defaultValue={editingPig?.breed}>
                      <SelectTrigger id="breed"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                      <SelectContent>
                        {pigBreeds.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso (kg) *</Label>
                    <Input id="weight" name="weight" type="number" min={0} step="0.1" required defaultValue={editingPig?.weight ?? 0} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">Fecha Nacimiento (Opcional)</Label>
                  <Input id="birthDate" name="birthDate" type="date" defaultValue={editingPig?.birthDate || ''} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arrivalDate">Fecha Llegada (Opcional)</Label>
                  <Input id="arrivalDate" name="arrivalDate" type="date" defaultValue={editingPig?.arrivalDate || ''} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchaseValue">Valor Compra</Label>
                  <Input id="purchaseValue" name="purchaseValue" type="number" min={0} step="0.01" defaultValue={editingPig?.purchaseValue ?? 0} />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="submit">Guardar en Firestore</Button>
                </DialogFooter>
              </form>
            </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>¿Eliminar animal?</AlertDialogTitle></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm}>Eliminar permanentemente</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
