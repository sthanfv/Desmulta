import { describe, it, expect } from 'vitest';
import { ConsultationSchema } from '../lib/definitions';

describe('Escudo de Validación de Consultas (Zod)', () => {
    const datosValidos = {
        cedula: '1090123456',
        placa: 'AAA123',
        nombre: 'Juan Pérez',
        contacto: '3001234567',
        aceptoTerminos: true,
        antiguedad: 'Más de 3 años',
        tipoInfraccion: 'Foto-Multa (Cámara)',
        estadoCoactivo: 'NO',
    };

    it('✅ Debe permitir el paso de datos perfectamente válidos', () => {
        const validacion = ConsultationSchema.safeParse(datosValidos);
        expect(validacion.success).toBe(true);
    });

    describe('🛡️ Defensa Anti-Bots (Honeypot)', () => {
        it('🚫 Debe BLOQUEAR si el bot llena el campo invisible (_tramp_field)', () => {
            const datosBot = {
                ...datosValidos,
                _tramp_field: 'soy_un_bot_llenando_campos', // El bot cae en la trampa
            };
            const validacion = ConsultationSchema.safeParse(datosBot);
            expect(validacion.success).toBe(false);
            if (!validacion.success) {
                expect(validacion.error.issues[0].message).toContain('Bot detected');
            }
        });
    });

    describe('🚗 Motor de Expresiones Regulares', () => {
        it('🚫 Debe rechazar placas de carro inválidas', () => {
            const datosMalos = { ...datosValidos, placa: 'AA123' }; // Falta una letra
            const validacion = ConsultationSchema.safeParse(datosMalos);
            expect(validacion.success).toBe(false);
        });

        it('✅ Debe aceptar placas de moto (AAA12A)', () => {
            const datosMoto = { ...datosValidos, placa: 'XYZ98B' };
            const validacion = ConsultationSchema.safeParse(datosMoto);
            expect(validacion.success).toBe(true);
        });

        it('🚫 Debe rechazar cédulas con letras', () => {
            const datosMalos = { ...datosValidos, cedula: '1090ABC456' };
            const validacion = ConsultationSchema.safeParse(datosMalos);
            expect(validacion.success).toBe(false);
        });
    });
});
