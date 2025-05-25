import { EventEmitter } from 'events';
import { type User } from '@shared/schema';

export type AppEvents = {
  'user.registered': { user: Omit<User, 'password'> };
  'user.approved': { user: Omit<User, 'password'> };
  'user.deleted': { userId: number };
  'order.created': { orderId: number; userId: number };
  'order.updated': { orderId: number; userId: number };
};

class TypedEventEmitter extends EventEmitter {
  emit<K extends keyof AppEvents>(event: K, data: AppEvents[K]): boolean {
    return super.emit(event, data);
  }

  on<K extends keyof AppEvents>(event: K, listener: (data: AppEvents[K]) => void): this {
    return super.on(event, listener);
  }

  once<K extends keyof AppEvents>(event: K, listener: (data: AppEvents[K]) => void): this {
    return super.once(event, listener);
  }

  off<K extends keyof AppEvents>(event: K, listener: (data: AppEvents[K]) => void): this {
    return super.off(event, listener);
  }
}

// Singleton instance
export const appEvents = new TypedEventEmitter();

// Configurar listeners
export function setupEventListeners() {
  // Listener para novos usuários registrados
  appEvents.on('user.registered', async (data) => {
    console.log(`Novo usuário registrado: ${data.user.name}`);
    
    // Enviar notificação (será refatorado depois)
    try {
      const notificationPayload = { userName: data.user.name };
      const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationPayload)
      };
      
      await fetch(`http://localhost:${process.env.PORT || 5000}/api/notify-new-user`, fetchOptions);
    } catch (error) {
      console.error("Erro ao notificar sobre novo usuário:", error);
    }
  });

  // Listener para usuários aprovados
  appEvents.on('user.approved', (data) => {
    console.log(`Usuário aprovado: ${data.user.name}`);
    // Aqui pode adicionar lógica para notificar o usuário por email, etc.
  });

  // Listener para usuários deletados
  appEvents.on('user.deleted', (data) => {
    console.log(`Usuário deletado: ID ${data.userId}`);
  });

  // Outros listeners podem ser adicionados aqui
}

// Exportar função para emitir eventos de forma tipada
export function emitEvent<K extends keyof AppEvents>(event: K, data: AppEvents[K]) {
  appEvents.emit(event, data);
} 