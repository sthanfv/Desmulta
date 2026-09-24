'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Carcasa de app nativa para teléfono (< 768 px). En escritorio no se renderiza nada visible.
//
// - Barra superior compacta en Inicio (las páginas internas conservan su barra con "atrás").
// - Barra de pestañas: Inicio · Mi caso · Consultar · Asistente · Más.
// - Paneles que suben desde abajo (vaul) para Consultar y Más.
// El marcador [data-app-shell] activa en globals.css el espacio para las barras y oculta la
// cabecera de escritorio solo en las rutas donde la carcasa está presente.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  ArrowLeft,
  BookOpen,
  Calculator,
  Camera,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  Home,
  Menu,
  MessageCircle,
  Moon,
  Plus,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { buildWhatsAppUrl } from '@/lib/chat/whatsapp';
import {
  activeTabFor,
  haptic,
  isAppShellRoute,
  openAssistant,
  openConsultation,
  titleFor,
  type ConsultationMode,
} from './app-shell';

export function MobileAppShell() {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [sheet, setSheet] = useState<'consultar' | 'mas' | null>(null);

  // Transición de pantalla al cambiar de ruta: solo opacidad (un transform sobre #main-content
  // rompería los elementos position:fixed de su interior mientras dura la animación)
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (
      !main ||
      !window.matchMedia?.('(max-width: 767px)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    main.classList.remove('app-screen-enter');
    void main.offsetWidth; // reinicia la animación si se navega rápido
    main.classList.add('app-screen-enter');
    const done = () => main.classList.remove('app-screen-enter');
    main.addEventListener('animationend', done, { once: true });
    return () => main.removeEventListener('animationend', done);
  }, [pathname]);

  if (!isAppShellRoute(pathname)) return null;

  const active = activeTabFor(pathname);
  const navigate = (href: string) => router.push(href);

  const chooseConsultation = (mode: ConsultationMode) => {
    haptic();
    setSheet(null);
    openConsultation(mode, pathname, navigate);
  };

  return (
    <div data-app-shell className="md:hidden">
      {pathname === '/' ? (
        <MobileTopBar />
      ) : (
        <InnerTopBar
          title={titleFor(pathname)}
          onBack={() => {
            haptic();
            if (window.history.length > 1) router.back();
            else router.push('/');
          }}
        />
      )}

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-[45] border-t border-border/60 bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)]"
      >
        <ul className="grid grid-cols-5 h-16 items-end">
          <TabLink
            href="/"
            label="Inicio"
            icon={Home}
            active={active === 'inicio'}
            onSameRoute={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            pathname={pathname}
          />
          <TabLink
            href="/estado"
            label="Mi caso"
            icon={ClipboardList}
            active={active === 'mi-caso'}
            pathname={pathname}
          />
          <li className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                haptic();
                setSheet('consultar');
              }}
              aria-label="Consultar mi caso"
              className="-mt-6 mb-1 flex flex-col items-center gap-1 select-none"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-90">
                <Plus className="h-7 w-7" strokeWidth={2.75} />
              </span>
              <span className="text-[10px] font-bold text-foreground">Consultar</span>
            </button>
          </li>
          <TabButton
            label="Asistente"
            icon={MessageCircle}
            onClick={() => openAssistant(pathname, navigate)}
          />
          <TabButton label="Más" icon={Menu} onClick={() => setSheet('mas')} />
        </ul>
      </nav>

      <Drawer open={sheet === 'consultar'} onOpenChange={(open) => !open && setSheet(null)}>
        <DrawerContent className="pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          <DrawerHeader className="text-left">
            <DrawerTitle>¿Cómo quieres consultar?</DrawerTitle>
            <DrawerDescription>El estudio de tu caso es gratis.</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-3 px-4">
            <OptionCard
              icon={FileText}
              title="Formulario completo"
              description="Cuéntanos tu caso y un especialista revisa si se puede tumbar."
              onClick={() => chooseConsultation('full')}
            />
            <OptionCard
              icon={Camera}
              title="Foto del comparendo + teléfono"
              description="Sube la foto o la captura del SIMIT y te contactamos."
              onClick={() => chooseConsultation('simit')}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={sheet === 'mas'} onOpenChange={(open) => !open && setSheet(null)}>
        <DrawerContent className="max-h-[85dvh] pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Más opciones</DrawerTitle>
            <DrawerDescription className="sr-only">
              Herramientas y enlaces de Desmulta
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4">
            <MoreMenu onNavigate={() => setSheet(null)} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/** Barra de páginas internas: flecha atrás + título, como las pantallas de una app. */
function InnerTopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header
      data-app-topbar="inner"
      className="fixed inset-x-0 top-0 z-[45] border-b border-border/50 bg-background/90 backdrop-blur-xl pt-[env(safe-area-inset-top)]"
    >
      <div className="flex h-14 items-center gap-1 px-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-transform active:scale-90 active:bg-muted"
        >
          <ArrowLeft className="h-[22px] w-[22px]" />
        </button>
        <p className="truncate text-[17px] font-bold text-foreground">{title}</p>
      </div>
    </header>
  );
}

function MobileTopBar() {
  // Igual que la cabecera de escritorio: al bajar, la marca se recoge y queda solo el escudo
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-[45] border-b border-border/50 bg-background/90 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center px-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/20">
          <ShieldCheck className="h-[18px] w-[18px] text-primary-foreground" />
        </span>
        <div
          data-collapsed={collapsed || undefined}
          className={cn(
            'overflow-hidden whitespace-nowrap leading-none transition-all duration-500',
            collapsed ? 'ml-0 max-w-0 opacity-0' : 'ml-2.5 max-w-[240px] opacity-100'
          )}
        >
          <p className="text-base font-black tracking-tight text-foreground">
            DES<span className="text-primary italic">MULTA</span>
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
            Especialistas en multas de tránsito
          </p>
        </div>
      </div>
    </header>
  );
}

type IconType = typeof Home;

function TabLink({
  href,
  label,
  icon: Icon,
  active,
  pathname,
  onSameRoute,
}: {
  href: string;
  label: string;
  icon: IconType;
  active: boolean;
  pathname: string;
  onSameRoute?: () => void;
}) {
  return (
    <li className="flex justify-center">
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        onClick={(e) => {
          haptic();
          if (pathname === href && onSameRoute) {
            e.preventDefault();
            onSameRoute();
          }
        }}
        className="flex h-16 w-full flex-col items-center justify-center gap-1 select-none transition-transform active:scale-90"
      >
        <TabIcon icon={Icon} active={active} />
        <span
          className={cn(
            'text-[10px] font-semibold',
            active ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {label}
        </span>
      </Link>
    </li>
  );
}

function TabButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: IconType;
  onClick: () => void;
}) {
  return (
    <li className="flex justify-center">
      <button
        type="button"
        onClick={() => {
          haptic();
          onClick();
        }}
        className="flex h-16 w-full flex-col items-center justify-center gap-1 select-none transition-transform active:scale-90"
      >
        <TabIcon icon={Icon} active={false} />
        <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
      </button>
    </li>
  );
}

function TabIcon({ icon: Icon, active }: { icon: IconType; active: boolean }) {
  return (
    <span
      className={cn(
        'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
      )}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.5 : 2} />
    </span>
  );
}

function OptionCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: IconType;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-2xl border border-border bg-muted/40 p-4 text-left transition-transform active:scale-[0.98]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <span className="flex-1">
        <span className="block text-[15px] font-bold text-foreground">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );
}

const MORE_LINKS: Array<{ href: string; label: string; icon: IconType }> = [
  { href: '/calculadora', label: 'Calculadora de prescripción', icon: Calculator },
  { href: '/plantillas', label: 'Plantillas legales', icon: FileText },
  { href: '/blog', label: 'Guía legal', icon: BookOpen },
  { href: '/faq', label: 'Preguntas frecuentes', icon: HelpCircle },
  { href: '/servicios', label: 'Servicios', icon: Sparkles },
  // Referidos NO va aquí: el programa es solo para clientes y se entra desde /seguir/[id]
];

function MoreMenu({ onNavigate }: { onNavigate: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="space-y-4 pb-2">
      <ul className="overflow-hidden rounded-2xl border border-border bg-muted/30">
        {MORE_LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href} className="border-b border-border/60 last:border-b-0">
            <Link
              href={href}
              onClick={() => {
                haptic();
                onNavigate();
              }}
              className="flex items-center gap-3 px-4 py-3.5 active:bg-muted"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="flex-1 text-[15px] font-medium text-foreground">{label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      <ul className="overflow-hidden rounded-2xl border border-border bg-muted/30">
        <li className="border-b border-border/60">
          <a
            href={buildWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => haptic()}
            className="flex items-center gap-3 px-4 py-3.5 active:bg-muted"
          >
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
            <span className="flex-1 text-[15px] font-medium text-foreground">
              Hablar por WhatsApp
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </a>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              haptic();
              setTheme(isDark ? 'light' : 'dark');
            }}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-primary" />
            ) : (
              <Moon className="h-5 w-5 text-primary" />
            )}
            <span className="flex-1 text-[15px] font-medium text-foreground">
              {isDark ? 'Modo claro' : 'Modo oscuro'}
            </span>
          </button>
        </li>
      </ul>

      <p className="flex justify-center gap-4 pt-1 text-xs text-muted-foreground">
        <Link href="/privacidad" onClick={onNavigate}>
          Privacidad
        </Link>
        <Link href="/terminos" onClick={onNavigate}>
          Términos
        </Link>
      </p>
    </div>
  );
}
