'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getCases } from '@/app/admin/actions';
import { Case } from '@/lib/definitions';
import {
  FileText,
  Clock,
  Search,
  RefreshCw,
  MoreHorizontal,
  ChevronRight,
  Gavel,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export function CasesList() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastDocId, setLastDocId] = useState<string | null | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);

  const fetchCases = useCallback(
    async (reset: boolean = false) => {
      if (reset) {
        setLoading(true);
        setLastDocId(undefined);
      } else {
        setLoadingMore(true);
      }

      const result = await getCases(20, reset ? undefined : lastDocId);
      if (result.success && result.data) {
        if (reset) {
          setCases(result.data as Case[]);
        } else {
          setCases((prev) => [...prev, ...(result.data as Case[])]);
        }
        setLastDocId(result.lastDocId);
        setHasMore(!!result.hasMore);
        setError(null);
      } else {
        setError(result.error || 'Error al cargar casos');
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [lastDocId]
  );

  useEffect(() => {
    fetchCases(true);
  }, [fetchCases]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (loading || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchCases();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById('cases-scroll-sentinel');
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loading, hasMore, loadingMore, lastDocId, fetchCases]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'apertura':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'documentacion':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'tramite':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'resolucion':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'finalizado':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'archivo':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const filteredCases = cases.filter(
    (c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cedula.includes(searchTerm) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && cases.length === 0) {
    return (
      <div className="space-y-4 pt-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-white/5 rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, cédula o ID de caso..."
            className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => fetchCases(true)}
          className="h-14 px-8 rounded-2xl border-white/10 hover:bg-white/5 font-bold gap-2"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar Casos
        </Button>
      </div>

      {error && cases.length === 0 && (
        <div className="text-center p-6 bg-destructive/5 rounded-xl border border-destructive/20">
          <p className="text-destructive font-bold">{error}</p>
          <Button onClick={() => fetchCases(true)} variant="link" className="text-foreground">
            Reintentar
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        {filteredCases.length === 0 && !loading ? (
          <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
            <Gavel className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              No hay casos activos que coincidan con la búsqueda.
            </p>
          </div>
        ) : (
          <>
            {filteredCases.map((c) => (
              <Card
                key={c.id}
                className="group overflow-hidden bg-white/5 border-white/10 rounded-[2.5rem] transition-all hover:border-primary/30 hover:bg-white/[0.07] backdrop-blur-md virtual-item"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-foreground">{c.nombre}</h3>
                          <Badge
                            variant="outline"
                            className={`uppercase text-[10px] font-black ${getStatusColor(c.status)}`}
                          >
                            {c.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono text-[12px] opacity-70">
                            {c.id}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Actualizado recientemente
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <Button
                        variant="outline"
                        className="flex-1 md:flex-none h-12 rounded-xl border-white/10 hover:bg-white/5 font-bold gap-2"
                      >
                        <ChevronRight className="w-4 h-4" />
                        Gestionar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl h-12 w-12 hover:bg-white/10"
                      >
                        <MoreHorizontal size={20} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Sentinel for Infinite Scroll */}
            {hasMore && (
              <div id="cases-scroll-sentinel" className="h-10 flex items-center justify-center">
                {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
