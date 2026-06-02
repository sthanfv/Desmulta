import { useEffect } from 'react';
import { useToast } from './use-toast';

/**
 * useClipboardProtection - Hook para notificar copia de contenido protegido.
 * MANDATO-FILTRO: Protección de datos y branding.
 */
export function useClipboardProtection() {
  const { toast } = useToast();

  useEffect(() => {
    const handleCopy = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 10) {
        toast({
          title: 'Protección Legal Activa',
          description:
            'Contenido protegido por Desmulta Colombia ©. Su registro queda vinculado a esta consulta.',
        });
      }
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [toast]);
}
