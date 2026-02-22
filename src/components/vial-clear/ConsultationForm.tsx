'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Search,
  MessageCircle,
} from 'lucide-react';
import { getAuth } from 'firebase/auth';

import { ConsultationSchema } from '@/lib/definitions';

import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';

type ConsultationFormData = Zod.infer<typeof ConsultationSchema>;

interface ConsultationFormProps {
  onSuccess: () => void;
}

export function ConsultationForm({ onSuccess }: ConsultationFormProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [showCedula, setShowCedula] = useState(false);
  const { toast } = useToast();

  const form = useForm<ConsultationFormData>({
    resolver: zodResolver(ConsultationSchema),
    defaultValues: {
      cedula: '',
      nombre: '',
      contacto: '',
      aceptoTerminos: false,
      website: '', // Honeypot field
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit: SubmitHandler<ConsultationFormData> = async (data) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('No se pudo identificar la sesión de usuario (UID faltante).');
      }

      const payload = {
        ...data,
        authorUid: currentUser.uid,
      };

      const response = await fetch('/api/create-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          `El servidor devolvió una respuesta inesperada. Status: ${response.status}. Respuesta: ${responseText.slice(0, 200)}...`
        );
      }

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Ocurrió un error en el servidor.');
      }

      toast({
        title: '¡Gracias!',
        description:
          'Hemos recibido su solicitud. Uno de nuestros expertos le contactará pronto por WhatsApp.',
      });
      setIsSuccess(true);
      setTimeout(onSuccess, 3000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Por favor, intente de nuevo más tarde.';
      console.warn('Alerta al enviar la consulta:', e);
      toast({
        variant: 'destructive',
        title: 'No se pudo enviar la solicitud',
        description: message,
      });
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[400px] animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-6 shadow-Inner">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h3 className="text-2xl font-black mb-3 text-foreground tracking-tight">
          Solicitud Enviada
        </h3>
        <p className="text-muted-foreground text-lg max-w-sm leading-relaxed">
          Nuestros expertos jurídicos están revisando tu historial. Te contactaremos pronto.
        </p>
        <Button
          onClick={onSuccess}
          variant="outline"
          className="mt-8 rounded-2xl px-10 border-border hover:bg-muted font-bold active:scale-95 transition-all"
        >
          Entendido
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem className="hidden">
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="off" tabIndex={-1} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-6">
          <FormField
            control={form.control}
            name="cedula"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-black text-foreground/70 uppercase tracking-widest pl-1">
                  Cédula del Propietario
                </FormLabel>
                <div className="relative group">
                  <FormControl>
                    <Input
                      type={showCedula ? 'text' : 'password'}
                      placeholder="Identificación sin puntos ni comas"
                      {...field}
                      className="w-full bg-background border-border/50 rounded-2xl pl-12 pr-12 h-16 text-lg font-medium focus:ring-primary/20 focus:border-primary transition-all shadow-Inner"
                    />
                  </FormControl>
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                    size={20}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCedula(!showCedula)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={showCedula ? 'Ocultar cédula' : 'Mostrar cédula'}
                  >
                    {showCedula ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <FormMessage className="pl-1" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-black text-foreground/70 uppercase tracking-widest pl-1">
                  Nombre Completo
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Como aparece en el documento"
                    {...field}
                    className="w-full bg-background border-border/50 rounded-2xl px-6 h-16 text-lg font-medium focus:ring-primary/20 focus:border-primary transition-all shadow-Inner"
                  />
                </FormControl>
                <FormMessage className="pl-1" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contacto"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-black text-foreground/70 uppercase tracking-widest pl-1">
                  WhatsApp de Contacto
                </FormLabel>
                <div className="relative group">
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="Ej: 300 123 4567"
                      {...field}
                      className="w-full bg-background border-border/50 rounded-2xl pl-12 h-16 text-lg font-medium focus:ring-primary/20 focus:border-primary transition-all shadow-Inner"
                    />
                  </FormControl>
                  <MessageCircle
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                    size={20}
                  />
                </div>
                <FormMessage className="pl-1" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="aceptoTerminos"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-3xl p-4 bg-muted/30 border border-border/50">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-1 border-primary/50 w-5 h-5 rounded-md data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
              </FormControl>
              <div className="space-y-2 leading-tight">
                <FormLabel className="text-sm font-bold text-foreground">
                  Acepto el tratamiento de mis datos personales.
                </FormLabel>
                <p className="text-xs text-muted-foreground">
                  Autorizo a Desmulta a consultar mi estado en el SIMIT para fines de asesoría
                  técnica.{' '}
                  <Link
                    href="/terminos"
                    target="_blank"
                    className="underline text-primary hover:text-primary/80 font-bold transition-all"
                  >
                    Ver Términos
                  </Link>
                </p>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <div className="pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground font-black py-8 rounded-3xl hover:bg-primary/95 transition-all flex items-center justify-center gap-3 h-20 text-xl shadow-xl shadow-primary/20 active:scale-95 border-none"
            aria-disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                ANALIZANDO...
              </>
            ) : (
              <>
                ESTUDIO GRATUITO
                <ChevronRight
                  size={22}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </>
            )}
          </Button>
          <div className="flex items-center justify-center gap-2 mt-6 text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">
            <ShieldCheck size={12} />
            <span>Encriptación de Grado Bancario</span>
          </div>
        </div>
      </form>
    </Form>
  );
}
