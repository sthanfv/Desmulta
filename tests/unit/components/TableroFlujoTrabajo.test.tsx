import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TableroFlujoTrabajo } from '@/components/vial-clear/TableroFlujoTrabajo';

vi.mock('exceljs', () => {
  class WorkbookMock {
    addWorksheet = vi.fn().mockReturnValue({
      columns: [],
      addRow: vi.fn(),
      getRow: vi.fn().mockReturnValue({ font: {} }),
    });
    xlsx = {
      writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    };
  }

  return {
    Workbook: WorkbookMock,
    default: {
      Workbook: WorkbookMock,
    },
  };
});

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useKanban', () => ({
  useKanban: (leads: any, casos: any) => ({
    allItems: [...leads, ...casos],
    itemSeleccionado: null,
    setItemSeleccionado: vi.fn(),
    modalNota: { isOpen: false },
    setModalNota: vi.fn(),
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    handleCambiarEstadoDesdeModal: vi.fn(),
    handlePromoverDesdeModal: vi.fn(),
    confirmCambioEstado: vi.fn(),
    setAllItems: vi.fn(),
  }),
}));

vi.mock('@/firebase', () => ({
  useAuth: () => ({ currentUser: { email: 'test@admin.com' } }),
}));

vi.mock('@/lib/logger/security-logger', () => ({
  SecurityLogger: {
    info: vi.fn(),
    error: vi.fn((msg, meta) => {
      console.log('❌ ERROR DETECTADO EN COMPONENTE:', msg, meta);
    }),
    warn: vi.fn(),
  }
}));

vi.mock('@/app/admin/audit-actions', () => ({
  logExportAction: vi.fn()
}));

// Mock para saltarse la autenticación de PIN en los tests mediante interacción manual
vi.mock('@/components/vial-clear/ModalAuthPin', () => ({
  ModalAuthPin: ({ isOpen, onSuccess }: any) => {
    if (!isOpen) return null;
    return (
      <button data-testid="confirmar-pin-mock" onClick={() => onSuccess('1234')}>
        Confirmar PIN
      </button>
    );
  },
}));

// Mock para evitar problemas de infinite ref loop con Radix UI en jsdom/vitest
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: () => null,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <>{children}</>,
  PopoverTrigger: ({ children }: any) => <>{children}</>,
  PopoverContent: () => null,
}));

global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
} as any;

describe('TableroFlujoTrabajo Component - Excel Export', () => {
  const mockLeads = [
    {
      id: 'L1',
      tipo: 'lead',
      estado: 'NUEVO',
      placa: 'XYZ-123',
      ciudad: 'Bogota',
      nombre: 'Juan Perez'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe disparar la generación y descarga del excel mediante saveAs', async () => {
    const { saveAs } = await import('file-saver');
    
    render(<TableroFlujoTrabajo leadsReales={mockLeads as any} casosReales={[]} />);

    const btnExcel = screen.getByTitle('Exportar a Excel');
    fireEvent.click(btnExcel);

    // Hacemos clic en el botón del mock para confirmar el PIN de forma única
    const btnConfirmarPin = screen.getByTestId('confirmar-pin-mock');
    fireEvent.click(btnConfirmarPin);

    await waitFor(() => {
      expect(saveAs).toHaveBeenCalled();
    });
  });
});
