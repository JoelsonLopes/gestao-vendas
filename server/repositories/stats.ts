import { type User, type Client, type Product, type Order, type OrderItem } from "@shared/schema";
import { IClientRepository } from "./client";
import { IProductRepository } from "./product";
import { IOrderRepository } from "./order";
import { IUserRepository } from "./user";

export interface IStatsRepository {
  getOrderStats(representativeId?: number | null): Promise<any>;
  getProductStats(): Promise<any>;
  getClientStats(representativeId?: number | null): Promise<any>;
  getSalesByRepresentative(representativeId?: number | null): Promise<any>;
  getSalesByBrand(representativeId?: number | null): Promise<any>;
  getTopSellingProducts(limit?: number, representativeId?: number | null): Promise<any>;
}

export class StatsRepository implements IStatsRepository {
  constructor(
    private userRepository: IUserRepository,
    private clientRepository: IClientRepository,
    private productRepository: IProductRepository,
    private orderRepository: IOrderRepository
  ) {}

  async getOrderStats(representativeId: number | null = null): Promise<any> {
    let allOrders: Order[];
    if (representativeId) {
      allOrders = await this.orderRepository.listOrdersByRepresentative(representativeId);
    } else {
      allOrders = await this.orderRepository.listOrders();
    }
    const confirmedOrders = allOrders.filter(order => order.status === 'confirmado');
    const quotationOrders = allOrders.filter(order => order.status === 'cotacao');
    return {
      total: allOrders.length,
      confirmed: confirmedOrders.length,
      quotation: quotationOrders.length,
      totalValue: allOrders.reduce((sum, order) => sum + Number(order.total), 0)
    };
  }

  async getProductStats(): Promise<any> {
    const allProducts = await this.productRepository.listProducts();
    const activeProducts = allProducts.filter(product => product.active);
    return {
      total: allProducts.length,
      active: activeProducts.length
    };
  }

  async getClientStats(representativeId: number | null = null): Promise<any> {
    let allClients: Client[];
    if (representativeId) {
      allClients = await this.clientRepository.listClientsByRepresentative(representativeId);
    } else {
      allClients = await this.clientRepository.listClients();
    }
    const activeClients = allClients.filter(client => client.active);
    return {
      total: allClients.length,
      active: activeClients.length
    };
  }

  async getSalesByRepresentative(representativeId: number | null = null): Promise<any> {
    let representatives: User[];
    if (representativeId) {
      const rep = await this.userRepository.getUser(representativeId);
      representatives = rep ? [rep] : [];
    } else {
      representatives = await this.userRepository.listRepresentatives();
    }
    const allOrders = await this.orderRepository.listOrders();
    return await Promise.all(representatives.map(async (rep) => {
      const repOrders = allOrders.filter(order => order.representativeId === rep.id);
      const confirmedOrders = repOrders.filter(order => order.status === 'confirmado');
      let totalPieces = 0;
      let totalCommission = 0;
      for (const order of confirmedOrders) {
        const items = await this.orderRepository.getOrderItems(order.id);
        totalPieces += items.reduce((sum, item) => sum + item.quantity, 0);
        totalCommission += items.reduce((sum, item) => {
          const commission = item.commission ? Number(item.commission) : 0;
          return sum + commission;
        }, 0);
      }
      return {
        id: rep.id,
        name: rep.name,
        totalOrders: repOrders.length,
        confirmedOrders: confirmedOrders.length,
        totalValue: confirmedOrders.reduce((sum, order) => sum + Number(order.total), 0),
        totalPieces: totalPieces,
        totalCommission: totalCommission
      };
    }));
  }

  async getSalesByBrand(representativeId: number | null = null): Promise<any> {
    let confirmedOrders: Order[];
    if (representativeId) {
      const repOrders = await this.orderRepository.listOrdersByRepresentative(representativeId);
      confirmedOrders = repOrders.filter(order => order.status === 'confirmado');
    } else {
      const allOrders = await this.orderRepository.listOrders();
      confirmedOrders = allOrders.filter(order => order.status === 'confirmado');
    }
    const brandMap: Record<string, {
      totalPieces: number;
      totalValue: number;
      totalCommission: number;
      orders: number;
    }> = {};
    for (const order of confirmedOrders) {
      const items = await this.orderRepository.getOrderItems(order.id);
      for (const item of items) {
        const product = await this.productRepository.getProduct(item.productId);
        if (product) {
          const brand = product.brand || 'Sem Marca';
          if (!brandMap[brand]) {
            brandMap[brand] = {
              totalPieces: 0,
              totalValue: 0,
              totalCommission: 0,
              orders: 0
            };
          }
          const subtotal = Number(item.subtotal) || 0;
          const commission = Number(item.commission) || 0;
          brandMap[brand].totalPieces += item.quantity;
          brandMap[brand].totalValue += subtotal;
          brandMap[brand].totalCommission += commission;
          brandMap[brand].orders += 1;
        }
      }
    }
    return Object.entries(brandMap).map(([brand, stats]) => ({
      brand,
      ...stats
    })).sort((a, b) => b.totalPieces - a.totalPieces);
  }

  async getTopSellingProducts(limit: number = 20, representativeId: number | null = null): Promise<any> {
    let confirmedOrders: Order[];
    if (representativeId) {
      const repOrders = await this.orderRepository.listOrdersByRepresentative(representativeId);
      confirmedOrders = repOrders.filter(order => order.status === 'confirmado');
    } else {
      const allOrders = await this.orderRepository.listOrders();
      confirmedOrders = allOrders.filter(order => order.status === 'confirmado');
    }
    const productMap: Record<number, {
      id: number;
      code: string;
      name: string;
      brand: string | null;
      totalPieces: number;
      totalValue: number;
      totalCommission: number;
    }> = {};
    for (const order of confirmedOrders) {
      const items = await this.orderRepository.getOrderItems(order.id);
      for (const item of items) {
        const product = await this.productRepository.getProduct(item.productId);
        if (product) {
          if (!productMap[product.id]) {
            productMap[product.id] = {
              id: product.id,
              code: product.code,
              name: product.name,
              brand: product.brand,
              totalPieces: 0,
              totalValue: 0,
              totalCommission: 0
            };
          }
          const subtotal = Number(item.subtotal) || 0;
          const commission = Number(item.commission) || 0;
          productMap[product.id].totalPieces += item.quantity;
          productMap[product.id].totalValue += subtotal;
          productMap[product.id].totalCommission += commission;
        }
      }
    }
    return Object.values(productMap)
      .sort((a, b) => b.totalPieces - a.totalPieces)
      .slice(0, limit);
  }
} 