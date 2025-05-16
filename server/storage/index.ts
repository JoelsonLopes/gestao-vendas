import { UserStorage } from "./user.storage";
import { ClientStorage } from "./client.storage";
import { ProductStorage } from "./product.storage";
import { OrderStorage } from "./order.storage";
import { RegionStorage } from "./region.storage";
import { DiscountStorage } from "./discount.storage";
import { ClientHistoryStorage } from "./clientHistory.storage";
import { sessionStore } from "./session.store";
import { StatsStorage } from "./stats.storage";

export const storage = {
  user: new UserStorage(),
  client: new ClientStorage(),
  product: new ProductStorage(),
  order: new OrderStorage(),
  region: new RegionStorage(),
  discount: new DiscountStorage(),
  clientHistory: new ClientHistoryStorage(),
  sessionStore,
  stats: new StatsStorage(
    new UserStorage(),
    new ClientStorage(),
    new ProductStorage(),
    new OrderStorage()
  ),
  // Outros storages serão adicionados aqui futuramente
}; 