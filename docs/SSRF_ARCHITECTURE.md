# Arquitectura Anti-SSRF (Server-Side Request Forgery)

## Resumen Ejecutivo

Desmulta implementa defensas a nivel de red para prevenir ataques SSRF en todas las funciones que consumen URLs externas (como webhooks del OCR o renderizadores PDF). Un actor malicioso no puede forzar a nuestros servidores a escanear nuestra red interna, alcanzar bases de datos privadas ni saltarse controles de seguridad mediante la redirección de dominios.

## Vectores de Ataque Mitigados

1. **IPs de Loopback y Privadas (RFC 1918, RFC 4193)**
   - Bloqueo de solicitudes a `127.0.0.1`, `::1`, `10.x.x.x`, `172.16.x.x`, `192.168.x.x`.
2. **DNS Rebinding**
   - El sistema no confía en la validación por *string* del hostname. Se realiza una resolución DNS asíncrona real (`dns.promises.lookup`) *antes* de enviar el request. Si el dominio público resuelve repentinamente a una IP privada, la conexión es bloqueada.
3. **Ofuscación de Direcciones**
   - Previene ataques mediante formatos decimales (`http://2130706433/`), octales (`http://0177.0.0.1/`), o hexadecimales. La validación se hace siempre sobre la IP final resuelta, independientemente del formato original proporcionado por el usuario.
4. **AWS / GCP Metadata Exfiltration**
   - Bloqueo explícito del rango de direcciones API de metadatos en la nube `169.254.169.254` y subredes asociadas.

## Componente Principal: `ssrf-guard.ts`

El módulo `/src/lib/security/ssrf-guard.ts` expone la función `validateWebhookUrl(url: string)`. Esta función:

1. Extrae el `hostname` de la URL proporcionada.
2. Si el `hostname` parece ser una IP directamente, lo valida de inmediato con la función `isBlockedIp`.
3. Si el `hostname` es un dominio, se realiza una búsqueda DNS asíncrona usando el sistema operativo (`dns.promises.lookup`).
4. Si la IP resultante de la resolución DNS está dentro de un rango bloqueado, se lanza una excepción de seguridad.

### Fallback y Fail-Closed

Cualquier error durante el parsing de la URL o la resolución DNS (por ejemplo, el dominio no existe) resulta en una denegación automática (Fail-Closed).

## Uso en Zod (Validación Asíncrona)

Para integrarse correctamente en la validación de payloads API, el ssrf-guard se usa dentro del método `.superRefine` asíncrono de las librerías de esquemas como Zod. Esto asegura que la validación SSRF ocurra antes de que cualquier lógica de negocio intente usar la URL.

Ejemplo de uso:
```typescript
const AnalizarComparendoSchema = z.object({
  webhookUrl: z.string().url().optional().superRefine(async (val, ctx) => {
    if (!val) return;
    try {
      await validateWebhookUrl(val);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: (e as Error).message,
      });
    }
  }),
});
```

El endpoint luego invoca la validación asíncrona:
`const parsed = await AnalizarComparendoSchema.safeParseAsync(body);`

## Auditoría y Cumplimiento

Esta arquitectura de mitigación fue implementada tras la auditoría de seguridad del 2026-07-20 (Hallazgo A-4) y excede las recomendaciones OWASP estándar para prevención de SSRF en aplicaciones serverless.
