import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CasillasOtp, type EstadoOtp } from '@/components/admin/CasillasOtp';

/** Envoltorio con estado real, como lo usa la pantalla de acceso al panel. */
function Prueba({
  onCompleto,
  estado = 'normal',
}: {
  onCompleto: (v: string) => void;
  estado?: EstadoOtp;
}) {
  const [valor, setValor] = useState('');
  return <CasillasOtp valor={valor} onCambio={setValor} onCompleto={onCompleto} estado={estado} />;
}

const casillas = () => screen.getAllByRole('textbox') as HTMLInputElement[];

describe('CasillasOtp — casillas animadas del código del panel', () => {
  it('avanza al escribir y envía solo al completar los 6 dígitos', () => {
    const onCompleto = vi.fn();
    render(<Prueba onCompleto={onCompleto} />);
    '12345'.split('').forEach((d, i) => fireEvent.change(casillas()[i], { target: { value: d } }));
    expect(onCompleto).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(casillas()[5]);
    fireEvent.change(casillas()[5], { target: { value: '6' } });
    expect(onCompleto).toHaveBeenCalledWith('123456');
  });

  it('acepta pegar el código completo e ignora lo que no son dígitos', () => {
    const onCompleto = vi.fn();
    render(<Prueba onCompleto={onCompleto} />);
    fireEvent.paste(casillas()[0], { clipboardData: { getData: () => '98 76-54' } });
    expect(
      casillas()
        .map((c) => c.value)
        .join('')
    ).toBe('987654');
    expect(onCompleto).toHaveBeenCalledWith('987654');
  });

  it('borrar con retroceso vuelve a la casilla anterior', () => {
    render(<Prueba onCompleto={vi.fn()} />);
    fireEvent.change(casillas()[0], { target: { value: '1' } });
    fireEvent.keyDown(casillas()[1], { key: 'Backspace' });
    expect(casillas()[0].value).toBe('');
    expect(document.activeElement).toBe(casillas()[0]);
  });

  it('expone el estado de la animación y lo anuncia a lectores de pantalla', () => {
    const { container } = render(<Prueba onCompleto={vi.fn()} estado="exito" />);
    expect(container.querySelector('[data-estado="exito"]')).not.toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Código correcto');
  });
});
