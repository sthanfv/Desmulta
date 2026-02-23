'use client';

import React from 'react';
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    HelpCircle,
    ShieldCheck,
    Scale,
    FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PreliminaryCaseAssessmentOutput } from '@/ai/flows/preliminary-case-assessment-flow';

interface AICaseAnalysisProps {
    analysis: PreliminaryCaseAssessmentOutput;
}

export function AICaseAnalysis({ analysis }: AICaseAnalysisProps) {
    const getViabilityDetails = (viability: string) => {
        switch (viability) {
            case 'high':
                return {
                    icon: <CheckCircle2 className="w-8 h-8 text-green-500" />,
                    color: "bg-green-500/10 text-green-500",
                    label: "Alta Viabilidad",
                    description: "Existen fundamentos legales sólidos para proceder."
                };
            case 'medium':
                return {
                    icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
                    color: "bg-yellow-500/10 text-yellow-500",
                    label: "Viabilidad Media",
                    description: "Se requiere un estudio más profundo de las notificaciones."
                };
            case 'low':
                return {
                    icon: <XCircle className="w-8 h-8 text-red-500" />,
                    color: "bg-red-500/10 text-red-500",
                    label: "Baja Viabilidad",
                    description: "No se identifican causales automáticas de prescripción."
                };
            default:
                return {
                    icon: <HelpCircle className="w-8 h-8 text-muted-foreground" />,
                    color: "bg-muted/10 text-muted-foreground",
                    label: "Indeterminado",
                    description: "Se necesita más información técnica sobre los comparendos."
                };
        }
    };

    const details = getViabilityDetails(analysis.viability);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Viability Hero */}
            <div className={`p-8 rounded-[2.5rem] ${details.color} border border-current/10 flex items-center gap-6`}>
                <div className="p-4 rounded-2xl bg-white/20">
                    {details.icon}
                </div>
                <div>
                    <h3 className="text-2xl font-black tracking-tight">{details.label}</h3>
                    <p className="font-medium opacity-80">{details.description}</p>
                </div>
            </div>

            {/* Summary */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                    <FileText className="w-5 h-5" />
                    <h4 className="font-black uppercase tracking-widest text-xs">Resumen del Análisis</h4>
                </div>
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                    <p className="text-foreground/90 leading-relaxed font-medium">
                        {analysis.summary}
                    </p>
                </div>
            </div>

            {/* Legal Justifications */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                    <Scale className="w-5 h-5" />
                    <h4 className="font-black uppercase tracking-widest text-xs">Fundamentos Legales Identificados</h4>
                </div>
                <div className="grid gap-3">
                    {analysis.legalJustifications.map((justification, index) => (
                        <div key={index} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 items-start">
                            <div className="mt-1">
                                <ShieldCheck className="w-4 h-4 text-primary" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground leading-snug">
                                {justification}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Disclaimer */}
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-[10px] text-blue-400/70 font-bold uppercase tracking-wider text-center">
                    Este análisis es preliminar y generado por inteligencia artificial. No constituye una garantía legal definitiva.
                </p>
            </div>
        </div>
    );
}
