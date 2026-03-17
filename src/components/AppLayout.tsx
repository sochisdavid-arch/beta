
"use client";

import * as React from "react";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  LayoutDashboard,
  Settings,
  LogOut,
  User,
  Beef,
  Boxes,
  Users,
  Landmark,
  LineChart,
  ChevronDown,
  Activity,
  GitCommitHorizontal,
  ClipboardList,
  TestTube,
  Baby,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { SpermIcon } from '@/components/icons/sperm-icon';
import { BabyBottleIcon } from '@/components/icons/baby-bottle-icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/Logo';
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { checkLicense } from "@/lib/license";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isCheckingSetup, setIsCheckingSetup] = React.useState(true);

  React.useEffect(() => {
    const checkSetupAndLicense = async (user: any) => {
      const publicPaths = ['/licensing', '/payment-confirmation', '/farm-setup', '/signup', '/'];
      
      if (publicPaths.includes(pathname)) {
          setIsCheckingSetup(false);
          return; 
      }

      if (!user) {
          router.push('/');
          return;
      }

      let farmInfo = localStorage.getItem('farmInformation');
      
      if (!farmInfo) {
          try {
              const docRef = doc(db, 'users', user.uid);
              const docSnap = await getDoc(docRef);
              
              if (docSnap.exists() && docSnap.data().farmInfo) {
                  const data = docSnap.data().farmInfo;
                  localStorage.setItem('farmInformation', JSON.stringify(data));
                  farmInfo = JSON.stringify(data);
              }
          } catch (error) {
              console.error("Error fetching farm setup:", error);
          }
      }

      if (!farmInfo && pathname !== '/farm-setup') {
        router.push('/farm-setup');
        setIsCheckingSetup(false);
        return;
      }

      const pigsFromStorage = localStorage.getItem('pigs');
      const allPigs = pigsFromStorage ? JSON.parse(pigsFromStorage) : [];
      const sowCount = allPigs.filter((p: any) => p.gender === 'Hembra').length;
      
      const licenseStatus = checkLicense(sowCount);

      if (!licenseStatus.isValid) {
          toast({
              variant: "destructive",
              title: "Licencia Expirada",
              description: licenseStatus.message,
              duration: 10000,
          });
          router.push('/licensing');
      }
      
      setIsCheckingSetup(false);
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
        checkSetupAndLicense(user);
    });

    return () => unsubscribe();
  }, [pathname, router, toast]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
      toast({
        title: "Sesión Cerrada",
        description: "Has cerrado sesión correctamente.",
      });
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cerrar la sesión. Por favor, inténtalo de nuevo.",
      });
    }
  };

  const menuItems = [
    { href: '/dashboard', label: 'Panel de Control', icon: LayoutDashboard },
    { href: '/gestation', label: 'Gestación', icon: SpermIcon },
    { href: '/lactation', label: 'Lactancia', icon: BabyBottleIcon },
    { href: '/verracos', label: 'Verracos', icon: TestTube },
    { href: '/precebo', label: 'Precebo', icon: Baby },
    { href: '/ceba', label: 'Ceba', icon: LayoutDashboard },
    { href: '/inventory', label: 'Inventario', icon: Boxes },
    { href: '/personnel', label: 'Personal', icon: Users },
    { href: '/finance', label: 'Análisis Financiero', icon: Landmark },
    { href: '/forms', label: 'Formularios', icon: ClipboardList },
  ];
  
  const gestationAnalysisMenuItems = [
      { href: '/analysis/gestation-performance', label: 'Desempeño Gestación' },
      { href: '/analysis/reproductive-loss', label: 'Pérdida Reproductiva' },
      { href: '/analysis/service-analysis', label: 'Análisis de Servicios' },
      { href: '/analysis/farrowing-rate', label: 'Análisis Tasa de Parición' },
      { href: '/analysis/reproductive-loss-analysis', label: 'Análisis Pérdidas Reproductivas' },
      { href: '/analysis/sow-card', label: 'Ficha de la Madre' },
  ];
  
  const lactationAnalysisMenuItems = [
       { href: '/analysis/maternity-performance', label: 'Análisis Potencial Productivo' },
       { href: '/analysis/farrowing-forecast', label: 'Previsión de Parto' },
       { href: '/analysis/weaning-forecast', label: 'Previsión de Destete' },
       { href: '/analysis/birth-analysis', label: 'Análisis de Nacimientos' },
       { href: '/analysis/lactation-analysis', label: 'Análisis de Destetados' },
       { href: '/analysis/mortality-analysis', label: 'Análisis de mortalidad' },
  ];
  
  const productionAnalysisMenuItems = [
       { href: '/analysis/liquidated-batches', label: 'Lotes Liquidados' },
  ];

  const licenseMenuItems = [
      { href: '/licensing', label: 'Comprar Licencia' },
      { href: '/payment-confirmation', label: 'Verificar y Activar Licencia' },
  ];

  const isGestationAnalysisActive = gestationAnalysisMenuItems.some(item => pathname.startsWith(item.href));
  const isLactationAnalysisActive = lactationAnalysisMenuItems.some(item => pathname.startsWith(item.href));
  const isProductionAnalysisActive = productionAnalysisMenuItems.some(item => pathname.startsWith(item.href));

  if (isCheckingSetup && !['/licensing', '/payment-confirmation', '/farm-setup', '/signup', '/'].includes(pathname)) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-muted-foreground animate-pulse font-medium">Cargando SmartPig...</p>
              </div>
          </div>
      );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="size-7" />
            <span className="font-bold text-lg">SmartPig</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href) && item.href !== '/'}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
             <SidebarMenuItem>
                 <Collapsible>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                            className="justify-between"
                            variant={isGestationAnalysisActive ? "default" : "outline"}
                            isActive={isGestationAnalysisActive}
                        >
                            <div className="flex items-center gap-2">
                                <GitCommitHorizontal />
                                <span>Análisis Gestación</span>
                            </div>
                            <ChevronDown className="size-4 shrink-0 transition-transform ease-in-out group-data-[state=open]:rotate-180" />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            {gestationAnalysisMenuItems.map((item) => (
                                <SidebarMenuSubItem key={item.href}>
                                    <SidebarMenuSubButton asChild isActive={pathname === item.href}>
                                        <Link href={item.href}>{item.label}</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarMenuItem>
            <SidebarMenuItem>
                 <Collapsible>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                            className="justify-between"
                            variant={isLactationAnalysisActive ? "default" : "outline"}
                            isActive={isLactationAnalysisActive}
                        >
                            <div className="flex items-center gap-2">
                                <Activity />
                                <span>Análisis Lactancia</span>
                            </div>
                            <ChevronDown className="size-4 shrink-0 transition-transform ease-in-out group-data-[state=open]:rotate-180" />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            {lactationAnalysisMenuItems.map((item) => (
                                <SidebarMenuSubItem key={item.href}>
                                    <SidebarMenuSubButton asChild isActive={pathname === item.href}>
                                        <Link href={item.href}>{item.label}</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarMenuItem>
             <SidebarMenuItem>
                 <Collapsible>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                            className="justify-between"
                            variant={isProductionAnalysisActive ? "default" : "outline"}
                            isActive={isProductionAnalysisActive}
                        >
                            <div className="flex items-center gap-2">
                                <LineChart />
                                <span>Análisis de Precebo y Ceba</span>
                            </div>
                            <ChevronDown className="size-4 shrink-0 transition-transform ease-in-out group-data-[state=open]:rotate-180" />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            {productionAnalysisMenuItems.map((item) => (
                                <SidebarMenuSubItem key={item.href}>
                                    <SidebarMenuSubButton asChild isActive={pathname === item.href}>
                                        <Link href={item.href}>{item.label}</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarMenuItem>
             <SidebarMenuItem>
                 <Collapsible>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                            className="justify-between"
                            variant="outline"
                        >
                            <div className="flex items-center gap-2">
                                <KeyRound />
                                <span>Licencia</span>
                            </div>
                            <ChevronDown className="size-4 shrink-0 transition-transform ease-in-out group-data-[state=open]:rotate-180" />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            {licenseMenuItems.map((item) => (
                                <SidebarMenuSubItem key={item.href}>
                                    <SidebarMenuSubButton asChild isActive={pathname === item.href}>
                                        <Link href={item.href}>{item.label}</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <div className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-sidebar-accent">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src="https://placehold.co/100x100.png" alt="@user" />
                      <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                     <div className="group-data-[collapsible=icon]:hidden flex flex-col">
                        <span className="text-sm font-semibold text-sidebar-foreground">Admin de la Granja</span>
                        <span className="text-xs text-sidebar-foreground/90">{auth.currentUser?.email || 'admin@smartpig.com'}</span>
                    </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Admin de la Granja</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {auth.currentUser?.email || 'admin@smartpig.com'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile"><User className="mr-2 h-4 w-4" />Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings"><Settings className="mr-2 h-4 w-4" />Configuración</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/50 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
            </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
