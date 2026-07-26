const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'components', 'vial-clear', 'ModalDetalleExpediente.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Update modal width
content = content.replace('max-w-2zl', 'max-w-4xl');

// Update Reveal Button Overlay
const oldReveal = `            {!isRevealed && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-md">
                  <button
                    onClick={handleReveal}
                    disabled={isProcessing === 'reveal'}
                    className="flex items-center gap-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hoverJscale-105 active:scale-95 transition-all shadow-xl"
                  >
                    {isProcessing === 'reveal' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    Revelar Información Sensible
                  </button>
                </div>
              )}`;

const newReveal = `            {!isRevealed && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 dark:bg-black/70 backdrop-blur-md transition-all">
                  <ShieldAlert className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3 opacity-50" />
                  <button
                    onClick={handleReveal}
                    disabled={isProcessing === 'reveal'}
                    className="flex items-center gap-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 hover:shadow-xl hover:shadow-slate-900/20 dark:hover:shadow-white/20 active:scale-95 transition-all"
                  >
                    {isProcessing === 'reveal' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    Revelar Datos Sensibles
                  </button>
                </div>
              )}`;

content = content.replace(oldReveal, newReveal);


const oldBodyStart = `{/* CUERPO PRINCIPAL (Scrollable) */}
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 dark:bg-transparent">
          {/* SECCIÓN 1: IDENTIDAD */}`;

const newBodyStart = `{/* CUERPO PRINCIPAL (Scrollable) */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 dark:bg-transparent">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* COLUMNA IZQUIERDA (Identidad, Vehqculo, PDFs) */}
            <div className="lg:col-span-7 space-y-8">
              {/* SECCIÓN 1: IDENTIDAD */}`;

content = content.replace(oldBodyStart, newBodyStart);

const sect1 = `         {/* SECCIÓN QR DE SEGUIMIENTO */}`;
const sect2 = `         {/* SECCIÓN 2: VEHÍCULO Y EVIDENCIA */}`;
const sect3 = `         <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 mt-8">`;
const sect4 = `         {/* ÁREA DE EDICIÓN DE PDF (SaaS Style) */}`;
const sect5 = `       {/* FOOTER & ACTIONS */}`;

let parts = content.split(sect1);
let beforeQR = parts[0]; 
let afterQR = parts[1].split(sect2);
let qrSection = sect1 + afterQR[0];

let afterVehiculo = afterQR[1].split(sect3);
let vehiculoSectionFull = sect2 + afterVehiculo[0];

const vehiculoInternalStart = `            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`;
const vehiculoPlacaStart = `              {/* Placa Destacada */}`;
const vehiculoEvidenciaStart = `             {/* Evidencia SIMIT (Alta Fidelidad) */}`;
const vehiculoEnd = `             {/* Documentos de defensa removidos de la interfaz visual del admin */}`;

let vParts = vehiculoSectionFull.split(vehiculoEvidenciaStart);
let vehiculoLeft = vParts[0]; 
vehiculoLeft = vehiculoLeft.replace(vehiculoInternalStart, '');
let vehiculoRight = vehiculoEvidenciaStart + vParts[1];
vehiculoRight = vehiculoRight.replace(/\\s*\{\\/\\* Documentos de defensa removidos de la interfaz visual del admin \\*\\/\}\\s*<\\/div>/g, '');

let afterFecha = afterVehiculo[1].split(sect4);
let fechaSection = sect3 + afterFecha[0];

let afterPdf = afterFecha[1].split(sect5);
let pdfSection = sect4 + afterPdf[0];

let footerSection = sect5 + afterPdf[1];

let finalContent = beforeQR; 
finalContent += `\\n          {/* SECCIÓN VEHÍCULO (PLACA) */}\\n`;
finalContent += `          {(data.placa || esCaptura) && (\\n`;
finalContent += `           <div className="flex flex-col gap-4">\\n`;
finalContent += vehiculoLeft.replace(`         {(data.placa || esCaptura) && (\n`, ''); 
finalContent += `           </div>\\n`;
finalContent += `         )}\\n`;
finalContent += fechaSection;
finalContent += pdfSection;
finalContent += `            </div>\\n\\n`; 
finalContent += `           {/* COLUMNA DERECHA (QR y Evidencia) */}\\n`;
finalContent += `           <div className="lg:col-span-5 space-y-8">\\n`;
finalContent += `             {(data.placa || esCaptura) && (
                <div className="flex flex-col gap-4 h-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-w-full overflow-hidden shadow-sm">
`;
vehiculoRight = vehiculoRight.replace(`className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm h-full min-h-[140px] flex flex-col justify-between group"`, `className="h-full min-h-[140px] flex flex-col group p-4"`);
finalContent += vehiculoRight;
finalContent += `               </div>\\n`;
finalContent += `             )}\\n`;
finalContent += qrSection;
finalContent += `            </div>\\n`; 
finalContent += `         </div>\\n`; 

let refinedFooter = footerSection;
const oldContactado = `className="flex-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200/50 dark:border-blue-500/30 flex justify-center items-center active:scale-[0.98]"`;
const newContactado = `className="flex-1 bg-transparent hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-500/30 flex justify-center items-center active:scale-[0.98]"`;
refinedFooter = refinedFooter.replace(oldContactado, newContactado);
finalContent += refinedFooter;

fs.writeFileSync(filePath, finalContent, 'utf-8');
console.log('Refactor completed.');