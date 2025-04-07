import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

// Configuração do WebSocket server
export function setupWebSocketServer(httpServer: Server) {
  // Criar um WebSocket server no mesmo servidor HTTP, mas em um caminho distinto
  // para não conflitar com o WebSocket do HMR do Vite
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  // Evento disparado quando uma nova conexão é estabelecida
  wss.on('connection', (ws: WebSocket) => {
    console.log('Nova conexão WebSocket estabelecida');
    
    // Enviar mensagem de boas-vindas quando um usuário se conecta
    ws.send(JSON.stringify({ 
      type: 'info', 
      message: 'Conectado ao servidor de notificações',
      timestamp: Date.now()
    }));
    
    // Evento para lidar com mensagens recebidas do cliente
    ws.on('message', (message: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Mensagem recebida:', data);
        
        // Processar diferentes tipos de mensagens
        // Por exemplo, responder a um ping com um pong
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: Date.now() 
          }));
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    });
    
    // Evento para lidar com o fechamento da conexão
    ws.on('close', () => {
      console.log('Conexão WebSocket fechada');
    });
    
    // Verificar periodicamente se o cliente ainda está conectado
    const interval = setInterval(() => {
      if (ws.readyState === 1) { // 1 = OPEN
        ws.send(JSON.stringify({ 
          type: 'heartbeat', 
          timestamp: Date.now() 
        }));
      } else {
        clearInterval(interval);
      }
    }, 30000); // a cada 30 segundos
  });
  
  return wss;
}

// Função para enviar notificações para todos os clientes conectados
export function createNotificationService(wss: WebSocketServer) {
  return {
    // Notifica todos os clientes conectados
    notifyAll: (data: any) => {
      wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === 1) { // 1 = OPEN
          client.send(JSON.stringify(data));
        }
      });
    },
    
    // Notifica apenas os administradores (deve ser expandido com uma 
    // verificação real de quem é admin quando integrado com autenticação)
    notifyAdmins: (data: any) => {
      // Por enquanto, estamos apenas chamando notifyAll
      // Em uma implementação real, você precisaria manter um registro de
      // quais conexões pertencem a administradores
      wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === 1) { // 1 = OPEN
          client.send(JSON.stringify(data));
        }
      });
    },
    
    // Notifica um usuário específico (pelo ID)
    // Na implementação completa, você precisaria manter um mapa de userIds para conexões
    notifyUser: (userId: number, data: any) => {
      // Implementação simulada - na realidade, você precisaria
      // manter um registro de quais conexões pertencem a quais usuários
      console.log(`Tentativa de notificar usuário ${userId}`, data);
    }
  };
}

// Tipos de exportação para simplificar o uso
export type NotificationService = ReturnType<typeof createNotificationService>;