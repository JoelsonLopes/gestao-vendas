import { useState } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

// Charts colors
const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

// Interface para tipagem dos dados
interface DashboardStats {
  orders?: {
    total: number;
    confirmed: number;
    quotation: number;
    totalValue: number;
  };
  clients?: {
    total: number;
    active: number;
  };
}

interface Order {
  clientCode: string;
  id: number;
  clientId: number;
  clientName: string;
  date: string;
  status: string;
  total: number;
  totalPieces: number;
}

interface Representative {
  id: number;
  name: string;
  totalOrders: number;
  confirmedOrders: number;
  totalPieces: number;
  totalValue: number;
  totalCommission: number;
}

interface Product {
  id: number;
  code: string;
  name: string;
  brand: string;
  totalPieces: number;
  totalValue: number;
  totalCommission: number;
}

interface Brand {
  id: number;
  name: string;
  totalPieces: number;
  totalValue: number;
}

export default function ReportsPage() {
  const [reportPeriod, setReportPeriod] = useState<string>("month");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  
  // Fetch dashboard stats for summary data
  const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
  });
  
  // Fetch orders for sales report
  const { data: orders, isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });
  
  // Fetch sales by representative
  const { data: salesByRep, isLoading: isLoadingSalesByRep } = useQuery<Representative[]>({
    queryKey: ["/api/stats/sales-by-representative"],
  });
  
  // Fetch sales by brand
  const { data: salesByBrand, isLoading: isLoadingSalesByBrand } = useQuery<Brand[]>({
    queryKey: ["/api/stats/sales-by-brand"],
  });
  
  // Fetch top selling products
  const { data: topProducts, isLoading: isLoadingTopProducts } = useQuery<Product[]>({
    queryKey: ["/api/stats/top-selling-products"],
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
  
  // Prepare data for brand chart (Top 10 brands)
  const brandData = salesByBrand ? salesByBrand.slice(0, 10) : [];
  
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
            <TabsTrigger value="brands">Vendas por Marca</TabsTrigger>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Status dos Pedidos</h3>
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
                              label={({ name, percent }: {name: string, percent: number}) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {orderStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => [`${value} pedidos`, 'Quantidade']} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Resumo Financeiro</h3>
                    {isLoadingStats ? (
                      <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Total em Vendas</p>
                          <p className="text-2xl font-bold">{formatCurrency(stats?.orders?.totalValue || 0)}</p>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Total de Pedidos</p>
                          <p className="text-2xl font-bold">{stats?.orders?.total || 0}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-medium mb-4">Últimos Pedidos</h3>
                {isLoadingOrders ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 text-left font-medium text-muted-foreground">Cliente e Código</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">Data</th>
                          <th className="p-3 text-center font-medium text-muted-foreground">Total de Peças</th>
                          <th className="p-3 text-right font-medium text-muted-foreground">Total</th>
                          <th className="p-3 text-center font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(orders) && orders.slice(0, 10).map((order) => (
                          <tr key={order.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="p-3 text-left">
                              {/* Mostrar nome do cliente e código do pedido */}
                              <div className="font-medium">{order.clientName || 'Cliente'}</div>
                              <div className="text-sm text-muted-foreground">Cód: {order.clientCode || ''}</div>
                            </td>
                            <td className="p-3 text-left">{order.date}</td>
                            <td className="p-3 text-center">{order.totalPieces || 0}</td>
                            <td className="p-3 text-right">{formatCurrency(order.total)}</td>
                            <td className="p-3 text-center">
                              <Badge variant={order.status === 'confirmado' ? "success" : "default"}>
                                {order.status === 'confirmado' ? 'Confirmado' : 'Cotação'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Representatives Report */}
          <TabsContent value="representatives" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Desempenho dos Representantes</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSalesByRep ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Vendas por Representante</h3>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={salesByRep || []}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip formatter={(value: any, name: any) => [
                                name === "totalValue" ? formatCurrency(Number(value)) : value,
                                name === "totalValue" ? "Valor Total" : 
                                name === "totalPieces" ? "Total de Peças" : 
                                name === "confirmedOrders" ? "Pedidos Confirmados" : 
                                "Total de Pedidos"
                              ]} />
                              <Legend 
                                formatter={(value: string) => (
                                  value === "totalValue" ? "Valor Total" : 
                                  value === "totalPieces" ? "Total de Peças" : 
                                  value === "confirmedOrders" ? "Pedidos Confirmados" : 
                                  "Total de Pedidos"
                                )}
                              />
                              <Bar dataKey="totalValue" fill="#3b82f6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-4">Peças Vendidas por Representante</h3>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={salesByRep || []}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip formatter={(value: any) => [value, "Total de Peças"]} />
                              <Legend />
                              <Bar dataKey="totalPieces" fill="#22c55e" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-3 text-left font-medium text-muted-foreground">Nome</th>
                            <th className="p-3 text-center font-medium text-muted-foreground">Total de Pedidos</th>
                            <th className="p-3 text-center font-medium text-muted-foreground">Pedidos Confirmados</th>
                            <th className="p-3 text-center font-medium text-muted-foreground">Total de Peças</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Valor Total</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Comissão Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(salesByRep) && salesByRep.map((rep) => (
                            <tr key={rep.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-3 text-left font-medium">{rep.name}</td>
                              <td className="p-3 text-center">{rep.totalOrders}</td>
                              <td className="p-3 text-center">{rep.confirmedOrders}</td>
                              <td className="p-3 text-center">{rep.totalPieces}</td>
                              <td className="p-3 text-right">{formatCurrency(rep.totalValue)}</td>
                              <td className="p-3 text-right">{formatCurrency(rep.totalCommission)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                {isLoadingTopProducts ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Top 10 Produtos por Quantidade</h3>
                        <div className="h-96">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={topProducts?.slice(0, 10) || []}
                              layout="vertical"
                              margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis 
                                type="category" 
                                dataKey="name" 
                                tickFormatter={(value: string) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                                width={140}
                              />
                              <Tooltip formatter={(value: any, name: any) => [value, "Quantidade Vendida"]} />
                              <Legend />
                              <Bar dataKey="totalPieces" fill="#3b82f6" name="Quantidade Vendida" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-4">Top 10 Produtos por Valor</h3>
                        <div className="h-96">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={Array.isArray(topProducts) 
                                ? [...topProducts]
                                  .sort((a, b) => b.totalValue - a.totalValue)
                                  .slice(0, 10)
                                : []}
                              layout="vertical"
                              margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis 
                                type="category" 
                                dataKey="name" 
                                tickFormatter={(value: string) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                                width={140}
                              />
                              <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), "Valor Total"]} />
                              <Legend />
                              <Bar dataKey="totalValue" fill="#ef4444" name="Valor Total" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-3 text-left font-medium text-muted-foreground">Código</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Nome</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Marca</th>
                            <th className="p-3 text-center font-medium text-muted-foreground">Quantidade Vendida</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Valor Total</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Comissão</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(topProducts) && topProducts.map((product) => (
                            <tr key={product.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-3 text-left">{product.code}</td>
                              <td className="p-3 text-left">{product.name}</td>
                              <td className="p-3 text-left">{product.brand || 'Sem Marca'}</td>
                              <td className="p-3 text-center">{product.totalPieces}</td>
                              <td className="p-3 text-right">{formatCurrency(product.totalValue)}</td>
                              <td className="p-3 text-right">{formatCurrency(product.totalCommission)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Brands Report */}
          <TabsContent value="brands" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Marca</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSalesByBrand ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Top 10 Marcas por Quantidade</h3>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={brandData || []}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip formatter={(value: any, name: any) => [value, "Quantidade Vendida"]} />
                              <Legend />
                              <Bar dataKey="totalPieces" fill="#3b82f6" name="Quantidade Vendida" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-4">Top 10 Marcas por Valor</h3>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                dataKey="totalValue"
                                data={brandData}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                label={(entry: any) => entry.name}
                              >
                                {brandData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), "Valor Total"]} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-3 text-left font-medium text-muted-foreground">Marca</th>
                            <th className="p-3 text-center font-medium text-muted-foreground">Quantidade Vendida</th>
                            <th className="p-3 text-right font-medium text-muted-foreground">Valor Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(salesByBrand) && salesByBrand.map((brand) => (
                            <tr key={brand.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-3 text-left font-medium">{brand.name}</td>
                              <td className="p-3 text-center">{brand.totalPieces}</td>
                              <td className="p-3 text-right">{formatCurrency(brand.totalValue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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