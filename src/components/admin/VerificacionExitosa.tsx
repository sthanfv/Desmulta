'use client';

/**
 * Vista "Código verificado" que ocupa la tarjeta del código al acertar (referencia
 * "OTP Verification" del propietario, la misma de Origgo): resplandor desde abajo, sello que
 * crece con el check y el botón "Continuar". La tarjeta debe usar `estilosTarjeta.tarjeta`,
 * `data-estado` y envolver su contenido en `estilosTarjeta.vistaCodigo`.
 */

import estilos from './VerificacionExitosa.module.css';

export const estilosTarjeta = estilos;

export function VerificacionExitosa({
  listo,
  onContinuar,
}: {
  /** La sesión ya quedó registrada en el servidor y se puede entrar. */
  listo: boolean;
  onContinuar: () => void;
}) {
  return (
    <div className={estilos.vistaExito} role="status">
      <h2 className={`${estilos.aparece} text-xl font-bold`}>Código verificado</h2>
      <p className={`${estilos.aparece} text-sm text-muted-foreground max-w-[260px]`}>
        Tu sesión de administrador está activa en este dispositivo.
      </p>
      <div className={estilos.sello} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <button
        type="button"
        className={estilos.continuar}
        onClick={onContinuar}
        disabled={!listo}
        autoFocus
      >
        {listo ? 'Continuar' : 'Preparando tu panel…'}
      </button>
    </div>
  );
}
