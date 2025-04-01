import { DashboardLayout } from "@/layouts/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Order } from "@shared/schema";

export default function DashboardPage() {
  // Fetch dashboard stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/stats/dashboard"],
  });

  // Fetch recent orders
  const { data: orders, isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Fetch sales by representative
  const { data: salesByRep, isLoading: isLoadingSalesByRep } = useQuery({
    queryKey: ["/api/stats/sales-by-representative"],
  });

  const recentOrders = orders?.slice(0, 5) || [];

  // Colors for charts
  const COLORS = ['#3b82f6', '#8b5cf6', '#6d28d9', '#1e40af', '#0f172a'];

  // Prepare data for orders status chart
  const orderStatusData = stats?.orders ? [
    { name: 'Confirmados', value: stats.orders.confirmed },
    { name: 'Cotações', value: stats.orders.quotation }
  ] : [];

  // Prepare data for clients chart
  const clientsData = stats?.clients ? [
    { name: 'Ativos', value: stats.clients.active },
    { name: 'Inativos', value: stats.clients.total - stats.clients.active }
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
        
        {/* Stats Overview */}
        {isLoadingStats ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total de Pedidos"
              value={stats?.orders?.total || 0}
              icon={
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              }
              href="/orders"
            />
            
            <StatsCard
              title="Pedidos Confirmados"
              value={stats?.orders?.confirmed || 0}
              icon={
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="green"
              href="/orders"
            />
            
            <StatsCard
              title="Cotações Pendentes"
              value={stats?.orders?.quotation || 0}
              icon={
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="yellow"
              href="/orders"
            />
            
            <StatsCard
              title="Total de Clientes"
              value={stats?.clients?.total || 0}
              icon={
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              color="purple"
              href="/clients"
            />
          </div>
        )}
        
        {/* Charts */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Orders Status Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Status dos Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        dataKey="value"
                        data={orderStatusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {orderStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} pedidos`, 'Quantidade']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Representative Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Representante</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSalesByRep ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={salesByRep || []}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatCurrency(value as number), 'Total']} />
                      <Bar dataKey="totalValue" fill="#8b5cf6" name="Valor Total" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Pedidos Recentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  },
                  {
                    header: "Cliente",
                    accessorKey: "clientId",
                    cell: (order) => "Cliente #" + order.clientId,
                  },
                  {
                    header: "Data",
                    accessorKey: "createdAt",
                    cell: (order) => new Date(order.createdAt).toLocaleDateString(),
                  },
                  {
                    header: "Status",
                    accessorKey: "status",
                    cell: (order) => (
                      <Badge variant={order.status === "confirmado" ? "success" : "outline"}>
                        {order.status === "confirmado" ? "Confirmado" : "Cotação"}
                      </Badge>
                    ),
                  },
                  {
                    header: "Total",
                    accessorKey: "total",
                    cell: (order) => formatCurrency(Number(order.total)),
                  },
                ]}
                data={recentOrders}
                keyField="id"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
