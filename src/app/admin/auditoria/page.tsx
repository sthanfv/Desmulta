'use client';
import { logger } from '@/lib/logger/security-logger';

import React, { useState, useEffect, useCallback } from 'react';
import {
  verifyGodMode,
  fetchAuditLogs,
  AuditLog,
  exitGodMode,
  exportAuditLogs,
  listAdminUsers,
  grantAdminAccessByEmail,
  revokeAdminAccess,
  AdminUser,
} from '@/app/admin/audit-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  ShieldAlert,
  LogOut,
  Activity,
  Download,
  ArrowLeft,
  UserPlus,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';
// jspdf se usa aquí para exportación PDF en el navegador (client-side).
// No migrar a pdf-lib ya que pdf-lib no opera bien en el browser sin bundler custom.
// Para exportación server-side usar pdf-engine.ts con pdf-lib.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

const ACTION_MAP: Record<string, string> = {
  CREATE: 'CREAR',
  UPDATE: 'ACTUALIZAR',
  DELETE: 'ELIMINAR',
  EXPORT: 'EXPORTAR',
  ACCESS: 'ACCESO',
  UPLOAD: 'SUBIR ARCHIVO',
  OTHER: 'OTRO',
};

function getActionDisplayName(action: string, resource: string): string {
  const upperAction = action?.toUpperCase() || '';
  if (upperAction === 'UPDATE') {
    if (['CaseStatus', 'ConsultationStatus', 'VIP_Referrals'].includes(resource)) {
      return 'MOVER / ESTADO';
    }
  }
  return ACTION_MAP[upperAction] || upperAction || 'DESCONOCIDA';
}

