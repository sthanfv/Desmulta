'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, ChevronRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { getAuth } from 'firebase/auth';

import { ConsultationSchema } from '@/lib/definitions';

import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';

type ConsultationFormData = Zod.infer<typeof ConsultationSchema>;

export function ConsultationForm({ onClose }: { onClose: () => void }) {
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
      } catch (_parseError) {
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
      setTimeout(onClose, 3000);
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
      <div className="flex flex-col items-center justify-center p-8 text-center h-[450px] transition-all duration-500">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h3 className="text-xl font-bold mb-2 text-foreground">Solicitud Enviada</h3>
        <p className="text-muted-foreground max-w-sm">
          Uno de nuestros expertos le contactará pronto por WhatsApp.
        </p>
        <Button onClick={onClose} variant="outline" className="mt-6 border-border">
          Cerrar
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

        <FormField
          control={form.control}
          name="cedula"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground/80">
                Cédula del Propietario
              </FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showCedula ? 'text' : 'password'}
                    placeholder="Solo números, sin puntos ni comas"
                    {...field}
                    className="w-full bg-background border-border rounded-lg pl-4 pr-12 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowCedula(!showCedula)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showCedula ? 'Ocultar cédula' : 'Mostrar cédula'}
                >
                  {showCedula ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground/80">Nombre Completo</FormLabel>
              <FormControl>
                <Input
                  placeholder="Como aparece en el documento"
                  {...field}
                  className="w-full bg-background border-border rounded-lg px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contacto"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground/80">
                WhatsApp de Contacto
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="3001234567"
                  {...field}
                  className="w-full bg-background border-border rounded-lg px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="aceptoTerminos"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md pt-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-0.5 border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-medium text-foreground/80">
                  Acepto los términos y la política de privacidad.
                </FormLabel>
                <p className="text-xs text-muted-foreground">
                  Al enviar, autoriza la consulta de sus datos.{' '}
                  <Link
                    href="/terminos"
                    target="_blank"
                    className="underline text-primary/80 hover:text-primary transition-colors"
                  >
                    Leer más
                  </Link>
                  .
                </p>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground font-black py-4 rounded-xl hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 h-12 text-base shadow-md"
            aria-disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                REVISANDO...
              </>
            ) : (
              <>
                REVISAR MI CASO GRATIS
                <ChevronRight size={18} />
              </>
            )}
          </Button>
          <p className="text-[9px] text-muted-foreground text-center mt-4 uppercase tracking-tighter">
            Al solicitar el estudio, usted acepta que el análisis inicial es gratuito. Gestiones
            posteriores conllevan honorarios que se acordarán tras el diagnóstico.
          </p>
        </div>
      </form>
    </Form>
  );
}
