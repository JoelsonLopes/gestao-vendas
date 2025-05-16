import { ClientRepository } from "./client";
import { ClientHistoryRepository } from "./clientHistory";
import { DiscountRepository } from "./discount";
import { OrderRepository } from "./order";
import { ProductRepository } from "./product";
import { RegionRepository } from "./region";
import { sessionStore } from "./session.store";
import { StatsRepository } from "./stats";
import { UserRepository } from "./user";

export const storage = {
  user: new UserRepository(),
  client: new ClientRepository(),
  product: new ProductRepository(),
  order: new OrderRepository(),
  region: new RegionRepository(),
  discount: new DiscountRepository(),
  clientHistory: new ClientHistoryRepository(),
  sessionStore,
  stats: new StatsRepository(
    new UserRepository(),
    new ClientRepository(),
    new ProductRepository(),
    new OrderRepository()
  ),
  // Outros storages serão adicionados aqui futuramente
}; 