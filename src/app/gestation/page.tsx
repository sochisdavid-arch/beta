
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, Search, PlusCircle, MoreHorizontal, X, Wheat, Users, HeartPulse, Wind, Loader2 } from 'lucide-react';
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
    birthDate: string;
    arrivalDate: string;
    weight: number;
    gender: string;
    status: StatusType;
    lastEvent: { type: string; date: string; [key: string]: any };
    events: any[];
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
      birthDate: formData.get('birthDate') as string,
      arrivalDate: formData.get('arrivalDate') as string,
      weight: Number(formData.get('weight')),
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Animales (Nube)</h1>
          <Button onClick={() => { setEditingPig(null); setIsFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Animal
          </Button>
        </div>

        <Card>
          <CardHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <Input placeholder="Buscar por ID..." value={filterId} onChange={(e) => setFilterId(e.target.value)} />
                  <Select value={filterBreed} onValueChange={setFilterBreed}>
                      <SelectTrigger><SelectValue placeholder="Raza" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {pigBreeds.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
          </CardHeader>
          <CardContent>
              <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Raza</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredPigs.map((pig) => (
                    <TableRow key={pig.id} onClick={() => router.push(`/gestation/${pig.id}`)} className="cursor-pointer">
                        <TableCell className="font-medium">{pig.id}</TableCell>
                        <TableCell><Badge variant="outline">{pig.status}</Badge></TableCell>
                        <TableCell>{pig.breed}</TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => { setEditingPig(pig); setIsFormOpen(true); }}>Editar</DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => { setPigToDelete(pig); setIsDeleteDialogOpen(true); }} className="text-red-500">Eliminar</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
              </Table>
          </CardContent>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingPig ? 'Editar' : 'Añadir'} Animal</DialogTitle></DialogHeader>
              <form onSubmit={handleAnimalFormSubmit} className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="id">ID</Label>
                    <Input id="id" name="id" required defaultValue={editingPig?.id} disabled={!!editingPig} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breed">Raza</Label>
                  <Select name="breed" required defaultValue={editingPig?.breed}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{pigBreeds.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>F. Nacimiento</Label><Input name="birthDate" type="date" required defaultValue={editingPig?.birthDate} /></div>
                    <div className="space-y-2"><Label>Peso (kg)</Label><Input name="weight" type="number" required defaultValue={editingPig?.weight} /></div>
                </div>
                <DialogFooter><Button type="submit">Guardar en Firestore</Button></DialogFooter>
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
