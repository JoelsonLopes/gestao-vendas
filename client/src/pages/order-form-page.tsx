import { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ClientSearch } from "@/components/client-search";
import {
  Loader2,
  Save,
  Check,
  FileDown,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Edit,
  ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DiscountSelect } from "@/components/discount-select";
import { PdfTemplate } from "@/components/pdf-template";
import { formatCurrency, calculateDiscountedPrice } from "@/lib/utils";
import { Client, Product, Order, OrderItem, InsertOrder, InsertOrderItem } from "@shared/schema";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function OrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditMode = !!id;
  
  // Order form state
  const [clientId, setClientId] = useState<number | null>(null);
  const [status, setStatus] = useState<"cotacao" | "confirmado">("cotacao");
  const [paymentTerms, setPaymentTerms] = useState<string>("à vista");
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
  const [editItemIndex, setEditItemIndex] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productQuantity, setProductQuantity] = useState(1);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get clients
  const clientsQuery = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  const clients = clientsQuery.data || [];
  const isLoadingClients = clientsQuery.isLoading;
  
  // Get products
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // Get discounts
  const { data: discounts, isLoading: isLoadingDiscounts } = useQuery({
    queryKey: ["/api/discounts"],
  });
  
  // Get order details if in edit mode
  const { data: orderDetails, isLoading: isLoadingOrderDetails } = useQuery({
    queryKey: ["/api/orders", id],
    enabled: isEditMode,
  });
  
  // Filtered products based on search query
  const filteredProducts = (products || []).filter(product => {
    if (!productSearchQuery.trim()) return true;
    
    const query = productSearchQuery.toLowerCase().trim();
    return Object.values(product).some(value => {
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(query);
    });
  });
  
  // Calculate order totals
  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = orderItems.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const discountAmount = itemTotal - item.subtotal;
      return sum + discountAmount;
    }, 0);
    const taxes = 0; // Calculate taxes if needed
    const total = subtotal - discount + taxes;
    
    return {
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      taxes: Number(taxes.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  };
  
  const totals = calculateTotals();
  
  // Find selected client
  const selectedClient = clients.find(c => c.id === clientId);
  
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
      setPaymentTerms(order.paymentTerms || "à vista");
      setNotes(order.notes || "");
      
      // Map order items with product details
      const mappedItems = items.map(item => {
        const product = products?.find(p => p.id === item.productId);
        return {
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discountId: item.discountId || null,
          discountPercentage: Number(item.discountPercentage || 0),
          commission: Number(item.commission || 0),
          subtotal: Number(item.subtotal),
          product,
        };
      });
      
      setOrderItems(mappedItems);
    }
  }, [isEditMode, orderDetails, products]);
  
  // Handle add/edit product
  const handleProductConfirm = () => {
    if (!selectedProductId || productQuantity <= 0) {
      toast({
        title: "Dados incompletos",
        description: "Selecione um produto e informe a quantidade",
        variant: "destructive",
      });
      return;
    }
    
    const product = products?.find(p => p.id === selectedProductId);
    if (!product) return;
    
    if (editItemIndex !== null) {
      // Edit existing item
      const newItems = [...orderItems];
      const existingItem = newItems[editItemIndex];
      
      const originalSubtotal = productQuantity * Number(product.price);
      const discountedSubtotal = calculateDiscountedPrice(originalSubtotal, existingItem.discountPercentage);
      
      newItems[editItemIndex] = {
        ...existingItem,
        quantity: productQuantity,
        unitPrice: Number(product.price),
        subtotal: Number(discountedSubtotal.toFixed(2)),
        product,
      };
      
      setOrderItems(newItems);
      setEditItemIndex(null);
    } else {
      // Add new item
      const newItem = {
        productId: selectedProductId,
        quantity: productQuantity,
        unitPrice: Number(product.price),
        discountId: null,
        discountPercentage: 0,
        commission: 0,
        subtotal: Number(product.price) * productQuantity,
        product,
      };
      
      setOrderItems([...orderItems, newItem]);
    }
    
    // Reset product form
    setAddProductModalOpen(false);
    setSelectedProductId(null);
    setProductQuantity(1);
    setProductSearchQuery("");
  };
  
  // Edit product item
  const editOrderItem = (index: number) => {
    const item = orderItems[index];
    
    setEditItemIndex(index);
    setSelectedProductId(item.productId);
    setProductQuantity(item.quantity);
    setAddProductModalOpen(true);
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
    
    const originalSubtotal = item.quantity * item.unitPrice;
    const discountedSubtotal = calculateDiscountedPrice(originalSubtotal, discountPercentage);
    
    newItems[index] = {
      ...item,
      discountId,
      discountPercentage,
      commission,
      subtotal: Number(discountedSubtotal.toFixed(2)),
    };
    
    setOrderItems(newItems);
  };
  
  // Update item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    
    const newItems = [...orderItems];
    const item = newItems[index];
    
    const originalSubtotal = quantity * item.unitPrice;
    const discountedSubtotal = calculateDiscountedPrice(originalSubtotal, item.discountPercentage);
    
    newItems[index] = {
      ...item,
      quantity,
      subtotal: Number(discountedSubtotal.toFixed(2)),
    };
    
    setOrderItems(newItems);
  };
  
  // Save order
  const saveOrder = async () => {
    if (!clientId) {
      toast({
        title: "Cliente não selecionado",
        description: "Por favor, selecione um cliente para o pedido.",
        variant: "destructive",
      });
      return;
    }
    
    if (orderItems.length === 0) {
      toast({
        title: "Pedido vazio",
        description: "Adicione pelo menos um produto ao pedido.",
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
      subtotal: totals.subtotal.toString(),
      discount: totals.discount.toString(),
      taxes: totals.taxes.toString(),
      total: totals.total.toString(),
      notes,
    };
    
    const itemsData = orderItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      discountId: item.discountId,
      discountPercentage: item.discountPercentage.toString(),
      commission: item.commission.toString(),
      subtotal: item.subtotal.toString(),
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
        discount: totals.discount,
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
  const isLoading = isLoadingClients || isLoadingProducts || isLoadingDiscounts || (isEditMode && isLoadingOrderDetails);
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[600px]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando informações do pedido...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => navigate("/orders")} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Pedidos
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {isEditMode ? `Pedido #${id}` : "Novo Pedido"}
            </h1>
            {status === 'confirmado' && (
              <Badge variant="success" className="ml-3">
                Confirmado
              </Badge>
            )}
            {status === 'cotacao' && (
              <Badge variant="secondary" className="ml-3">
                Cotação
              </Badge>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowPdfPreview(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              Visualizar PDF
            </Button>
            
            {isEditMode ? (
              <Button 
                variant="default" 
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cliente e Informações Gerais */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Informações do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <ClientSearch
                    clients={clients}
                    selectedClientId={clientId}
                    onClientSelect={setClientId}
                    disabled={isEditMode}
                  />
                </div>
                
                <div className="space-y-2">
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
                
                <div className="space-y-2">
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
                        <SelectItem value="boleto_28d">Boleto Doc 28D</SelectItem>
                        <SelectItem value="boleto_35d">Boleto Doc 35D</SelectItem>
                        <SelectItem value="boleto_42d">Boleto Doc 42D</SelectItem>
                      </SelectGroup>
                      
                      <SelectSeparator />
                      
                      <SelectGroup>
                        <SelectLabel>Parcelado</SelectLabel>
                        <SelectItem value="2x_boleto">2x Boleto</SelectItem>
                        <SelectItem value="3x_boleto">3x Boleto</SelectItem>
                        <SelectItem value="4x_boleto">4x Boleto</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    placeholder="Instruções especiais, informações adicionais, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    disabled={isEditMode && status === "confirmado"}
                  />
                </div>
              </CardContent>
              {selectedClient && (
                <CardFooter className="border-t pt-4 bg-muted/30">
                  <div className="w-full">
                    <h4 className="font-medium text-sm">Detalhes do Cliente:</h4>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p><span className="font-medium">Nome:</span> {selectedClient.name}</p>
                      {selectedClient.cnpj && <p><span className="font-medium">CNPJ:</span> {selectedClient.cnpj}</p>}
                      {selectedClient.city && <p><span className="font-medium">Cidade:</span> {selectedClient.city}</p>}
                      {selectedClient.phone && <p><span className="font-medium">Telefone:</span> {selectedClient.phone}</p>}
                    </div>
                  </div>
                </CardFooter>
              )}
            </Card>
            
            {/* Resumo */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Descontos:</span>
                  <span>- {formatCurrency(totals.discount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Impostos:</span>
                  <span>{formatCurrency(totals.taxes)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center font-bold">
                  <span>Total:</span>
                  <span className="text-lg">{formatCurrency(totals.total)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Produtos */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Produtos</CardTitle>
                  <CardDescription>
                    {orderItems.length === 0 
                      ? "Nenhum produto adicionado" 
                      : `${orderItems.length} ${orderItems.length === 1 ? 'produto' : 'produtos'} no pedido`}
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    setEditItemIndex(null);
                    setSelectedProductId(null);
                    setProductQuantity(1);
                    setProductSearchQuery("");
                    setAddProductModalOpen(true);
                  }}
                  disabled={isEditMode && status === "confirmado"}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
              </CardHeader>
              <CardContent>
                {orderItems.length === 0 ? (
                  <div className="border rounded-lg border-dashed p-8 text-center">
                    <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium text-muted-foreground">Nenhum produto adicionado</h3>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Clique em "Adicionar Produto" para iniciar o pedido
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setEditItemIndex(null);
                        setSelectedProductId(null);
                        setProductQuantity(1);
                        setProductSearchQuery("");
                        setAddProductModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Produto
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-center">Qtd</TableHead>
                          <TableHead className="text-right">Preço Unit.</TableHead>
                          <TableHead className="text-center">Desconto</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((item, index) => (
                          <TableRow key={index} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {item.product?.code || ""}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p>{item.product?.name || `Produto ${item.productId}`}</p>
                                {item.product?.brand && (
                                  <p className="text-xs text-muted-foreground">{item.product.brand}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                                className="w-16 text-center mx-auto"
                                disabled={isEditMode && status === "confirmado"}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.unitPrice)}
                            </TableCell>
                            <TableCell>
                              <DiscountSelect
                                value={item.discountId}
                                onChange={(discountId, percentage, commission) => 
                                  updateItemDiscount(index, discountId, percentage, commission)
                                }
                                disabled={isEditMode && status === "confirmado"}
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.subtotal)}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => editOrderItem(index)}
                                  disabled={isEditMode && status === "confirmado"}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => removeOrderItem(index)}
                                  disabled={isEditMode && status === "confirmado"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Add Product Modal */}
      <Dialog open={addProductModalOpen} onOpenChange={setAddProductModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editItemIndex !== null ? "Editar Produto" : "Adicionar Produto"}
            </DialogTitle>
            <DialogDescription>
              {editItemIndex !== null 
                ? "Modifique o produto ou a quantidade" 
                : "Busque e adicione um produto ao pedido"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="product">Produto *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedProductId ? (
                      products?.find(p => p.id === selectedProductId)?.name || "Selecione um produto"
                    ) : (
                      "Selecione um produto"
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Busque por nome, código ou marca..."
                      value={productSearchQuery}
                      onValueChange={setProductSearchQuery}
                    />
                    <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                      {filteredProducts.map(product => (
                        <CommandItem
                          key={product.id}
                          value={product.id.toString()}
                          onSelect={() => {
                            setSelectedProductId(product.id);
                            setProductSearchQuery("");
                          }}
                        >
                          <div className="flex flex-col w-full">
                            <div className="flex items-center">
                              <span className="font-medium">{product.name}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                Cód: {product.code}
                              </Badge>
                              {product.brand && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {product.brand}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1 flex justify-between">
                              <span>{product.description || "Sem descrição"}</span>
                              <span className="font-medium">
                                {formatCurrency(Number(product.price))}
                              </span>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={productQuantity}
                onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            
            {selectedProductId && (
              <div className="rounded-lg border p-3 bg-muted/30 mt-4">
                <h4 className="font-medium text-sm mb-2">Detalhes do Produto:</h4>
                {(() => {
                  const product = products?.find(p => p.id === selectedProductId);
                  if (!product) return <p>Produto não encontrado</p>;
                  
                  return (
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Nome:</span> {product.name}</p>
                      <p><span className="font-medium">Código:</span> {product.code}</p>
                      {product.description && (
                        <p><span className="font-medium">Descrição:</span> {product.description}</p>
                      )}
                      <p><span className="font-medium">Preço:</span> {formatCurrency(Number(product.price))}</p>
                      <p>
                        <span className="font-medium">Total:</span> {formatCurrency(Number(product.price) * productQuantity)}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAddProductModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleProductConfirm}
              disabled={!selectedProductId || productQuantity <= 0}
            >
              {editItemIndex !== null ? "Salvar Alterações" : "Adicionar Produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* PDF Preview */}
      {showPdfPreview && (
        <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Visualização do Pedido</DialogTitle>
            </DialogHeader>
            <PdfTemplate
              order={preparePdfData().order}
              items={preparePdfData().items}
              onClose={() => setShowPdfPreview(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}