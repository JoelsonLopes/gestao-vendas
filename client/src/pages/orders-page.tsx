import { useState, useRef } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DataTable } from "@/components/data-table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, PlusCircle, Filter, FileDown, Printer, Edit, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Order, Client, OrderItem } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PdfTemplate } from "@/components/pdf-template";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

export default function OrdersPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  
  // PDF modal state
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Estado para o modal de confirmação de exclusão
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  
  // Fetch orders
  const { data: orders, isLoading: isLoadingOrders, refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    staleTime: 0, // Sempre verificar por novos dados
    refetchOnMount: true, // Recarregar quando o componente montar
    refetchInterval: false, // Não recarregar automaticamente em intervalos
  });
  
  // Estado para armazenar informações de itens por pedido (quantidade total de peças e comissão)
  const [orderItemsMap, setOrderItemsMap] = useState<{[orderId: number]: {totalItems: number, totalCommission: number}}>({});
  
  // Fetch clients for filter
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  // Fetch discounts for display in pdf
  const { data: discounts } = useQuery<any[]>({
    queryKey: ["/api/discounts"],
  });
  
  // Buscar e calcular os totais de itens e comissão para cada pedido
  useQuery({
    queryKey: ["orderItemsCalculation"],
    queryFn: async () => {
      if (!orders || orders.length === 0) return {};
      
      const newOrderItemsMap: {[orderId: number]: {totalItems: number, totalCommission: number}} = {};
      
      // Para cada pedido, buscar seus itens
      for (const order of orders) {
        try {
          const response = await fetch(`/api/orders/${order.id}/items`);
          const orderItems: OrderItem[] = await response.json();
          
          if (orderItems && orderItems.length > 0) {
            // Calcular total de peças (soma das quantidades)
            const totalItems = orderItems.reduce((sum, item) => {
              const quantity = Number(item.quantity);
              return sum + quantity;
            }, 0);
            
            // Calcular comissão total
            let totalCommission = 0;
            if (order.status === 'confirmado') {
              totalCommission = orderItems.reduce((sum, item) => {
                const unitPrice = Number(item.unitPrice || 0);
                const quantity = Number(item.quantity || 0);
                const commission = Number(item.commission || 0);
                const discountPercentage = Number(item.discountPercentage || 0);
                
                // Calcular o preço com desconto
                const discountedPrice = unitPrice * (1 - discountPercentage / 100);
                
                // Calcular a comissão sobre o preço COM desconto
                const itemCommission = discountedPrice * quantity * commission / 100;
                return sum + itemCommission;
              }, 0);
            }
            
            newOrderItemsMap[order.id] = { totalItems, totalCommission };
          }
        } catch (error) {
          console.error(`Erro ao buscar itens do pedido ${order.id}:`, error);
        }
      }
      
      setOrderItemsMap(newOrderItemsMap);
      return newOrderItemsMap;
    },
    enabled: !!orders && orders.length > 0,
  });
  
  // Fetch order items for selected order
  const { data: selectedOrderItems } = useQuery<OrderItem[]>({
    queryKey: ["/api/orders", selectedOrder?.id, "items"],
    enabled: !!selectedOrder,
  });
  
  // Fetch product info for order items
  const { data: products } = useQuery<any[]>({
    queryKey: ["/api/products"],
    enabled: !!selectedOrder
  });
  
  // Fetch order details (including client info) for PDF
  const { data: orderWithItems, isLoading: isLoadingOrderDetails } = useQuery<any>({
    queryKey: ["/api/orders/details", selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) return { order: null, items: [] };
      
      // Get full order details
      const client = clients?.find(c => c.id === selectedOrder.clientId);
      
      if (!client || !selectedOrderItems) {
        return { order: null, items: [] };
      }
      
      // Prepare order items with product info
      const itemsWithProducts = selectedOrderItems.map(item => {
        const product = products?.find(p => p.id === item.productId);
        return {
          ...item,
          product
        };
      });
      
      // Format data for PDF
      return {
        order: {
          id: selectedOrder.id,
          clientName: client.name,
          clientCnpj: client.cnpj || "-",
          date: formatDate(selectedOrder.createdAt || ""),
          status: selectedOrder.status,
          paymentTerms: selectedOrder.paymentTerms || "À vista",
          subtotal: Number(selectedOrder.subtotal || 0),
          discount: Number(selectedOrder.discount || 0),
          taxes: Number(selectedOrder.taxes || 0),
          total: Number(selectedOrder.total || 0),
          representative: "Representante", // Este valor seria melhor obtido do usuário atual
          totalCommission: selectedOrder.status === 'confirmado' ? 
            // Calcular o total de comissão baseado nos itens do pedido
            selectedOrderItems?.reduce((total, item) => {
              // Converter strings para números para garantir que a operação é feita corretamente
              const quantity = Number(item.quantity);
              const unitPrice = Number(item.unitPrice || 0);
              const discountPercentage = Number(item.discountPercentage || 0);
              const commission = Number(item.commission || 0);
              
              // Calcular o preço com desconto
              const discountedPrice = unitPrice * (1 - discountPercentage / 100);
              
              // Calcular a comissão com base no preço com desconto
              return total + (quantity * discountedPrice * commission / 100);
            }, 0)
            : undefined
        },
        items: itemsWithProducts.map(item => {
          // Buscar o desconto selecionado
          const discount = item.discountId && discounts ? discounts.find((d: any) => d.id === item.discountId) : null;
          
          return {
            id: item.id,
            name: item.product ? item.product.name : `Produto #${item.productId}`,
            code: item.product ? item.product.code : `${item.productId}`,
            clientRef: item.product ? item.product.conversion : null,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discountPercentage || 0),
            subtotal: Number(item.subtotal),
            discountName: discount ? discount.name : null,
            commission: Number(item.commission || 0)
          };
        })
      };
    },
    enabled: !!selectedOrder && !!selectedOrderItems && !!products
  });
  
  const clearFilters = () => {
    setStatusFilter("all");
    setClientFilter("all");
    setDateFromFilter("");
    setDateToFilter("");
  };
  
  // Apply filters
  const filteredOrders = orders?.filter(order => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesClient = clientFilter === "all" || order.clientId.toString() === clientFilter;
    
    let matchesDateFrom = true;
    if (dateFromFilter) {
      const orderDate = new Date(order.createdAt || "");
      const fromDate = new Date(dateFromFilter);
      matchesDateFrom = orderDate >= fromDate;
    }
    
    let matchesDateTo = true;
    if (dateToFilter) {
      const orderDate = new Date(order.createdAt || "");
      const toDate = new Date(dateToFilter);
      // Set time to end of day
      toDate.setHours(23, 59, 59, 999);
      matchesDateTo = orderDate <= toDate;
    }
    
    return matchesStatus && matchesClient && matchesDateFrom && matchesDateTo;
  });
  
  const navigateToNewOrder = () => {
    setLocation("/orders/new");
  };
  
  const navigateToOrderDetails = (order: Order) => {
    setLocation(`/orders/${order.id}`);
  };
  
  const handleViewPdf = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que a linha seja clicada
    setSelectedOrder(order);
    setShowPdfPreview(true);
  }
  
  const handleClosePdfPreview = () => {
    setShowPdfPreview(false);
    // Limpamos o pedido selecionado após um pequeno delay para evitar flash durante o fechamento do modal
    setTimeout(() => setSelectedOrder(null), 300);
  };
  
  // Mutation para excluir pedido
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await apiRequest("DELETE", `/api/orders/${orderId}`);
    },
    onSuccess: () => {
      toast({
        title: "Pedido excluído com sucesso",
        description: "O pedido foi removido do sistema.",
        variant: "default"
      });
      
      // Garantir que a lista seja atualizada após a exclusão
      setTimeout(() => {
        // Invalidar o cache e forçar um reload
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        queryClient.invalidateQueries({ queryKey: ["orderItemsCalculation"] });
        
        // Forçar um refetch explícito também
        refetch();
      }, 500);
    },
    onError: (error) => {
      console.error("Erro ao excluir pedido:", error);
      toast({
        title: "Erro ao excluir pedido",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir o pedido.",
        variant: "destructive"
      });
    }
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Pedidos</h1>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => refetch()} title="Atualizar lista">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M8 16H3v5"></path>
              </svg>
              Atualizar
            </Button>
            <Button onClick={navigateToNewOrder}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Pedido
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="cotacao">Cotação</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="client">Cliente</Label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients?.map(client => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="dateFrom">Data Inicial</Label>
                <Input 
                  type="date" 
                  id="dateFrom" 
                  value={dateFromFilter}
                  onChange={e => setDateFromFilter(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="dateTo">Data Final</Label>
                <Input 
                  type="date" 
                  id="dateTo" 
                  value={dateToFilter}
                  onChange={e => setDateToFilter(e.target.value)}
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={clearFilters} className="mr-2">
                Limpar Filtros
              </Button>
              <Button>
                <Filter className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Orders Table */}
        {isLoadingOrders ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <DataTable
            columns={[
              {
                header: "Pedido",
                accessorKey: "id",
                cell: (order) => `#${order.id}`,
                sortable: true,
              },
              {
                header: "Cliente",
                accessorKey: "clientId",
                cell: (order) => {
                  const client = clients?.find(c => c.id === order.clientId);
                  return client ? client.name : `Cliente #${order.clientId}`;
                },
                sortable: true,
              },
              {
                header: "Data",
                accessorKey: "createdAt",
                cell: (order) => formatDate(order.createdAt || new Date().toISOString()),
                sortable: true,
              },
              {
                header: "Status",
                accessorKey: "status",
                cell: (order) => (
                  <Badge className={order.status === "confirmado" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"}>
                    {order.status === "confirmado" ? "Confirmado" : "Cotação"}
                  </Badge>
                ),
                sortable: true,
              },
              // Coluna oculta para ordenação automática por data de atualização
              {
                header: "",
                accessorKey: "updatedAt",
                cell: () => null,
                sortable: true,
                // @ts-ignore - adiciona propriedade personalizada para ocultar coluna
                hidden: true,
              },
              {
                header: "Qtd. Peças",
                accessorKey: "id", // Usamos id como acessor, pois não temos uma propriedade de qtd na tabela
                cell: (order) => {
                  const orderDetails = orderItemsMap[order.id];
                  return orderDetails ? orderDetails.totalItems : "-";
                },
                sortable: false,
              },
              {
                header: "Total",
                accessorKey: "total",
                cell: (order) => formatCurrency(Number(order.total)),
                sortable: true,
              },
              {
                header: "Comissão",
                accessorKey: "id", // Usamos id como acessor
                cell: (order) => {
                  if (order.status !== 'confirmado') return "-";
                  const orderDetails = orderItemsMap[order.id];
                  return orderDetails ? formatCurrency(orderDetails.totalCommission) : "-";
                },
                sortable: false,
              },
              {
                header: "Ações",
                accessorKey: "id", // Usando "id" ao invés de "actions" para evitar erro de tipo
                cell: (order) => (
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      title="Editar"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/orders/${order.id}`);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                      title="Excluir"
                      disabled={deleteOrderMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Abrir o modal de confirmação
                        setOrderToDelete(order);
                        setShowDeleteConfirm(true);
                      }}
                    >
                      {deleteOrderMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span className="sr-only">Excluir</span>
                    </Button>
                  </div>
                ),
              },
            ]}
            data={filteredOrders || []}
            keyField="id"
            searchable
            searchPlaceholder="Buscar pedidos..."
            onRowClick={navigateToOrderDetails}
            initialSortColumn="updatedAt"
            initialSortDirection="desc"
          />
        )}
      </div>
      
      {/* Modal para visualização do PDF */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Visualização para Impressão - Pedido #{selectedOrder?.id}
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingOrderDetails ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orderWithItems && orderWithItems.order ? (
            <div className="relative">
              <div className="mt-4 flex justify-end absolute top-[-30px] right-0 z-10">
                <Button
                  variant="default"
                  onClick={() => {
                    window.print();
                  }}
                  className="print:hidden"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
              </div>
              <div className="p-4 max-h-[70vh] overflow-auto bg-white rounded-md">
                <PdfTemplate
                  order={orderWithItems.order}
                  items={orderWithItems.items}
                  onClose={handleClosePdfPreview}
                />
              </div>
            </div>
          ) : (
            <p>Não foi possível carregar os detalhes do pedido.</p>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Conteúdo oculto para impressão direta */}
      <div className="hidden print:block">
        {orderWithItems && orderWithItems.order && (
          <PdfTemplate
            order={orderWithItems.order}
            items={orderWithItems.items}
            onClose={() => {}}
          />
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pedido #{orderToDelete?.id}?<br />
              Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (orderToDelete) {
                  deleteOrderMutation.mutate(orderToDelete.id);
                }
                setShowDeleteConfirm(false);
              }}
              disabled={deleteOrderMutation.isPending}
            >
              {deleteOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Sim, excluir pedido"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