function formatAuditDetails(resource: string, details: unknown): string {
  try {
    if (!details) return '';
    const d = typeof details === 'string' ? JSON.parse(details) : details;

    switch (resource) {
      case 'CaseStatus':
        return `Caso #${d.caseId || ''} cambiado a estado: ${d.newStatus?.toUpperCase() || ''}`;
      case 'ConsultationStatus':
        return `Consulta #${d.consultationId || ''} cambiada a estado: ${d.newStatus?.toUpperCase() || ''}`;
      case 'ImageUpload':
        return `Imagen subida exitosamente: ${d.url || d.fileKey || ''}`;
      case 'VIP_Referrals':
        return `Referido VIP #${d.referralId || ''} marcado como: ${d.status?.toUpperCase() || ''}`;
      case 'ShowcaseConfig':
        return `Estadísticas principales (Showcase) actualizadas`;
      case 'FooterConfig':
        return `Datos de pie de página actualizados`;
      case 'ExpiredConsultations':
        return `Eliminadas ${d.count || 0} consultas vencidas`;
      case 'SimitCaptures':
        return `Limpiadas ${d.count || 0} capturas temporales SIMIT`;
      case 'Export_Users':
        return `Se exportaron ${d.count || 0} registros en formato ${d.format || ''}`;
      case 'Admin_Access':
        return `Se modificó acceso al usuario: ${d.targetEmail || d.targetUid || ''}`;
      default:
        const str = JSON.stringify(d);
        if (str === '{}') return 'Sin detalles adicionales';
        return str.replace(/[{}"\\]/g, ' ').trim();
    }
  } catch {
    return JSON.stringify(details);
  }
}

interface ExportLogRecord {
  id: string;
  fecha: string;
  administrador: string;
  accion: string;
  recurso: string;
  detalles: string;
  ip: string;
}

function ExportControls({ admins }: { admins: string[] }) {
  const [adminFilter, setAdminFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const fetchAllLogs = async () => {
    let allRecords: ExportLogRecord[] = [];
    let currentCursor: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await exportAuditLogs({
        adminEmail: adminFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        cursor: currentCursor,
        limit: 200,
      });

      if (response.logs && response.logs.length > 0) {
        allRecords = [...allRecords, ...response.logs] as ExportLogRecord[];
      }

      currentCursor = response.nextCursor;
      hasMore = !!currentCursor;
    }

    return allRecords;
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const { logs } = await exportAuditLogs({
        adminEmail: adminFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 200, // Para PDF limitamos a 200 para evitar congelar el navegador
      });

      if (!logs || logs.length === 0) {
        alert('No se encontraron registros con los filtros seleccionados.');
        return;
      }

      if (logs.length === 200) {
        alert(
          'Mostrando los primeros 200 registros. Usa "Exportar CSV" para descargas masivas completas.'
        );
      }

      const doc = new jsPDF('landscape');
      doc.setFontSize(14);
      doc.text('Reporte de Auditoria - Sistema Desmulta (Modo Dios)', 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Filtros aplicados | Administrador: ${adminFilter} | Rango: ${startDate || 'Inicio'} a ${endDate || 'Fin'}`,
        14,
        22
      );

      const tableColumn = ['Fecha', 'Administrador', 'Acción', 'Recurso', 'Detalles', 'IP'];
      const tableRows = (logs as ExportLogRecord[]).map((r: ExportLogRecord) => {
        const dateObj = new Date(r.fecha);
        const formattedDate = dateObj.toLocaleString('es-CO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });

        let cleanDetails = formatAuditDetails(r.recurso, r.detalles);
        if (cleanDetails.length > 100) cleanDetails = cleanDetails.substring(0, 100) + '...';

        const accionTraducida = getActionDisplayName(r.accion, r.recurso);
        return [formattedDate, r.administrador, accionTraducida, r.recurso, cleanDetails, r.ip];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 28,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 45 },
          2: { cellWidth: 25 },
          3: { cellWidth: 35 },
          4: { cellWidth: 'auto' },
          5: { cellWidth: 30 },
        },
      });

      const fileName = `Audit_Desmulta_${new Date().getTime()}.pdf`;
      doc.save(fileName);
    } catch (error) {
      logger.error('Error exportando datos PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCSV = async () => {
    setIsExporting(true);
    try {
      const records = await fetchAllLogs();

      if (records.length === 0) {
        alert('No se encontraron registros con los filtros seleccionados.');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Auditoría');

      worksheet.columns = [
        { header: 'Fecha', key: 'fecha', width: 25 },
        { header: 'Administrador', key: 'admin', width: 35 },
        { header: 'Acción', key: 'accion', width: 15 },
        { header: 'Recurso', key: 'recurso', width: 25 },
        { header: 'Detalles', key: 'detalles', width: 50 },
        { header: 'IP', key: 'ip', width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF16A34A' },
      };

      records.forEach((r) => {
        const dateObj = new Date(r.fecha);
        const formattedDate = dateObj.toLocaleString('es-CO');
        const cleanDetails = formatAuditDetails(r.recurso, r.detalles);
        const accionTraducida = getActionDisplayName(r.accion, r.recurso);

        worksheet.addRow({
          fecha: formattedDate,
          admin: r.administrador,
          accion: accionTraducida,
          recurso: r.recurso,
          detalles: cleanDetails,
          ip: r.ip,
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Audit_Desmulta_Masivo_${new Date().getTime()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Error exportando datos CSV:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 mb-6 flex flex-wrap items-end gap-4 text-xs text-white">
      <div className="flex flex-col gap-1.5">
        <label className="text-zinc-400 font-medium">Administrador</label>
        <select
          value={adminFilter}
          onChange={(e) => setAdminFilter(e.target.value)}
          className="h-9 bg-zinc-900 border border-zinc-800 rounded-lg px-3 focus:outline-none focus:border-red-500 text-white"
        >
          <option value="ALL">Todos los administradores</option>
          {admins.map((email) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-zinc-400 font-medium">Desde</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-9 bg-zinc-900 border border-zinc-800 rounded-lg px-3 focus:outline-none focus:border-red-500 text-white"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-zinc-400 font-medium">Hasta</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="h-9 bg-zinc-900 border border-zinc-800 rounded-lg px-3 focus:outline-none focus:border-red-500 text-white"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleDownloadPDF}
          disabled={isExporting}
          className="h-9 px-4 bg-zinc-800 text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-zinc-700 active:scale-[0.98] transition-all disabled:opacity-50 border border-zinc-700"
        >
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Exportar PDF
        </button>

        <button
          onClick={handleDownloadCSV}
          disabled={isExporting}
          className="h-9 px-4 bg-emerald-600 text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileSpreadsheet size={14} />
          )}
          Exportar CSV (Masivo)
        </button>
      </div>
    </div>
  );
}

function AdminManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [granting, setGranting] = useState(false);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const result = await listAdminUsers();
    if (result.success && result.users) {
      setUsers(result.users);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'No se pudieron cargar usuarios',
        variant: 'destructive',
      });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleGrantByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;

    setGranting(true);
    const res = await grantAdminAccessByEmail(newAdminEmail.trim());
    if (res.success) {
      toast({ title: 'Permiso Otorgado', description: `${newAdminEmail} ahora es administrador.` });
      setNewAdminEmail('');
      fetchUsers();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
    setGranting(false);
  };

  const handleRevoke = async (uid: string, email: string) => {
    if (!confirm(`¿Seguro que deseas revocar el acceso a ${email}?`)) return;
    const res = await revokeAdminAccess(uid, email);
    if (res.success) {
      toast({ title: 'Permiso Revocado', description: `${email} ya no es administrador.` });
      fetchUsers();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  if (loading)
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="animate-spin text-zinc-500 w-8 h-8" />
      </div>
    );

  return (
    <div className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/80 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-500" />
            Gestión de Administradores
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Asigna permisos de administrador a usuarios existentes por correo electrónico.
          </p>
        </div>

        <form onSubmit={handleGrantByEmail} className="flex gap-2 w-full md:w-auto">
          <Input
            placeholder="correo@ejemplo.com"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            className="bg-zinc-950 border-zinc-800 text-white w-full md:w-64"
            type="email"
          />
          <Button
            type="submit"
            disabled={granting || !newAdminEmail.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {granting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Otorgar Poder
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {users.map((u) => (
          <div
            key={u.uid}
            className="flex flex-col bg-zinc-950 p-4 rounded-xl border border-zinc-800/60 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-2 h-2 rounded-full ${u.isAdmin ? 'bg-emerald-500' : 'bg-zinc-600'}`}
              />
              <span className="text-zinc-200 font-medium truncate text-sm" title={u.email}>
                {u.email}
              </span>
            </div>
            <span className="text-xs text-zinc-500 mb-4 ml-4">
              {u.isAdmin ? 'Tiene permisos de Admin' : 'Sin acceso al panel'}
            </span>

            {u.isAdmin ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRevoke(u.uid, u.email)}
                className="w-full h-8 text-xs font-semibold text-red-400 border-red-900/50 hover:bg-red-950 hover:text-red-300"
              >
                Revocar Poder
              </Button>
            ) : null}
          </div>
        ))}
        {users.length === 0 && (
          <span className="text-zinc-500 text-sm italic col-span-full">
            No hay administradores registrados en el sistema.
          </span>
        )}
      </div>
    </div>
  );
}

