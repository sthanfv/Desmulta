import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envía un correo de bienvenida y confirmación de recepción de caso.
 */
export async function enviarCorreoBienvenida(
  email: string,
  nombre: string,
  shortId: string,
  placa: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Desmulta <contactodesmulta@protonmail.com>',
      replyTo: 'contactodesmulta@protonmail.com',
      to: [email],
      subject: `✅ Consulta Recibida - Ref: ${shortId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h1 style="color: #ffbf00;">¡Hola ${nombre}!</h1>
          <p>Hemos recibido correctamente tu solicitud de consultoría para el saneamiento de multas.</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Referencia del Caso:</strong> ${shortId}</p>
            <p><strong>Placa del Vehículo:</strong> ${placa}</p>
          </div>
          
          <p>Un analista de nuestro equipo jurídico revisará tu caso en las próximas horas y se pondrá en contacto contigo a través de WhatsApp.</p>
          
          <p style="font-size: 14px; color: #666;">No es necesario que respondas a este correo.</p>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-weight: bold; text-align: center;">Equipo Desmulta</p>
        </div>
      `,
    });

    if (error) {
      console.error('[Resend] Error al enviar correo:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('[Resend] Excepción en servicio de correo:', err);
    return { success: false, error: err };
  }
}
