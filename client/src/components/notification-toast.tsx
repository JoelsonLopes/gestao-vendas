import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Info, Bell, AlertCircle, Check, ArrowRightLeft } from 'lucide-react';

// Interface para os objetos de notificação
interface Notification {
  type: "info" | "success" | "warning" | "heartbeat";
  message: string;
  timestamp: number;
}

// Criamos um contexto para as notificações WebSocket
type WebSocketNotificationContextType = {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
};

const WebSocketNotificationContext = createContext<WebSocketNotificationContextType | null>(null);

// Provider que encapsula a lógica de WebSocket
export function WebSocketNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Adicionar nova notificação e também mostrar um toast
  const handleNotification = (notification: Notification) => {
    setNotifications((prev) => [...prev, notification]);
    
    // Determinar o ícone com base no tipo
    let icon;
    let variant: 'default' | 'destructive' | undefined = 'default';
    
    switch (notification.type) {
      case 'success':
        icon = <Check className="h-4 w-4" />;
        break;
      case 'warning':
        icon = <AlertCircle className="h-4 w-4" />;
        variant = 'destructive';
        break;
      case 'heartbeat':
        icon = <ArrowRightLeft className="h-4 w-4" />;
        return; // Não mostramos toasts para heartbeats
      default:
        icon = <Info className="h-4 w-4" />;
    }
    
    // Mostrar toast apenas para notificações que não são do tipo heartbeat
    if (notification.type === 'info' || notification.type === 'success' || notification.type === 'warning') {
      toast({
        title: notification.type.charAt(0).toUpperCase() + notification.type.slice(1),
        description: notification.message,
        variant
      });
    }
  };

  // Função para adicionar notificações (pode ser usada por outros componentes)
  const addNotification = (notification: Notification) => {
    handleNotification(notification);
  };

  // Função para limpar todas as notificações
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Configurar a conexão WebSocket quando o componente montar
  useEffect(() => {
    // Determinar o protocolo com base no protocolo HTTP atual
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Construir a URL do WebSocket
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Criar uma nova conexão WebSocket
    const newSocket = new WebSocket(wsUrl);
    
    // Configurar handlers para eventos do WebSocket
    newSocket.onopen = () => {
      console.log("Conexão WebSocket estabelecida");
    };
    
    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Mensagem WebSocket recebida:", data);
        
        if (data.type && data.message) {
          handleNotification(data);
        }
      } catch (error) {
        console.error("Erro ao processar mensagem WebSocket:", error);
      }
    };
    
    newSocket.onerror = (error) => {
      console.error("Erro na conexão WebSocket:", error);
    };
    
    newSocket.onclose = () => {
      console.log("Conexão WebSocket fechada");
    };
    
    // Armazenar a conexão no estado
    setSocket(newSocket);
    
    // Limpar a conexão quando o componente desmontar
    return () => {
      if (newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }
    };
  }, []);

  // Implementar ping/pong para manter a conexão ativa
  useEffect(() => {
    if (!socket) return;
    
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000); // Enviar ping a cada 25 segundos
    
    return () => {
      clearInterval(pingInterval);
    };
  }, [socket]);

  return (
    <WebSocketNotificationContext.Provider 
      value={{ 
        notifications, 
        addNotification, 
        clearNotifications 
      }}
    >
      {children}
    </WebSocketNotificationContext.Provider>
  );
}

// Hook para usar o contexto
export function useWebSocketNotifications() {
  const context = useContext(WebSocketNotificationContext);
  if (!context) {
    throw new Error("useWebSocketNotifications deve ser usado dentro de um WebSocketNotificationProvider");
  }
  return context;
}

// Componente listener que apenas recebe notificações
export function NotificationListener() {
  // Usar o hook apenas para garantir que o provider está ativo e recebendo mensagens
  useWebSocketNotifications();
  
  // Este componente não renderiza nada visualmente
  return null;
}

// Componente que exibe um ícone de sino com contador e dropdown de notificações
export function NotificationBell() {
  const { notifications, clearNotifications } = useWebSocketNotifications();
  const [isOpen, setIsOpen] = useState(false);
  
  // Filtrar apenas notificações que são info, success ou warning para contagem
  const filteredNotifications = notifications.filter(n => ['info', 'success', 'warning'].includes(n.type));
  const count = filteredNotifications.length;
  
  // Função para alternar a exibição do dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  // Fechar o dropdown quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-bell-container')) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Determinar o ícone com base no tipo de notificação
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };
  
  // Formatar data
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };
  
  // Limpar notificações e fechar dropdown
  const handleClearNotifications = () => {
    clearNotifications();
    setIsOpen(false);
  };
  
  return (
    <div className="notification-bell-container relative inline-block">
      <div className="cursor-pointer" onClick={toggleDropdown}>
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-1 min-w-[16px] h-4 flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-sm font-medium">Notificações</h3>
            {count > 0 && (
              <button 
                className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={handleClearNotifications}
              >
                Limpar todas
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhuma notificação disponível
              </div>
            ) : (
              <ul>
                {filteredNotifications.map((notification, index) => (
                  <li key={index} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-start">
                      <div className="mr-3 mt-1">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 dark:text-gray-200">{notification.message}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(notification.timestamp)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}