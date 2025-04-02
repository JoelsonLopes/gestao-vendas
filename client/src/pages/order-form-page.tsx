import { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ClientSearch } from "@/components/client-search";
import { ProductSearch } from "@/components/product-search";
import {
  Loader2,
  Save,
  Check,
  FileDown,
  ArrowLeft,
  PlusCircle,
  Trash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Select, 
  SelectContent, 
  SelectGroup,
  SelectItem, 
  SelectLabel,
  SelectSeparator,
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { DiscountSelect } from "@/components/discount-select";
import { PdfTemplate } from "@/components/pdf-template";
import { formatCurrency, calculateDiscountedPrice } from "@/lib/utils";
import { Client, Product, Order, OrderItem, InsertOrder, InsertOrderItem } from "@shared/schema";

export default function OrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditMode = !!id;
  
  // Order form state
  const [clientId, setClientId] = useState<number | null>(null);
  const [status, setStatus] = useState<"cotacao" | "confirmado">("cotacao");
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  
  // Order items state
  const [orderItems, setOrderItems] = useState<Array<{
    id?: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    discountId: number | null;
    discountPercentage: number;
    commission: number;
    subtotal: number;
    product?: Product;
  }>>([]);
  
  // UI state
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get clients
  const clientsQuery = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  const clients = clientsQuery.data || [];
  const isLoadingClients = clientsQuery.isLoading;
  
  // Logger para debug - executado apenas uma vez quando os dados carregarem
  useEffect(() => {
    if (clients && clients.length > 0) {
      console.log(`Clientes carregados: ${clients.length}`);
      
      // Log de alguns clientes para verificação
      console.log("Exemplos de clientes:", clients.slice(0, 5).map(client => ({
        id: client.id,
        name: client.name,
        code: client.code
      })));
      
      // Verificar se temos cliente com código específico
      const cliente8028 = clients.find(client => client.code === "8028");
      if (cliente8028) {
        console.log("Cliente 8028 encontrado:", cliente8028);
      } else {
        console.log("Cliente 8028 NÃO encontrado nos dados carregados");
        
        // Listar alguns códigos de clientes para verificação
        const sampleCodes = clients.slice(0, 20).map(c => c.code);
        console.log("Alguns códigos de clientes disponíveis:", sampleCodes);
      }
    }
  }, [clients.length]);
  
  // Get products
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // Get order details if in edit mode
  const { data: orderDetails, isLoading: isLoadingOrderDetails } = useQuery<{ order: Order, items: OrderItem[] }>({
    queryKey: ["/api/orders", id],
    enabled: isEditMode,
  });
  
  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: { order: InsertOrder; items: Omit<InsertOrderItem, "orderId">[] }) => {
      const response = await apiRequest("POST", "/api/orders", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Pedido criado",
        description: "Pedido foi criado com sucesso",
      });
      navigate("/orders");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao criar pedido: ${error.message}`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });
  
  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "cotacao" | "confirmado" }) => {
      const response = await apiRequest("PUT", `/api/orders/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      toast({
        title: "Status atualizado",
        description: "Status do pedido foi atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar status: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Load order data if in edit mode
  useEffect(() => {
    if (isEditMode && orderDetails) {
      const { order, items } = orderDetails;
      
      setClientId(order.clientId);
      setStatus(order.status);
      setPaymentTerms(order.paymentTerms || "");
      setNotes(order.notes || "");
      
      // Map order items with product details
      const mappedItems = items.map((item: OrderItem) => {
        const product = products?.find(p => p.id === item.productId);
        return {
          ...item,
          // Converter strings para números
          unitPrice: typeof item.unitPrice === 'string' ? Number(item.unitPrice) : item.unitPrice,
          quantity: typeof item.quantity === 'string' ? Number(item.quantity) : item.quantity,
          discountPercentage: typeof item.discountPercentage === 'string' ? Number(item.discountPercentage) : item.discountPercentage,
          commission: typeof item.commission === 'string' ? Number(item.commission) : item.commission,
          subtotal: typeof item.subtotal === 'string' ? Number(item.subtotal) : item.subtotal,
          product,
        };
      });
      
      setOrderItems(mappedItems);
    }
  }, [isEditMode, orderDetails, products]);
  
  // Calculate order totals
  const calculateTotals = () => {
    // O subtotal é a soma dos subtotais de cada item (que já incluem o desconto)
    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Não precisamos calcular desconto separadamente, pois já está incluído no preço unitário
    // O total é simplesmente o subtotal + impostos
    const taxes = 0; // Calcularia impostos se necessário
    const total = subtotal + taxes;
    
    console.log(`
      Resumo do pedido:
      - Subtotal (com desconto): ${formatCurrency(subtotal)}
      - Impostos: ${formatCurrency(taxes)}
      - Total: ${formatCurrency(total)}
    `);
    
    return {
      subtotal: Number(subtotal.toFixed(2)),
      taxes: Number(taxes.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  };
  
  const totals = calculateTotals();
  
  // Add product to order
  const addProductToOrder = () => {
    if (!selectedProductId || productQuantity <= 0) return;
    
    const product = products?.find(p => p.id === selectedProductId);
    if (!product) return;
    
    // Inicialmente sem desconto
    const unitPrice = Number(product.price);
    const discountPercentage = 0;
    
    // Cálculo do preço com desconto (neste caso, sem desconto ainda)
    const discountedUnitPrice = calculateDiscountedPrice(unitPrice, discountPercentage);
    
    // Subtotal baseado no preço unitário já com desconto (que neste momento é igual ao preço original)
    const subtotal = Number((productQuantity * discountedUnitPrice).toFixed(2));
    
    console.log(`
      Adicionando produto:
      - Produto: ${product.name} (${product.code})
      - Preço original: ${formatCurrency(unitPrice)}
      - Quantidade: ${productQuantity}
      - Subtotal: ${formatCurrency(subtotal)}
    `);
    
    const newItem = {
      productId: selectedProductId,
      quantity: productQuantity,
      unitPrice: unitPrice,
      discountId: null,
      discountPercentage: discountPercentage,
      commission: 0,
      subtotal: subtotal,
      product,
    };
    
    setOrderItems([...orderItems, newItem]);
    setAddProductModalOpen(false);
    setSelectedProductId(null);
    setProductQuantity(1);
  };
  
  // Remove product from order
  const removeOrderItem = (index: number) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };
  
  // Update item discount
  const updateItemDiscount = (index: number, discountId: number | null, discountPercentage: number, commission: number) => {
    const newItems = [...orderItems];
    const item = newItems[index];
    
    // Calcular o preço unitário com desconto primeiro
    const discountedUnitPrice = calculateDiscountedPrice(item.unitPrice, discountPercentage);
    
    // Calcular o subtotal com base no preço unitário já com desconto
    const discountedSubtotal = Number((item.quantity * discountedUnitPrice).toFixed(2));
    
    console.log(`
      Aplicando desconto:
      - Produto: ${item.product?.name} (${item.product?.code})
      - Preço original: ${formatCurrency(item.unitPrice)}
      - Desconto: ${discountPercentage}%
      - Preço com desconto: ${formatCurrency(discountedUnitPrice)}
      - Quantidade: ${item.quantity}
      - Subtotal: ${formatCurrency(discountedSubtotal)}
      - Comissão: ${commission}%
    `);
    
    newItems[index] = {
      ...item,
      discountId,
      discountPercentage,
      commission,
      subtotal: discountedSubtotal,
    };
    
    setOrderItems(newItems);
  };
  
  // Update item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    
    const newItems = [...orderItems];
    const item = newItems[index];
    
    // Pegar o preço unitário com desconto
    const discountedUnitPrice = calculateDiscountedPrice(item.unitPrice, item.discountPercentage);
    
    // Recalcular subtotal com base no preço unitário já com desconto
    const discountedSubtotal = Number((quantity * discountedUnitPrice).toFixed(2));
    
    console.log(`
      Atualizando quantidade:
      - Produto: ${item.product?.name} (${item.product?.code})
      - Preço original: ${formatCurrency(item.unitPrice)}
      - Desconto: ${item.discountPercentage}%
      - Preço com desconto: ${formatCurrency(discountedUnitPrice)}
      - Nova quantidade: ${quantity}
      - Novo subtotal: ${formatCurrency(discountedSubtotal)}
    `);
    
    newItems[index] = {
      ...item,
      quantity,
      subtotal: discountedSubtotal,
    };
    
    setOrderItems(newItems);
  };
  
  // Save order
  const saveOrder = async () => {
    if (!clientId || orderItems.length === 0) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, selecione um cliente e adicione pelo menos um produto ao pedido.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    const orderData: InsertOrder = {
      clientId,
      representativeId: user!.id,
      status,
      paymentTerms,
      subtotal: totals.subtotal.toString(), // Convertido para string conforme esperado pelo InsertOrder
      discount: "0", // Desconto zero como string
      taxes: totals.taxes.toString(), // Convertido para string conforme esperado pelo InsertOrder
      total: totals.total.toString(), // Convertido para string conforme esperado pelo InsertOrder
      notes,
    };
    
    const itemsData = orderItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(), // Convertido para string
      discountId: item.discountId,
      discountPercentage: item.discountPercentage.toString(), // Convertido para string
      commission: item.commission.toString(), // Convertido para string
      subtotal: item.subtotal.toString(), // Convertido para string
    }));
    
    createOrderMutation.mutate({ order: orderData, items: itemsData });
  };
  
  // Update order status
  const updateOrderStatus = (newStatus: "cotacao" | "confirmado") => {
    if (!isEditMode || !id) return;
    
    updateOrderStatusMutation.mutate({
      id: parseInt(id),
      status: newStatus,
    });
  };
  
  // Prepare data for PDF preview
  const preparePdfData = () => {
    const client = clients?.find(c => c.id === clientId);
    
    return {
      order: {
        id: isEditMode ? parseInt(id!) : 0,
        clientName: client?.name || "Cliente não selecionado",
        clientCnpj: client?.cnpj || "",
        date: new Date().toISOString(),
        status: status,
        paymentTerms: paymentTerms || "À vista",
        subtotal: totals.subtotal,
        discount: 0, // Não temos mais desconto separado
        taxes: totals.taxes,
        total: totals.total,
        representative: user?.name || "",
      },
      items: orderItems.map(item => ({
        id: item.productId,
        name: item.product?.name || `Produto #${item.productId}`,
        code: item.product?.code || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discountPercentage,
        subtotal: item.subtotal,
      })),
    };
  };
  
  // Loading state
  const isLoading = isLoadingClients || isLoadingProducts || (isEditMode && isLoadingOrderDetails);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => navigate("/orders")} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {isEditMode ? `Pedido #${id}` : "Novo Pedido"}
            </h1>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowPdfPreview(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              Visualizar PDF
            </Button>
            
            {isEditMode ? (
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white" 
                disabled={status === "confirmado"} 
                onClick={() => updateOrderStatus("confirmado")}
              >
                <Check className="mr-2 h-4 w-4" />
                Confirmar Pedido
              </Button>
            ) : (
              <Button onClick={saveOrder} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Pedido
              </Button>
            )}
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Detalhes do Pedido</TabsTrigger>
                <TabsTrigger value="products">Produtos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações do Pedido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="client">Cliente *</Label>
                        <ClientSearch
                          clients={clients}
                          selectedClientId={clientId}
                          onClientSelect={setClientId}
                          disabled={isEditMode}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select 
                          value={status} 
                          onValueChange={(value) => setStatus(value as "cotacao" | "confirmado")}
                          disabled={isEditMode}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cotacao">Cotação</SelectItem>
                            <SelectItem value="confirmado">Confirmado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="paymentTerms">Condição de Pagamento</Label>
                        <Select 
                          value={paymentTerms} 
                          onValueChange={setPaymentTerms}
                          disabled={isEditMode}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma condição" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Pagamento Imediato</SelectLabel>
                              <SelectItem value="à vista">À Vista</SelectItem>
                              <SelectItem value="pix">Pix</SelectItem>
                            </SelectGroup>
                            
                            <SelectSeparator />
                            
                            <SelectGroup>
                              <SelectLabel>Boletos</SelectLabel>
                              <SelectItem value="boleto_7d">Boleto Doc 7D</SelectItem>
                              <SelectItem value="boleto_14d">Boleto Doc 14D</SelectItem>
                              <SelectItem value="boleto_14_28d">Boleto Doc 14/28D</SelectItem>
                              <SelectItem value="boleto_28d">Boleto Doc 28D</SelectItem>
                              <SelectItem value="boleto_28_35d">Boleto Doc 28/35D</SelectItem>
                              <SelectItem value="boleto_28_35_42d">Boleto Doc 28/35/42D</SelectItem>
                              <SelectItem value="boleto_28_42_56d">Boleto Doc 28/42/56D</SelectItem>
                              <SelectItem value="boleto_28_56_84d">Boleto Doc 28/56/84D</SelectItem>
                              <SelectItem value="boleto_30d">Boleto Doc 30D</SelectItem>
                              <SelectItem value="boleto_30_45d">Boleto Doc 30/45D</SelectItem>
                              <SelectItem value="boleto_30_45_60d">Boleto Doc 30/45/60D</SelectItem>
                              <SelectItem value="boleto_30_45_60_75d">Boleto Doc 30/45/60/75D</SelectItem>
                              <SelectItem value="boleto_30_45_60_75_90d">Boleto Doc 30/45/60/75/90D</SelectItem>
                              <SelectItem value="boleto_30_60d">Boleto Doc 30/60D</SelectItem>
                              <SelectItem value="boleto_30_60_90d">Boleto Doc 30/60/90D</SelectItem>
                              <SelectItem value="boleto_35d">Boleto Doc 35D</SelectItem>
                              <SelectItem value="boleto_28_35_42_49d">Boleto Doc 28/35/42/49D</SelectItem>
                              <SelectItem value="boleto_28_42_56_70d">Boleto Doc 28/42/56/70D</SelectItem>
                              <SelectItem value="boleto_28_42d">Boleto Doc 28/42</SelectItem>
                              <SelectItem value="boleto_30_60_90_120d">Boleto Doc 30/60/90/120D</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="sm:col-span-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea 
                          placeholder="Observações do pedido" 
                          value={notes} 
                          onChange={(e) => setNotes(e.target.value)}
                          disabled={isEditMode}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="products" className="space-y-4 pt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Produtos do Pedido</CardTitle>
                    <Button onClick={() => setAddProductModalOpen(true)} disabled={isEditMode}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Adicionar Produto
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="relative overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Qtde</TableHead>
                            <TableHead>Valor Unit.</TableHead>
                            <TableHead>Desconto</TableHead>
                            <TableHead>Comissão</TableHead>
                            <TableHead>Subtotal</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-4">
                                Nenhum produto adicionado ao pedido
                              </TableCell>
                            </TableRow>
                          ) : (
                            orderItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  <div>
                                    <p>{item.product?.name || `Produto #${item.productId}`}</p>
                                    <p className="text-xs text-gray-500">{item.product?.code}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    value={item.quantity}
                                    onChange={(e) => updateItemQuantity(index, parseInt(e.target.value))}
                                    className="w-20 h-8"
                                    disabled={isEditMode}
                                  />
                                </TableCell>
                                <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                                <TableCell>
                                  <DiscountSelect
                                    value={item.discountId}
                                    onChange={(discountId, discountPercentage, commission) => 
                                      updateItemDiscount(index, discountId, discountPercentage, commission)
                                    }
                                    label=""
                                    className="w-32"
                                  />
                                </TableCell>
                                <TableCell>{item.commission}%</TableCell>
                                <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                                <TableCell className="text-right">
                                  {!isEditMode && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => removeOrderItem(index)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Order Summary */}
                    {orderItems.length > 0 && (
                      <div className="mt-8 flex justify-end">
                        <div className="w-full sm:w-1/2 lg:w-1/3 bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                          <dl className="space-y-2">
                            <div className="flex justify-between">
                              <dt className="text-sm text-gray-500 dark:text-gray-400">Subtotal (com desconto)</dt>
                              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatCurrency(totals.subtotal)}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-sm text-gray-500 dark:text-gray-400">Impostos</dt>
                              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatCurrency(totals.taxes)}
                              </dd>
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between">
                              <dt className="text-base font-medium text-gray-900 dark:text-white">Total</dt>
                              <dd className="text-base font-medium text-gray-900 dark:text-white">
                                {formatCurrency(totals.total)}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {/* Add Product Modal */}
            <Dialog open={addProductModalOpen} onOpenChange={setAddProductModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Produto</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="product">Produto</Label>
                    <ProductSearch 
                      products={products}
                      selectedProductId={selectedProductId}
                      onProductSelect={setSelectedProductId}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantidade</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={productQuantity}
                      onChange={(e) => setProductQuantity(parseInt(e.target.value))}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddProductModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={addProductToOrder}>
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* PDF Preview Modal */}
            <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Visualização do Pedido em PDF</DialogTitle>
                </DialogHeader>
                
                <PdfTemplate 
                  order={preparePdfData().order}
                  items={preparePdfData().items}
                  onClose={() => setShowPdfPreview(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
