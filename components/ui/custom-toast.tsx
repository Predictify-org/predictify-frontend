'use client';

import React from 'react';
import { toast as sonnerToast } from 'sonner';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Custom toast variants that match the app theme
export const customToast = {
  success: (message: string, options?: { description?: string; action?: { label: string; onClick: () => void } }) => {
    return sonnerToast.custom((t) => (
      <CustomToastContent
        id={t}
        type="success"
        message={message}
        description={options?.description}
        action={options?.action}
      />
    ));
  },

  error: (message: string, options?: { description?: string; action?: { label: string; onClick: () => void } }) => {
    return sonnerToast.custom((t) => (
      <CustomToastContent
        id={t}
        type="error"
        message={message}
        description={options?.description}
        action={options?.action}
      />
    ));
  },

  info: (message: string, options?: { description?: string; action?: { label: string; onClick: () => void } }) => {
    return sonnerToast.custom((t) => (
      <CustomToastContent
        id={t}
        type="info"
        message={message}
        description={options?.description}
        action={options?.action}
      />
    ));
  },

  warning: (message: string, options?: { description?: string; action?: { label: string; onClick: () => void } }) => {
    return sonnerToast.custom((t) => (
      <CustomToastContent
        id={t}
        type="warning"
        message={message}
        description={options?.description}
        action={options?.action}
      />
    ));
  },
};

interface CustomToastContentProps {
  id: string | number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const CustomToastContent: React.FC<CustomToastContentProps> = ({
  id,
  type,
  message,
  description,
  action,
}) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const styles = {
    success: {
      container: 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20',
      icon: 'text-green-400',
      title: 'text-green-100',
      description: 'text-green-200/80',
      action: 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border-green-500/30',
    },
    error: {
      container: 'bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/20',
      icon: 'text-red-400',
      title: 'text-red-100',
      description: 'text-red-200/80',
      action: 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30',
    },
    info: {
      container: 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20',
      icon: 'text-blue-400',
      title: 'text-blue-100',
      description: 'text-blue-200/80',
      action: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/30',
    },
    warning: {
      container: 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20',
      icon: 'text-yellow-400',
      title: 'text-yellow-100',
      description: 'text-yellow-200/80',
      action: 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border-yellow-500/30',
    },
  };

  const Icon = icons[type];
  const style = styles[type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm shadow-lg min-w-[300px] max-w-[420px]',
        style.container
      )}
    >
      <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', style.icon)} />
      
      <div className="flex-1 space-y-1">
        <div className={cn('font-semibold text-sm', style.title)}>
          {message}
        </div>
        
        {description && (
          <div className={cn('text-xs leading-relaxed', style.description)}>
            {description}
          </div>
        )}
        
        {action && (
          <button
            onClick={() => {
              action.onClick();
              sonnerToast.dismiss(id);
            }}
            className={cn(
              'mt-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              style.action
            )}
          >
            {action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={() => sonnerToast.dismiss(id)}
        className="text-white/40 hover:text-white/60 transition-colors p-1 -mt-1 -mr-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
