import { useState } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DataTable } from "@/components/data-table";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PlusCircle, Filter, FileDown, Printer } from "lucide-react";
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

export default function OrdersPage() {
  const [_, setLocation] = useLocation();
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  
  // PDF modal state
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Fetch orders
  const { data: orders, isLoading: isLoadingOrders, refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    staleTime: 0, // Sempre verificar por novos dados
    refetchOnMount: true, // Recarregar quando o componente montar
  });
  
  // Fetch clients for filter
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
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
          representative: "Representante" // Este valor seria melhor obtido do usuário atual
        },
        items: itemsWithProducts.map(item => ({
          id: item.id,
          name: item.product ? item.product.name : `Produto #${item.productId}`,
          code: item.product ? item.product.code : `${item.productId}`,
          clientRef: item.product ? item.product.conversion : null,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discountPercentage || 0),
          subtotal: Number(item.subtotal)
        }))
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Gestão de Pedidos</h1>
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
              {
                header: "Total",
                accessorKey: "total",
                cell: (order) => formatCurrency(Number(order.total)),
                sortable: true,
              },
              {
                header: "Ações",
                accessorKey: "id", // Usando "id" ao invés de "actions" para evitar erro de tipo
                cell: (order) => (
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      title="Imprimir"
                      onClick={(e) => handleViewPdf(order, e)}
                    >
                      <Printer className="h-4 w-4" />
                      <span className="sr-only">Imprimir</span>
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
    </DashboardLayout>
  );
}
