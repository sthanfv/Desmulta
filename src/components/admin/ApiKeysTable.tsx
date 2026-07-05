'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Copy, CheckCircle2, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ApiKeyResponse {
  keyId: string;
  nombre: string;
  email: string;
  plan: 'starter' | 'growth' | 'enterprise';
  activa: boolean;
  creadaEn: string;
  expiresAt: string | null;
  usoTotal: number;
  usoMesActual: number;
  mesActual: string;
  ultimoUso?: string | null;
  quotaDelPlan: { requestsPerMonth: number; requestsPerMinute: number; label: string };
}

const formSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido').max(100),
  email: z.string().email('Email inválido'),
  plan: z.enum(['starter', 'growth', 'enterprise']),
  notaAdmin: z.string().max(500).optional(),
});

export function ApiKeysTable() {
  const [keys, setKeys] = useState<ApiKeyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: '',
      email: '',
      plan: 'starter',
      notaAdmin: '',
    },
  });

  const fetchKeys = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/api-keys');
      const data = await res.json();
      if (data.success) {
        setKeys(data.keys);
      } else {
        toast({ title: 'Error', description: data.error?.message, variant: 'destructive' });
      }
    } catch (_error) {
      toast({
        title: 'Error de red',
        description: 'No se pudo cargar la lista.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.success) {
        setNewKey(data.apiKey);
        toast({ title: 'API Key generada' });
        fetchKeys();
        form.reset();
      } else {
        toast({ title: 'Error', description: data.error?.message, variant: 'destructive' });
      }
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al crear la llave.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (
      !confirm('¿Seguro que deseas revocar esta API Key? Esta acción es inmediata e irreversible.')
    )
      return;
    setIsRevoking(keyId);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'API Key Revocada' });
        fetchKeys();
      } else {
        toast({ title: 'Error', description: data.error?.message, variant: 'destructive' });
      }
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'No se pudo revocar la llave.',
        variant: 'destructive',
      });
    } finally {
      setIsRevoking(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">API Keys Generadas</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} /> Nueva API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear API Key B2B</DialogTitle>
              <DialogDescription>
                Genera una nueva credencial para clientes comerciales. La clave solo se mostrará una
                vez.
              </DialogDescription>
            </DialogHeader>

            {newKey ? (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-500 font-medium">
                    <CheckCircle2 size={16} /> Key Creada Exitosamente
                  </div>
                  <p className="text-sm text-emerald-600/80">
                    Copia esta clave ahora. Por seguridad, no volverá a mostrarse.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <code
                      className="flex-1 min-w-0 block p-2 bg-background rounded border text-[11px] sm:text-xs font-mono truncate"
                      title={newKey}
                    >
                      {newKey}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(newKey);
                        toast({ title: 'Copiado al portapapeles' });
                      }}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    setNewKey(null);
                    setIsModalOpen(false);
                  }}
                >
                  Cerrar
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empresa o Cliente</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. Seguros Bolivar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Técnico</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="dev@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="plan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan de Suscripción</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un plan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="starter">Starter (500 peticiones/mes)</SelectItem>
                            <SelectItem value="growth">Growth (5.000 peticiones/mes)</SelectItem>
                            <SelectItem value="enterprise">
                              Enterprise (50.000 peticiones/mes)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Generar Key
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estado</TableHead>
              <TableHead>Cliente / Email</TableHead>
              <TableHead>Key ID</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Uso (Mes)</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay API Keys generadas.
                </TableCell>
              </TableRow>
            ) : (
              keys.map((k) => (
                <TableRow key={k.keyId} className={!k.activa ? 'opacity-50 grayscale' : ''}>
                  <TableCell>
                    {k.activa ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-xs font-medium">
                        <CheckCircle2 size={12} /> Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-destructive/10 text-destructive text-xs font-medium">
                        <Ban size={12} /> Revocada
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{k.nombre}</div>
                    <div className="text-xs text-muted-foreground">{k.email}</div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {k.keyId.substring(0, 16)}...
                    </code>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Creada: {format(new Date(k.creadaEn), 'd MMM yyyy', { locale: es })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize font-medium text-sm">{k.plan}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium text-sm">{k.usoMesActual}</div>
                    <div className="text-[10px] text-muted-foreground">
                      / {k.quotaDelPlan.requestsPerMonth}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(k.keyId)}
                      disabled={!k.activa || isRevoking === k.keyId}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                    >
                      {isRevoking === k.keyId ? (
                        <Loader2 size={14} className="animate-spin mr-1" />
                      ) : (
                        <Ban size={14} className="mr-1" />
                      )}
                      Revocar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
