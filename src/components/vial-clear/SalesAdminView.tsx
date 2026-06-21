'use client';
import React, { useState, useEffect } from 'react';
import { useFirestore, useAuth } from '@/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import {
  CreditCard,
  Search,
  FileDown,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Purchase {
  id: string; // Document ID (wompi reference)
  amount?: number;
  correo?: string;
  celular?: string;
  status: string;
  createdAt?: unknown;
  paidAt?: unknown;
  wompiTransactionId?: string;
  caseData?: {
    infractorName?: string;
    infractorId?: string;
    licensePlate?: string;
  };
}

export function SalesAdminView() {
  const firestore = useFirestore();
  const auth = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!firestore || !auth?.currentUser) return;

    // TODO: En producción, usar paginación. Por ahora traemos las últimas 100 ventas.
    const q = query(collection(firestore, 'purchases'), orderBy('createdAt', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Purchase[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Purchase);
        });
        setPurchases(data);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching purchases:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, auth?.currentUser]);

  const filteredPurchases = purchases.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.id.toLowerCase().includes(term) ||
      p.correo?.toLowerCase().includes(term) ||
      p.caseData?.infractorName?.toLowerCase().includes(term) ||
      p.caseData?.infractorId?.includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 size={12} /> Pagado
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock size={12} /> Pendiente
          </span>
        );
      case 'DECLINED':
      case 'ERROR':
      case 'VOIDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
            <XCircle size={12} /> Rechazado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
            <AlertCircle size={12} /> {status}
          </span>
        );
    }
  };

  const formatMoney = (amount: number | undefined) => {
    if (!amount) return '$0';
    // Wompi manda centavos, así que dividimos por 100
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  const formatDate = (timestamp: unknown) => {
    if (!timestamp?.toDate) return 'Fecha desconocida';
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp.toDate());
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Cargando transacciones...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <CreditCard className="text-yellow-400" size={20} /> Historial de Pagos
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitorea los pagos de documentos generados.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input
            placeholder="Buscar por cédula, email o ref..."
            className="pl-9 bg-background/50 border-border/50 focus-visible:ring-yellow-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
              <tr>
                <th className="px-6 py-4 font-medium">Cliente / Infractor</th>
                <th className="px-6 py-4 font-medium">Referencia</th>
                <th className="px-6 py-4 font-medium">Monto</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium">Fecha</th>
                <th className="px-6 py-4 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No hay transacciones que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">
                        {purchase.caseData?.infractorName || 'Sin Nombre'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        CC: {purchase.caseData?.infractorId || 'N/A'} • {purchase.correo}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-muted/50 px-2 py-1 rounded text-muted-foreground">
                        {purchase.id.split('-').slice(0, 2).join('-')}...
                      </code>
                    </td>
                    <td className="px-6 py-4 font-medium">{formatMoney(purchase.amount)}</td>
                    <td className="px-6 py-4">{getStatusBadge(purchase.status)}</td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {formatDate(purchase.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {purchase.status === 'APPROVED' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          onClick={() => {
                            window.open(`/documentos/confirmacion?ref=${purchase.id}`, '_blank');
                          }}
                        >
                          <FileDown size={14} /> PDF
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic">No disp.</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