export default function AuditPage() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [q, setQ] = useState('');
  const { toast } = useToast();

  const filteredLogs = logs.filter(
    (l) =>
      !q ||
      [l.adminEmail, l.action, l.resource, JSON.stringify(l.details)].some((s) =>
        s?.toLowerCase().includes(q.toLowerCase())
      )
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await verifyGodMode(password);
    if (result.success) {
      setIsAuthorized(true);
      toast({
        title: 'Acceso Autorizado',
        description: 'Modo Dios Activado. Tienes 30 minutos.',
        variant: 'default',
        className: 'bg-emerald-950 border-emerald-800 text-emerald-100',
      });
    } else {
      toast({
        title: 'Acceso Denegado',
        description: result.error || 'Contraseña incorrecta',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await exitGodMode();
    setIsAuthorized(false);
    setPassword('');
  };

  const loadLogs = useCallback(
    async (nextCursor?: string) => {
      setLoading(true);
      const result = await fetchAuditLogs({ limit: 50, cursor: nextCursor });
      if (result.success && result.logs) {
        if (nextCursor) {
          setLogs((prev) => [...prev, ...(result.logs as unknown as AuditLog[])]);
        } else {
          setLogs(result.logs as unknown as AuditLog[]);
        }
        setCursor(result.nextCursor);
        setHasMore(!!result.nextCursor);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudieron cargar los logs',
          variant: 'destructive',
        });
        if (result.error === 'Sesión no autorizada') {
          setIsAuthorized(false);
        }
      }
      setLoading(false);
    },
    [toast]
  );

  useEffect(() => {
    if (isAuthorized) {
      loadLogs();
    }
  }, [isAuthorized, loadLogs]);

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <Link href="/admin">
              <Button
                variant="outline"
                size="icon"
                className="border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl shadow-inner shadow-red-500/10 hidden md:block">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Modo Dios
                <span className="text-zinc-600 text-2xl font-normal">/</span>
                <span className="text-red-400 font-medium text-2xl">Auditoría</span>
              </h1>
              <p className="text-sm text-zinc-400 mt-1 font-medium">
                Registro inmutable de actividad administrativa
              </p>
            </div>
          </div>

          {isAuthorized && (
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-zinc-300 hover:text-red-400 border-zinc-800 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          )}
        </div>

        {/* Content */}
        {!isAuthorized ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-full max-w-sm space-y-6">
              <div className="text-center space-y-2">
                <Activity className="w-12 h-12 text-zinc-700 mx-auto" />
                <h3 className="text-xl font-semibold text-zinc-200">Autenticación Requerida</h3>
                <p className="text-sm text-zinc-400">
                  Ingresa la Contraseña Maestra para acceder a los registros de auditoría del
                  sistema.
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-5">
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-900 border-zinc-800/80 text-center text-xl py-6 tracking-[0.3em] focus-visible:ring-red-500/50 shadow-inner rounded-xl"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium text-base shadow-lg shadow-red-900/20 rounded-xl transition-all"
                  disabled={loading || !password}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Desbloquear Panel'}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AdminManagement />

            <ExportControls
              admins={Array.from(new Set(logs.map((l) => l.adminEmail).filter(Boolean)))}
            />

            <div className="mb-4">
              <Input
                placeholder="Buscar por admin, acción, recurso o detalle..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-white w-full md:max-w-md focus-visible:ring-red-500/50"
              />
            </div>

            <div className="border border-zinc-800/80 rounded-xl overflow-auto bg-zinc-900/40 shadow-inner custom-scrollbar relative max-h-[65vh]">
              <table className="w-full text-sm text-left min-w-full">
                <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm shadow-sm border-b border-zinc-800/80 text-zinc-400">
                  <tr>
                    <th className="px-5 py-4 font-semibold tracking-wide whitespace-nowrap">
                      Fecha
                    </th>
                    <th className="px-5 py-4 font-semibold tracking-wide whitespace-nowrap">
                      Administrador
                    </th>
                    <th className="px-5 py-4 font-semibold tracking-wide whitespace-nowrap">
                      Acción
                    </th>
                    <th className="px-5 py-4 font-semibold tracking-wide whitespace-nowrap">
                      Recurso
                    </th>
                    <th className="px-5 py-4 font-semibold tracking-wide min-w-[300px]">
                      Detalles
                    </th>
                    <th className="px-5 py-4 font-semibold tracking-wide whitespace-nowrap">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors group">
                      <td className="px-5 py-4 text-zinc-300 whitespace-nowrap font-medium">
                        {new Date(log.timestamp as unknown as string).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-zinc-300 font-mono text-sm bg-zinc-950 px-2 py-1.5 rounded border border-zinc-800/50">
                          {log.adminEmail || 'SISTEMA'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-bold tracking-wider
                          ${
                            log.action === 'DELETE'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : log.action === 'UPDATE'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : log.action === 'CREATE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : log.action === 'EXPORT'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                          }`}
                        >
                          {getActionDisplayName(log.action || '', log.resource)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-zinc-300 font-medium whitespace-nowrap">
                        {log.resource}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-[12px] text-zinc-400 bg-zinc-950 px-3 py-2 rounded-md border border-zinc-800/60 group-hover:border-zinc-700 transition-colors break-all whitespace-pre-wrap">
                          {formatAuditDetails(log.resource, log.details)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap">
                        {log.ipAddress}
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                        No hay registros de auditoría disponibles.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {hasMore && logs.length > 0 && (
              <div className="flex justify-center pt-4 pb-8">
                <Button
                  variant="outline"
                  onClick={() => loadLogs(cursor)}
                  disabled={loading}
                  className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-8"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Cargar más registros
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
