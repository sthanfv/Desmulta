'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export function CasesList() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCases = async () => {
    setLoading(true);
    const result = await getCases();
    if (result.success && result.data) {
      setCases(result.data as Case[]);
      setError(null);
    } else {
      setError(result.error || 'Error al cargar casos');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCases();
  }, []);

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

  if (loading) {
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
          onClick={fetchCases}
          className="h-14 px-8 rounded-2xl border-white/10 hover:bg-white/5 font-bold gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Actualizar Casos
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredCases.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
            <Gavel className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              No hay casos activos que coincidan con la búsqueda.
            </p>
          </div>
        ) : (
          filteredCases.map((c) => (
            <Card
              key={c.id}
              className="group overflow-hidden bg-white/5 border-white/10 rounded-[2.5rem] transition-all hover:border-primary/30 hover:bg-white/[0.07] backdrop-blur-md"
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
                          Activo hace 2 días
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
          ))
        )}
      </div>
    </div>
  );
}
