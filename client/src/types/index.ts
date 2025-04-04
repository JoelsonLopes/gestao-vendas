// Tipos personalizados para o frontend

// Importando os tipos base do schema
import { OrderItem as BaseOrderItem } from "@shared/schema";

// Estendendo o tipo OrderItem para incluir clientRef
export interface OrderItemWithClientRef extends BaseOrderItem {
  clientRef?: string | null;
  product?: any; // Para armazenar dados adicionais do produto
}

// Outros tipos personalizados aqui