'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getReferrals, updateReferralStatus } from '@/app/admin/actions';
import { type Auth } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RotateCcw, Phone, Calendar, ArrowRight, Search, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Haptics } from '@/lib/utils/haptics';

interface Referral {
  id: string;
  tuNumero: string;
  suNumero: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ReferralsAdminViewProps {
  auth: Auth;
}

export function ReferralsAdminView({ auth }: ReferralsAdminViewProps) {
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchReferralsList = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const idToken = (await auth?.currentUser?.getIdToken(true)) || '';
        if (!idToken) return;

        const res = await getReferrals(idToken);
        if (res.success && res.data) {
          setReferrals(res.data);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error al cargar referidos',
            description: res.error || 'Ocurrió un error inesperado.',
          });
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error de red',
          description: 'No se pudo conectar con el servidor.',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [auth, toast]
  );

  useEffect(() => {
    if (auth?.currentUser) {
      fetchReferralsList();
    }
  }, [auth, fetchReferralsList]);

  const handleStatusChange = async (referralId: string, newStatus: string) => {
    Haptics.tap();
    setIsUpdating(referralId);
    try {
      const idToken = (await auth?.currentUser?.getIdToken(true)) || '';
      if (!idToken) return;

      const res = await updateReferralStatus(idToken, referralId, newStatus);
      if (res.success) {
        toast({
          title: 'Estado actualizado',
          description: `El referido ha sido marcado como "${newStatus}".`,
        });
        // Actualizar localmente para evitar lecturas de red innecesarias
        setReferrals((prev) =>
          prev.map((ref) => (ref.id === referralId ? { ...ref, status: newStatus } : ref))
        );
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al actualizar',
          description: res.error || 'Ocurrió un error al actualizar.',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al enviar la solicitud.',
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'contactado':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'ganado':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'perdido':
        return 'text-muted-foreground bg-muted/40 border-muted/50';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const filteredReferrals = referrals.filter((ref) => {
    const matchesStatus = filterStatus === 'todos' || ref.status === filterStatus;
    const matchesSearch =
      ref.tuNumero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.suNumero.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const formatDisplayPhone = (phone: string) => {
    if (!phone) return 'N/A';
    if (phone.length === 10) {
      return `(${phone.substring(0, 3)}) ${phone.substring(3, 6)}-${phone.substring(6)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-6">
      {/* Cabecera y controles rápidos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Listado de Referidos VIP</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consulta y gestiona las recomendaciones enviadas por los usuarios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              Haptics.tap();
              fetchReferralsList();
            }}
            disabled={isLoading}
            variant="outline"
            className="rounded-xl h-10 gap-2 border-border/70"
          >
            <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Métricas Financieras / Conversiones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">
            Total Referidos
          </h3>
          <p className="text-2xl font-black text-foreground">{referrals.length}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs text-emerald-600 dark:text-emerald-500 uppercase tracking-widest font-bold mb-1">
            Conversiones (Ganados)
          </h3>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {referrals.filter((r) => r.status === 'ganado').length}
          </p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs text-blue-600 dark:text-blue-500 uppercase tracking-widest font-bold mb-1">
            Comisiones Generadas
          </h3>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-400">
            $
            {(referrals.filter((r) => r.status === 'ganado').length * 50000).toLocaleString(
              'es-CO'
            )}
          </p>
          <p className="text-[10px] text-blue-600/70 mt-1 font-semibold">
            Calculado a $50.000 x conversión
          </p>
        </div>
      </div>

      {/* Bloque Informativo para Operadores */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-2">
        <h3 className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-2">
          <Gift size={16} /> ¿Qué es el Programa VIP y cómo gestionarlo?
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Este sistema recibe recomendaciones de clientes (Referidor) hacia conocidos con multas
          (Referido). El objetivo es contactar al referido indicando que viene de parte del cliente.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[11px]">
          <div className="bg-background/50 rounded-lg p-2 border border-border/50">
            <span className="font-bold text-amber-500 block mb-1">1. PENDIENTE</span>
            Recién ingresado. Debes contactarlo por WhatsApp.
          </div>
          <div className="bg-background/50 rounded-lg p-2 border border-border/50">
            <span className="font-bold text-blue-500 block mb-1">2. CONTACTADO</span>
            Ya se le envió el mensaje inicial y estamos esperando respuesta.
          </div>
          <div className="bg-background/50 rounded-lg p-2 border border-border/50">
            <span className="font-bold text-emerald-500 block mb-1">3. GANADO</span>
            El referido contrató a Desmulta. ¡El referidor gana su bono/descuento!
          </div>
          <div className="bg-background/50 rounded-lg p-2 border border-border/50">
            <span className="font-bold text-muted-foreground block mb-1">4. PERDIDO</span>
            No le interesó o los datos eran incorrectos.
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="grid md:grid-cols-3 gap-4 bg-muted/20 border border-border/50 rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por teléfono..."
            className="pl-10 h-10 rounded-xl border-border/60 bg-background/50 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Estado:
          </span>
          <select
            value={filterStatus}
            onChange={(e) => {
              Haptics.tap();
              setFilterStatus(e.target.value);
            }}
            className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background/50 text-sm focus:outline-none focus:border-primary"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="contactado">Contactados</option>
            <option value="ganado">Ganados (Exitosos)</option>
            <option value="perdido">Perdidos</option>
          </select>
        </div>

        <div className="flex items-center justify-end">
          <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            {filteredReferrals.length} registro{filteredReferrals.length !== 1 ? 's' : ''}{' '}
            encontrado{filteredReferrals.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Tabla Premium Glassmorphism */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center border border-border/40 rounded-2xl bg-card/20 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-xs text-muted-foreground">Obteniendo registros de referidos...</p>
        </div>
      ) : filteredReferrals.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border border-border/40 border-dashed rounded-2xl bg-card/10 text-center p-8">
          <Gift className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">Sin registros</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            No se encontraron referidos que coincidan con la búsqueda o el filtro aplicado.
          </p>
        </div>
      ) : (
        <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/30 backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-4">Usuario Referidor</th>
                  <th className="px-6 py-4"></th>
                  <th className="px-6 py-4">Amigo Referido</th>
                  <th className="px-6 py-4">Fecha de Registro</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm text-foreground/90">
                {filteredReferrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          R
                        </div>
                        <div>
                          <span className="font-semibold">{formatDisplayPhone(ref.tuNumero)}</span>
                          <span className="block text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                            Socio VIP
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground/30">
                      <ArrowRight size={14} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/${ref.suNumero}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                          title="Contactar por WhatsApp"
                        >
                          <Phone size={14} className="fill-emerald-500/10" />
                        </a>
                        <div>
                          <a
                            href={`https://wa.me/${ref.suNumero}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold hover:text-emerald-500 transition-colors"
                          >
                            {formatDisplayPhone(ref.suNumero)}
                          </a>
                          <span className="block text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                            Prospecto
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                        <Calendar size={12} />
                        {ref.createdAt
                          ? new Date(ref.createdAt).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(ref.status)}`}
                      >
                        {isUpdating === ref.id ? (
                          <Loader2 size={10} className="animate-spin mr-1.5" />
                        ) : null}
                        {ref.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <select
                        disabled={isUpdating === ref.id}
                        value={ref.status}
                        onChange={(e) => handleStatusChange(ref.id, e.target.value)}
                        className="h-8 px-2 rounded-lg border border-border/70 bg-background text-xs font-bold focus:outline-none focus:border-primary active:scale-[0.98] transition-all"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="contactado">Contactado</option>
                        <option value="ganado">Ganado</option>
                        <option value="perdido">Perdido</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
