import { useState } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DataTable } from "@/components/data-table";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PlusCircle, Filter, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Order, Client } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useLocation } from "wouter";

export default function OrdersPage() {
  const [_, setLocation] = useLocation();
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  
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
                    <Button variant="outline" size="sm">
                      <FileDown className="h-4 w-4" />
                      <span className="sr-only">PDF</span>
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
    </DashboardLayout>
  );
}
