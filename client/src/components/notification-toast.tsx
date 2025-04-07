import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Info, AlertCircle, CheckCircle } from "lucide-react";

interface Notification {
  type: "info" | "success" | "warning" | "heartbeat";
  message: string;
  timestamp: number;
}

// Hook para gerenciar notificações via WebSocket
export function useWebSocketNotifications() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Determinar o protocolo correto (wss para HTTPS, ws para HTTP)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Criar conexão WebSocket
    const newSocket = new WebSocket(wsUrl);
    
    // Configurar handlers de eventos
    newSocket.onopen = () => {
      console.log("Conexão WebSocket estabelecida");
    };
    
    newSocket.onclose = () => {
      console.log("Conexão WebSocket fechada");
    };
    
    newSocket.onerror = (error) => {
      console.error("Erro na conexão WebSocket:", error);
    };
    
    // Manipulador de mensagens recebidas
    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Notification;
        handleNotification(data);
      } catch (error) {
        console.error("Erro ao processar mensagem:", error);
      }
    };
    
    setSocket(newSocket);
    
    // Limpar a conexão ao desmontar
    return () => {
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }
    };
  }, [toast]);
  
  // Função para lidar com notificações recebidas
  const handleNotification = (notification: Notification) => {
    // Ignorar mensagens de heartbeat
    if (notification.type === "heartbeat") return;
    
    // Determinar ícone e variante com base no tipo
    let icon = null;
    let variant: "default" | "destructive" = "default";
    
    switch (notification.type) {
      case "info":
        icon = <Info className="h-4 w-4" />;
        break;
      case "warning":
        icon = <AlertCircle className="h-4 w-4" />;
        variant = "destructive";
        break;
      case "success":
        icon = <CheckCircle className="h-4 w-4" />;
        break;
      default:
        icon = <Info className="h-4 w-4" />;
    }
    
    // Exibir toast
    toast({
      title: notification.type.charAt(0).toUpperCase() + notification.type.slice(1),
      description: notification.message,
      variant,
      action: (
        <ToastAction altText="Fechar">Fechar</ToastAction>
      )
    });
  };
  
  // Retornar o socket para uso em componentes
  return { socket };
}

// Componente listener que não renderiza nada visualmente
export function NotificationListener() {
  useWebSocketNotifications();
  return null;
}