'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getConsultations, convertToCase } from '@/app/admin/actions';
import { Consultation } from '@/lib/definitions';
import {
  User,
  CreditCard,
  Phone,
  Calendar,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Loader2,
  Gavel,
  Eye,
  EyeOff,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export function ConsultationsList() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastDocId, setLastDocId] = useState<string | null | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());

  // Case Conversion State
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchConsultations = useCallback(async (cursor?: string | null) => {
    const isReset = cursor === undefined;
    if (isReset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const result = await getConsultations(20, cursor);

    if (result.success && result.data) {
      if (isReset) {
        setConsultations(result.data as Consultation[]);
      } else {
        setConsultations((prev) => [...prev, ...(result.data as Consultation[])]);
      }
      setLastDocId(result.lastDocId);
      setHasMore(!!result.hasMore);
      setError(null);
    } else {
      setError(result.error || 'Error desconocido al cargar consultas');
    }

    setLoading(false);
    setLoadingMore(false);
  }, []);

  const handleConvertToCase = async (lead: Consultation) => {
    if (!confirm(`¿Estás seguro de convertir a ${lead.nombre} en un caso legal activo?`)) return;

    try {
      setConvertingId(lead.id);
      const result = await convertToCase(lead);
      if (result.success) {
        alert('¡Caso creado exitosamente!');
        fetchConsultations(); // Recargar desde el principio para ver el cambio de estado
      } else {
        setError(result.error || 'Error al crear el caso');
      }
    } catch {
      setError('Error inesperado al convertir el caso');
    } finally {
      setConvertingId(null);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (loading || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchConsultations(lastDocId);
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById('infinite-scroll-sentinel');
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loading, hasMore, loadingMore, lastDocId, fetchConsultations]);

  const filteredConsultations = consultations.filter(
    (c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cedula.includes(searchTerm) ||
      c.contacto.includes(searchTerm)
  );

  const togglePhoneReveal = (id: string) => {
    setRevealedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatMaskedPhone = (phone: string, isRevealed: boolean) => {
    if (isRevealed) return phone;
    const clean = phone.replace(/\s+/g, '');
    if (clean.length < 6) return '*** ***';
    return `${clean.slice(0, 3)} *** ${clean.slice(-4)}`;
  };

  const getEstimatedSavings = (type?: string) => {
    if (!type) return null;
    if (type.includes('Foto-Multa')) return 650000;
    if (type.includes('Físico')) return 325000;
    if (type.includes('Ambas')) return 975000;
    return 200000;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20">
            Pendiente
          </Badge>
        );
      case 'contactado':
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">
            Contactado
          </Badge>
        );
      case 'en_proceso':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
            En Proceso
          </Badge>
        );
      case 'terminado':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20">
            Terminado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading && consultations.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 bg-secondary/20 animate-pulse rounded-3xl border border-white/5"
          />
        ))}
      </div>
    );
  }

  if (error && consultations.length === 0) {
    return (
      <Card className="bg-red-500/5 border-red-500/20 rounded-[2.5rem]">
        <CardContent className="pt-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-red-400 font-medium">{error}</p>
          <Button
            variant="outline"
            onClick={() => fetchConsultations()}
            className="rounded-2xl border-red-500/20 text-red-400 hover:bg-red-500/10"
          >
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 p-6 rounded-[2.5rem] border border-white/10 backdrop-blur-xl">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, cédula o teléfono..."
            className="pl-12 h-14 bg-black/20 border-white/10 rounded-2xl focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          onClick={() => fetchConsultations()}
          className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-bold flex gap-2 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="max-h-[800px] overflow-y-auto custom-scrollbar p-6 space-y-4">
          {filteredConsultations.length === 0 && !loading ? (
            <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
              <Clock className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">
                No se encontraron consultas registradas.
              </p>
            </div>
          ) : (
            <>
              {filteredConsultations.map((consultation) => (
                <Card
                  key={consultation.id}
                  className="group overflow-hidden bg-white/5 border-white/10 rounded-[2.5rem] transition-all hover:border-primary/30 hover:bg-white/[0.07] backdrop-blur-md virtual-item"
                >
                  <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <User className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-foreground">
                              {consultation.nombre}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {getStatusBadge(consultation.status)}
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(consultation.createdAt).toLocaleDateString('es-CO', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/5">
                            <CreditCard className="w-5 h-5 text-primary/60" />
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest">
                                Cédula
                              </p>
                              <p className="font-mono text-foreground">{consultation.cedula}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/5">
                            <Phone className="w-5 h-5 text-primary/60" />
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest flex items-center justify-between">
                                Contacto
                                <button
                                  onClick={() => togglePhoneReveal(consultation.id)}
                                  className="p-1 hover:bg-white/10 rounded transition-colors text-primary"
                                >
                                  {revealedPhones.has(consultation.id) ? (
                                    <EyeOff size={10} />
                                  ) : (
                                    <Eye size={10} />
                                  )}
                                </button>
                              </p>
                              <p className="text-foreground">
                                {formatMaskedPhone(
                                  consultation.contacto,
                                  revealedPhones.has(consultation.id)
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Campos de Pre-Viabilidad */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                            <p className="text-[8px] uppercase font-black text-primary/60 tracking-widest mb-1">
                              Antigüedad
                            </p>
                            <p className="text-xs font-bold text-foreground line-clamp-1">
                              {consultation.antiguedad || 'N/A'}
                            </p>
                          </div>
                          <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                            <p className="text-[8px] uppercase font-black text-primary/60 tracking-widest mb-1">
                              Captura
                            </p>
                            <p className="text-xs font-bold text-foreground line-clamp-1">
                              {consultation.tipoInfraccion || 'N/A'}
                            </p>
                          </div>
                          <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                            <p className="text-[8px] uppercase font-black text-primary/60 tracking-widest mb-1">
                              Coactivo/Embargo
                            </p>
                            <p className="text-xs font-bold text-foreground line-clamp-1">
                              {consultation.estadoCoactivo || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* Badge de Ahorro Estimado */}
                        {getEstimatedSavings(consultation.tipoInfraccion) && (
                          <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-2xl w-fit">
                            <DollarSign className="w-3 h-3 text-green-500" />
                            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">
                              Ahorro Estimado: $
                              {getEstimatedSavings(consultation.tipoInfraccion)?.toLocaleString(
                                'es-CO'
                              )}{' '}
                              COP
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 justify-center lg:min-w-[200px]">
                        <Button
                          asChild
                          className="w-full h-12 rounded-xl bg-green-500 text-white hover:bg-green-600 font-bold gap-2"
                        >
                          <a
                            href={`https://wa.me/57${consultation.contacto.replace(/\s+/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Phone className="w-4 h-4" />
                            WhatsApp
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleConvertToCase(consultation)}
                          disabled={
                            convertingId === consultation.id || consultation.status === 'en_proceso'
                          }
                          className="w-full h-12 rounded-xl border-white/10 hover:bg-white/5 font-bold gap-2 text-blue-400 border-blue-400/20"
                        >
                          {convertingId === consultation.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Gavel className="w-4 h-4" />
                              <span>Convertir en Caso</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Sentinel for Infinite Scroll */}
              {hasMore && (
                <div
                  id="infinite-scroll-sentinel"
                  className="h-10 flex items-center justify-center"
                >
                  {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
