import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2, AlertCircle, QrCode } from 'lucide-react';

interface ChipStatusIndicatorProps {
  status: string;
  isReady?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
}

export function ChipStatusIndicator({ 
  status, 
  isReady = false, 
  size = 'md',
  showIcon = true,
  showText = true 
}: ChipStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <Wifi className="h-3 w-3" />,
          text: 'Conectado',
          pulse: false
        };
      case 'qr_ready':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <QrCode className="h-3 w-3" />,
          text: 'QR Pronto',
          pulse: true
        };
      case 'connecting':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Conectando',
          pulse: true
        };
      case 'authenticated':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Wifi className="h-3 w-3" />,
          text: 'Autenticado',
          pulse: false
        };
      case 'auth_failed':
      case 'error':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Erro',
          pulse: false
        };
      case 'disconnected':
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Desconectado',
          pulse: false
        };
    }
  };

  const config = getStatusConfig();
  
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  return (
    <Badge 
      className={`
        ${config.color} 
        ${sizeClasses[size]}
        ${config.pulse ? 'animate-pulse' : ''}
        flex items-center gap-1.5 font-medium
      `}
    >
      {showIcon && config.icon}
      {showText && config.text}
    </Badge>
  );
}