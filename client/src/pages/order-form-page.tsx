import { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { useLocation, useRoute } from "wouter";
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
  Trash,
  Search,
  Printer
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
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Usar useRoute para capturar parâmetros de rota
  const [match, params] = useRoute("/orders/:id");
  const id = params?.id;
  const isEditMode = !!id;

  console.log("OrderFormPage - URL atual:", location);
  console.log("OrderFormPage - ID do pedido:", id);
  console.log("OrderFormPage - É modo de edição?", isEditMode);
  
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
  const [clientRef, setClientRef] = useState("");
  const [isSearchingByClientRef, setIsSearchingByClientRef] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totals, setTotals] = useState<{
    subtotal: number;
    taxes: number;
    total: number;
  }>({
    subtotal: 0,
    taxes: 0,
    total: 0,
  });
  
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
  // Get discounts
  const { data: discounts, isLoading: isLoadingDiscounts } = useQuery<any[]>({
    queryKey: ["/api/discounts"],
  });

  // Get products
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // Get order details if in edit mode
  const { data: order, isLoading: isLoadingOrder } = useQuery<Order>({
    queryKey: ["orders", id],
    enabled: isEditMode,
    refetchOnWindowFocus: false,
  });

  // Buscar itens do pedido se estivermos em modo de edição e o pedido foi carregado
  const { data: orderItemsData, isLoading: isLoadingOrderItems } = useQuery<OrderItem[]>({
    queryKey: ["orders", id, "items"],
    enabled: isEditMode && !!order,
    refetchOnWindowFocus: false,
  });

  // Log para depuração
  useEffect(() => {
    if (order) {
      console.log("Detalhes do pedido carregados:", order);
    }
    if (orderItemsData) {
      console.log("Itens do pedido carregados:", orderItemsData);
    }
  }, [order, orderItemsData]);
  
  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: { order: InsertOrder; items: Omit<InsertOrderItem, "orderId">[] }) => {
      const response = await apiRequest("POST", "/api/orders", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
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
      queryClient.invalidateQueries({ queryKey: ["orders", id] });
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
    if (isEditMode && order) {
      console.log("Carregando dados do pedido:", order);
      console.log("Observações do pedido:", order.notes);
      
      setClientId(order.clientId);
      setStatus(order.status as "cotacao" | "confirmado");
      setPaymentTerms(order.paymentTerms || "");
      setNotes(order.notes || "");
    }
  }, [isEditMode, order]);
  
  // Load order items if order is loaded
  useEffect(() => {
    if (isEditMode && orderItemsData && products && Array.isArray(orderItemsData)) {      
      console.log("Processando itens do pedido:", orderItemsData);
      
      // Map order items with product details
      const mappedItems = orderItemsData.map((item: any) => {
        const product = products?.find(p => p.id === item.productId);
        
        // Log detalhado para cada item
        console.log("Processando item:", item, "Produto encontrado:", product);
        
        return {
          id: item.id,
          productId: item.productId,
          // Converter strings para números com valores padrão para evitar nulos
          unitPrice: typeof item.unitPrice === 'string' ? Number(item.unitPrice) : (item.unitPrice || 0),
          quantity: typeof item.quantity === 'string' ? Number(item.quantity) : (item.quantity || 0),
          discountPercentage: typeof item.discountPercentage === 'string' ? Number(item.discountPercentage) : (item.discountPercentage || 0),
          commission: typeof item.commission === 'string' ? Number(item.commission) : (item.commission || 0),
          subtotal: typeof item.subtotal === 'string' ? Number(item.subtotal) : (item.subtotal || 0),
          discountId: item.discountId,
          product,
        };
      });
      
      console.log("Itens mapeados:", mappedItems);
      setOrderItems(mappedItems);
    } else {
      console.log("Não foi possível processar itens do pedido:", {
        isEditMode,
        orderItemsData,
        isArray: Array.isArray(orderItemsData),
        productsLoaded: !!products
      });
    }
  }, [isEditMode, orderItemsData, products]);
  
  // Calculate order totals and update the state
  useEffect(() => {
    // O subtotal é a soma dos subtotais de cada item (que já incluem o desconto)
    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Não precisamos calcular desconto separadamente, pois já está incluído no preço unitário
    // O total é simplesmente o subtotal + taxa de frete
    const taxes = isEditMode && order ? parseFloat(order.taxes || "0") : 0; // Taxa de frete editável pelo usuário
    const total = subtotal + taxes;
    
    console.log(`
      Resumo do pedido:
      - Subtotal (com desconto): ${formatCurrency(subtotal)}
      - Taxa de Frete: ${formatCurrency(taxes)}
      - Total: ${formatCurrency(total)}
    `);
    
    setTotals({
      subtotal: Number(subtotal.toFixed(2)),
      taxes: Number(taxes.toFixed(2)),
      total: Number(total.toFixed(2)),
    });
  }, [orderItems, isEditMode, order]);
  
  // Add product to order
  const addProductToOrder = () => {
    if (!selectedProductId || productQuantity <= 0) return;
    
    const product = products?.find(p => p.id === selectedProductId);
    if (!product) return;
    
    // Se estamos adicionando pela referência do cliente, vamos atualizá-la no produto
    let updatedProduct = {...product};
    if (clientRef && isSearchingByClientRef) {
      updatedProduct.conversion = clientRef;
      console.log("Atualizando produto com referência do cliente:", clientRef);
    } else {
      // Se o produto já tinha uma conversão, mantemos ela
      console.log("Produto já possui conversão:", updatedProduct.conversion);
    }
    
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
      product: updatedProduct, // Usar o produto atualizado com a referência do cliente
    };
    
    setOrderItems([...orderItems, newItem]);
    setAddProductModalOpen(false);
    setSelectedProductId(null);
    setProductQuantity(1);
    setClientRef("");
    setIsSearchingByClientRef(false);
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
  
  // Mutation para atualizar pedido existente
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, order, items }: { id: number, order: InsertOrder, items: any[] }) => {
      console.log(`Enviando requisição para atualizar pedido ${id}:`, { order, items });
      const res = await apiRequest("PUT", `/api/orders/${id}`, { order, items });
      const data = await res.json();
      console.log(`Resposta da atualização do pedido ${id}:`, data);
      return data;
    },
    onSuccess: (data, variables) => {
      const orderId = variables.id;
      console.log(`Sucesso na atualização do pedido ${orderId}`, data);
      
      // Invalidar todos os caches relacionados a este pedido específico
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/items`] });
      
      // Também atualizar diretamente o cache para certeza
      queryClient.setQueryData([`/api/orders/${orderId}`], data.order);
      queryClient.setQueryData([`/api/orders/${orderId}/items`], data.items);
      
      // Forçar atualização explícita do React Query
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/orders"] });
        queryClient.refetchQueries({ queryKey: [`/api/orders/${orderId}`] });
        queryClient.refetchQueries({ queryKey: [`/api/orders/${orderId}/items`] });
      }, 100);
      
      toast({
        title: "Pedido atualizado",
        description: "O pedido foi atualizado com sucesso.",
      });
      navigate("/orders");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar pedido",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });
  
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
    
    if (isEditMode && id) {
      // Atualizar pedido existente
      updateOrderMutation.mutate({ 
        id: parseInt(id), 
        order: orderData, 
        items: itemsData 
      });
    } else {
      // Criar novo pedido
      createOrderMutation.mutate({ order: orderData, items: itemsData });
    }
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
    
    // Obter informações sobre os descontos aplicados
    const orderDiscounts = orderItems.map(item => {
      const discountData = discounts?.find(d => d.id === item.discountId);
      return {
        productId: item.productId,
        discountName: discountData?.name || null,
        commission: discountData?.commission || 0
      };
    });
    
    // Log dos itens com suas referências
    console.log("Preparando dados para PDF, itens do pedido:", 
      orderItems.map(item => ({
        id: item.productId,
        name: item.product?.name,
        clientRef: item.product?.conversion
      }))
    );
    
    // Calcular o total da comissão se o pedido for confirmado
    const totalCommission = status === 'confirmado' 
      ? orderItems.reduce((sum, item) => {
          const totalItem = item.unitPrice * (1 - item.discountPercentage / 100) * item.quantity;
          return sum + (totalItem * (item.commission / 100));
        }, 0)
      : 0;
    
    return {
      order: {
        id: isEditMode ? parseInt(id!) : 0,
        clientId: clientId || undefined,
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
        totalCommission: totalCommission
      },
      items: orderItems.map(item => {
        const discountInfo = orderDiscounts.find(d => d.productId === item.productId);
        return {
          id: item.productId,
          name: item.product?.name || `Produto #${item.productId}`,
          code: item.product?.code || "",
          clientRef: item.product?.conversion || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discountPercentage,
          subtotal: item.subtotal,
          discountName: discountInfo?.discountName,
          commission: item.commission
        };
      }),
    };
  };
  
  // Loading state
  const isLoading = isLoadingClients || isLoadingProducts || (isEditMode && (isLoadingOrder || isLoadingOrderItems));

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
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            
            {isEditMode ? (
              <>
                <Button onClick={saveOrder} disabled={isSubmitting} className="mr-2">
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar Alterações
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white" 
                  disabled={status === "confirmado"} 
                  onClick={() => updateOrderStatus("confirmado")}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar Pedido
                </Button>
              </>
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
        
        {/* Versão para impressão - visível apenas durante a impressão */}
        <div className="hidden print:block print-document">
          <div className="print-header">
            <div className="flex justify-between items-center border-b border-gray-300 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">PEDIDO #{id || 'Novo'}</h1>
                <p className="text-sm text-gray-500">Data: {new Date().toLocaleDateString()}</p>
              </div>
              
              <div className="inline-flex items-center px-3 py-1 rounded">
                <span className="text-sm font-medium">{status === 'confirmado' ? 'CONFIRMADO' : 'COTAÇÃO'}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Cliente</h2>
                <div className="text-gray-800">
                  <p className="font-medium text-base">
                    {clients?.find(c => c.id === clientId)?.name || 'Não selecionado'} (Cód: 
                    {clients?.find(c => c.id === clientId)?.code || '-'})
                  </p>
                  <p className="text-sm text-gray-600">CNPJ: {clients?.find(c => c.id === clientId)?.cnpj || ''}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Data</h2>
                  <p className="text-gray-800">{new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Pagamento</h2>
                  <p className="text-gray-800">{paymentTerms}</p>
                </div>
                <div className="col-span-2">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Representante</h2>
                  <p className="text-gray-800">{user?.name || ''}</p>
                </div>
              </div>
            </div>
          </div>
          
          {notes && (
            <div className="mt-6 mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Observações</h2>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{notes}</p>
            </div>
          )}
          
          <div className="mt-8 print-items">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Itens do Pedido</h2>
            
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref. Cliente</th>
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Preço Unit.</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, index) => {
                  // Cálculo do preço com desconto
                  const priceWithDiscount = item.discountPercentage > 0 
                    ? item.unitPrice * (1 - item.discountPercentage / 100) 
                    : item.unitPrice;
                    
                  // Cálculo do total do item (preço com desconto * quantidade)
                  const totalItem = priceWithDiscount * item.quantity;
                  
                  // Obter informações sobre o desconto aplicado (para pedidos confirmados)
                  const discountInfo = item.discountId ? 
                    discounts?.find(d => d.id === item.discountId) : null;
                    
                  return (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-3 align-middle text-sm">
                        {item.product?.conversion || '-'}
                      </td>
                      <td className="py-3 align-middle text-sm">{item.product?.name}</td>
                      <td className="py-3 align-middle text-sm text-right">{item.quantity}</td>
                      <td className="py-3 align-middle text-sm text-right">{formatCurrency(priceWithDiscount)}</td>
                      <td className="py-3 align-middle text-sm text-right font-medium">{formatCurrency(totalItem)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex justify-end print-footer">
            <div className="w-1/3">
              <div className="border-t border-gray-300 pt-4">
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="text-sm text-gray-800">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">Taxa de Frete:</span>
                  <span className="text-sm text-gray-800">{formatCurrency(totals.taxes)}</span>
                </div>
                <div className="border-t border-gray-300 my-2"></div>
                <div className="flex justify-between py-1">
                  <span className="text-base font-medium text-gray-800">Total:</span>
                  <span className="text-base font-medium text-gray-800">{formatCurrency(totals.total)}</span>
                </div>
                
                {/* Mostrar total da comissão se o pedido for confirmado */}
                {status === 'confirmado' && (
                  <div className="flex justify-between py-1 mt-2">
                    <span className="text-sm text-gray-600">Total Comissão:</span>
                    <span className="text-sm text-gray-800">
                      {formatCurrency(orderItems.reduce((sum, item) => {
                        const totalItem = item.unitPrice * (1 - item.discountPercentage / 100) * item.quantity;
                        return sum + (totalItem * (item.commission / 100));
                      }, 0))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 text-xs text-center text-gray-500">
            <p>Este documento não possui valor fiscal.</p>
            <p>Impresso em {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 print:hidden">
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
                          disabled={false} // Permitir edição do cliente mesmo em pedidos existentes
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select 
                          value={status} 
                          onValueChange={(value) => setStatus(value as "cotacao" | "confirmado")}
                          disabled={false}
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
                          disabled={false}
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
                          disabled={false}
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
                    <Button onClick={() => setAddProductModalOpen(true)} disabled={false}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Adicionar Produto
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="relative overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ref. Cliente</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Qtde</TableHead>
                            <TableHead>Preço Tabela</TableHead>
                            <TableHead>Desconto</TableHead>
                            <TableHead>Preço com Desconto</TableHead>
                            <TableHead>Comissão</TableHead>
                            <TableHead>Subtotal</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-4">
                                Nenhum produto adicionado ao pedido
                              </TableCell>
                            </TableRow>
                          ) : (
                            orderItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  {item.product?.conversion ? (
                                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-sm">
                                      {item.product.conversion}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
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
                                    disabled={false}
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
                                <TableCell>{formatCurrency(item.discountPercentage ? item.unitPrice * (1 - item.discountPercentage / 100) : item.unitPrice)}</TableCell>
                                <TableCell>{item.commission}%</TableCell>
                                <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => removeOrderItem(index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
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
                              <dt className="text-sm text-gray-500 dark:text-gray-400">Taxa de Frete</dt>
                              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                                <Input 
                                  type="text" 
                                  value={totals.taxes}
                                  onChange={(e) => {
                                    // Permitir apenas números e ponto decimal
                                    const inputValue = e.target.value.replace(/[^0-9.]/g, '');
                                    const value = parseFloat(inputValue) || 0;
                                    const newTotals = {
                                      ...totals,
                                      taxes: value,
                                      total: totals.subtotal + value
                                    };
                                    setTotals(newTotals);
                                  }}
                                  className="w-24 h-6 text-right"
                                />
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
                  <Tabs defaultValue="code" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="code">Código do Produto</TabsTrigger>
                      <TabsTrigger value="clientRef">Referência do Cliente</TabsTrigger>
                    </TabsList>
                    <TabsContent value="code" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="product">Produto</Label>
                        <ProductSearch 
                          products={products}
                          selectedProductId={selectedProductId}
                          onProductSelect={setSelectedProductId}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="clientRef" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientReference">Referência do Cliente</Label>
                        <div className="flex space-x-2">
                          <Input
                            type="text"
                            placeholder="Digite a referência do cliente"
                            value={clientRef}
                            onChange={(e) => setClientRef(e.target.value)}
                          />
                          <Button 
                            onClick={() => {
                              setIsSearchingByClientRef(true);
                              fetch(`/api/products/by-client-reference/${encodeURIComponent(clientRef)}`)
                                .then(res => {
                                  if (!res.ok) {
                                    if (res.status === 404) {
                                      // Produto não encontrado, mostrar mensagem
                                      toast({
                                        title: "Produto não encontrado",
                                        description: "Não encontramos um produto com esta referência.",
                                        variant: "destructive",
                                      });
                                      return null;
                                    }
                                    throw new Error("Erro ao buscar produto");
                                  }
                                  return res.json();
                                })
                                .then(product => {
                                  if (product) {
                                    // Adicionar a referência do cliente ao produto recebido
                                    if (!product.conversion) {
                                      product.conversion = clientRef;
                                    }
                                    console.log("Produto encontrado com referência do cliente:", { 
                                      produto: product.name, 
                                      id: product.id, 
                                      referencia: clientRef 
                                    });
                                    
                                    setSelectedProductId(product.id);
                                    
                                    // Salvar a conversão no servidor imediatamente
                                    fetch(`/api/products/${product.id}/save-conversion`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ clientRef })
                                    })
                                    .then(res => res.json())
                                    .then(updatedProduct => {
                                      console.log("Conversão salva com sucesso:", updatedProduct);
                                    })
                                    .catch(error => {
                                      console.error("Erro ao salvar conversão:", error);
                                    });
                                    
                                    toast({
                                      title: "Produto encontrado",
                                      description: `${product.name} (${product.code}) foi selecionado.`,
                                    });
                                  }
                                })
                                .catch(error => {
                                  toast({
                                    title: "Erro",
                                    description: "Falha ao buscar produto.",
                                    variant: "destructive",
                                  });
                                })
                                .finally(() => {
                                  setIsSearchingByClientRef(false);
                                });
                            }}
                            disabled={!clientRef || isSearchingByClientRef}
                          >
                            {isSearchingByClientRef ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
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
                  <Button 
                    onClick={() => {
                      addProductToOrder();
                      
                      // Se um produto foi encontrado pela referência do cliente e temos uma referência,
                      // salvar esta referência para conversões futuras
                      if (selectedProductId && clientRef && isSearchingByClientRef) {
                        fetch(`/api/products/${selectedProductId}/save-conversion`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ clientRef }),
                        })
                        .then(res => {
                          if (!res.ok) throw new Error("Erro ao salvar conversão");
                          return res.json();
                        })
                        .then(() => {
                          toast({
                            title: "Conversão salva",
                            description: "Referência do cliente vinculada ao produto.",
                          });
                        })
                        .catch(error => {
                          toast({
                            title: "Aviso",
                            description: "O produto foi adicionado, mas não foi possível salvar a conversão.",
                            variant: "destructive",
                          });
                        });
                      }
                    }}
                    disabled={!selectedProductId || productQuantity <= 0}
                  >
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
