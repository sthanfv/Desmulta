'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Granular Error Boundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 md:p-12 rounded-[2.5rem] border border-destructive/20 bg-destructive/5 text-center my-8 backdrop-blur-md">
          <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-xl font-black text-foreground mb-3 uppercase tracking-tight">
            Sección Temporalmente <span className="text-destructive uppercase">No Disponible</span>
          </h3>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto font-medium">
            Esta sección específica ha experimentado un problema técnico, pero el resto de la
            plataforma sigue operativa.
          </p>
          <Button
            onClick={() => this.setState({ hasError: false })}
            className="h-12 px-6 rounded-xl bg-foreground text-background font-bold hover:bg-foreground/90 transition-all active:scale-95"
          >
            <RefreshCcw className="mr-2 w-4 h-4" />
            Recargar Sección
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
