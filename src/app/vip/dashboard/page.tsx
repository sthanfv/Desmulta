import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { ShieldCheck, LogOut, Clock, CheckCircle2 } from 'lucide-react';
import { TimelineEventVip } from '@/components/vip/TimelineEventVip';
import { VipPushNotification } from '@/components/vip/VipPushNotification';

import { getVipSecret } from '@/lib/security/vip-jwt';

async function getVipData() {
  const cookieStore = await cookies();
  const token = cookieStore.get('_vip_session')?.value;
  if (!token) redirect('/vip');

  let payload;
  try {
    const verified = await jwtVerify(token, getVipSecret());
    payload = verified.payload as { hashedCedula: string; hashedCelular: string };
  } catch (_error) {
    redirect('/vip');
  }

  getAdminApp();
  const db = getFirestore();

  // Buscar en casos
  const casesSnapshot = await db
    .collection('cases')
    .where('cedulaHash', '==', payload.hashedCedula)
    .limit(1)
    .get();

  if (!casesSnapshot.empty) {
    const doc = casesSnapshot.docs[0];
    return { id: doc.id, tipo: 'caso', data: doc.data() };
  }

  // Si no hay caso, buscar en leads
  const leadsSnapshot = await db
    .collection('consultations')
    .where('cedulaHash', '==', payload.hashedCedula)
    .limit(1)
    .get();

  if (!leadsSnapshot.empty) {
    const doc = leadsSnapshot.docs[0];
    return { id: doc.id, tipo: 'lead', data: doc.data() };
  }

  redirect('/vip');
}

export default async function VipDashboardPage() {
  const expediente = await getVipData();
  const { data } = expediente;

  // Extraer timeline_updates o history (dependiendo de si es caso o lead)
  // Casos usan history, leads ahora usan timeline_updates
  const rawHistory = expediente.tipo === 'caso' ? data.history : data.timeline_updates;
  const events = Array.isArray(rawHistory) ? [...rawHistory].reverse() : [];

  const estadoActual = data.status || data.estado || 'Recibido';

  return (
    <div className="w-full max-w-lg mx-auto pb-20">
      {/* Header Profile */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] opacity-10 blur-[50px] rounded-full pointer-events-none"></div>

        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest">
                VIP Pass
              </span>
            </div>
            <h1 className="text-2xl font-black text-white">{data.nombre || 'Cliente VIP'}</h1>
            <p className="text-slate-400 text-sm">C.C. [Confidencial]</p>
          </div>
          <a
            href="/api/vip/logout"
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </a>
        </div>

        {/* Status Card */}
        <div className="bg-black/40 border border-white/5 rounded-2xl p-5 relative z-10 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Estado Actual</p>
            <p className="text-xl font-bold text-white capitalize">
              {estadoActual.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        {/* Firebase Cloud Messaging Opt-in Button */}
        <div className="mt-4">
          <VipPushNotification expedienteId={expediente.id} />
        </div>
      </div>

      {/* Timeline Section */}
      <h2 className="text-lg font-bold text-white mb-4 px-2 flex items-center gap-2">
        <Clock className="w-5 h-5 text-slate-400" />
        Línea de Tiempo
      </h2>

      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
        {events.length > 0 ? (
          events.map((evt, idx) => <TimelineEventVip key={idx} event={evt} isLatest={idx === 0} />)
        ) : (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center text-slate-400">
            No hay eventos registrados en la línea de tiempo aún.
          </div>
        )}
      </div>
    </div>
  );
}
