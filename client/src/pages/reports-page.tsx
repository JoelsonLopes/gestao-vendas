import { useState } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Charts colors
const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsPage() {
  const [reportPeriod, setReportPeriod] = useState<string>("month");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  
  // Fetch sales by representative
  const { data: salesByRep, isLoading: isLoadingSalesByRep } = useQuery({
    queryKey: ["/api/stats/sales-by-representative"],
  });
  
  // Fetch dashboard stats for summary data
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/stats/dashboard"],
  });
  
  // Fetch orders for sales report
  const { data: orders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["/api/orders"],
  });
  
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
  
  const handleExportReport = () => {
    // This would be implemented with a real export library like jsPDF or ExcelJS
    alert("Exportação de relatório seria implementada aqui");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Relatórios</h1>
        </div>
        
        <Tabs defaultValue="sales">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="representatives">Representantes</TabsTrigger>
            <TabsTrigger value="products">Produtos Mais Vendidos</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
          </TabsList>
          
          {/* Sales Report */}
          <TabsContent value="sales" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Relatório de Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <Label htmlFor="reportPeriod">Período</Label>
                    <Select value={reportPeriod} onValueChange={setReportPeriod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Esta Semana</SelectItem>
                        <SelectItem value="month">Este Mês</SelectItem>
                        <SelectItem value="quarter">Este Trimestre</SelectItem>
                        <SelectItem value="year">Este Ano</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {reportPeriod === "custom" && (
                    <>
                      <div>
                        <Label htmlFor="dateFrom">Data Inicial</Label>
                        <Input 
                          type="date" 
                          id="dateFrom" 
                          value={dateFrom}
                          onChange={e => setDateFrom(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="dateTo">Data Final</Label>
                        <Input 
                          type="date" 
                          id="dateTo" 
                          value={dateTo}
                          onChange={e => setDateTo(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="flex items-end">
                    <Button onClick={handleExportReport}>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Relatório
                    </Button>
                  </div>
                </div>
                
                {isLoadingOrders ? (
                  <div className="flex justify-center items-center h-64">
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
                        cell: (order) => `Cliente #${order.clientId}`,
                      },
                      {
                        header: "Data",
                        accessorKey: "createdAt",
                        cell: (order) => new Date(order.createdAt).toLocaleDateString(),
                        sortable: true,
                      },
                      {
                        header: "Status",
                        accessorKey: "status",
                        cell: (order) => (
                          <Badge variant={order.status === "confirmado" ? "success" : "warning"}>
                            {order.status === "confirmado" ? "Confirmado" : "Cotação"}
                          </Badge>
                        ),
                      },
                      {
                        header: "Representante",
                        accessorKey: "representativeId",
                        cell: (order) => `Rep #${order.representativeId}`,
                      },
                      {
                        header: "Total",
                        accessorKey: "total",
                        cell: (order) => formatCurrency(Number(order.total)),
                        sortable: true,
                      },
                    ]}
                    data={orders || []}
                    keyField="id"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Representatives Report */}
          <TabsContent value="representatives" className="space-y-4 pt-4">
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
                  <>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={salesByRep || []}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => [formatCurrency(value as number), 'Total']} />
                          <Legend />
                          <Bar dataKey="totalValue" name="Valor Total" fill="#3b82f6" />
                          <Bar dataKey="confirmedOrders" name="Pedidos Confirmados" fill="#22c55e" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="mt-8">
                      <DataTable
                        columns={[
                          {
                            header: "Representante",
                            accessorKey: "name",
                            sortable: true,
                          },
                          {
                            header: "Total de Pedidos",
                            accessorKey: "totalOrders",
                            sortable: true,
                          },
                          {
                            header: "Pedidos Confirmados",
                            accessorKey: "confirmedOrders",
                            sortable: true,
                          },
                          {
                            header: "Total em Vendas",
                            accessorKey: "totalValue",
                            cell: (rep) => formatCurrency(rep.totalValue),
                            sortable: true,
                          },
                        ]}
                        data={salesByRep || []}
                        keyField="id"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Products Report */}
          <TabsContent value="products" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Produtos Mais Vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">
                      Dados sobre produtos mais vendidos seriam exibidos aqui
                    </h3>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Clients Report */}
          <TabsContent value="clients" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Status dos Clientes</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row items-center justify-center gap-8">
                {isLoadingStats ? (
                  <div className="flex justify-center items-center h-64 w-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="h-80 w-full md:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            dataKey="value"
                            data={clientsData}
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            fill="#8884d8"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {clientsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} clientes`, 'Quantidade']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="w-full md:w-1/2 space-y-4">
                      <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
                        <h3 className="text-lg font-medium mb-2">Total de Clientes</h3>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          {stats?.clients?.total || 0}
                        </p>
                      </div>
                      
                      <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
                        <h3 className="text-lg font-medium mb-2">Clientes Ativos</h3>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {stats?.clients?.active || 0}
                        </p>
                      </div>
                      
                      <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
                        <h3 className="text-lg font-medium mb-2">Clientes Inativos</h3>
                        <p className="text-3xl font-bold text-gray-500 dark:text-gray-400">
                          {stats?.clients?.total ? stats.clients.total - stats.clients.active : 0}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
