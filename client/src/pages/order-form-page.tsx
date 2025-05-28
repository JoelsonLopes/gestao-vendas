"use client"

import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help"
import { useState, useEffect, useRef, useCallback } from "react"
import { DashboardLayout } from "@/layouts/dashboard-layout"
import { useLocation, useRoute } from "wouter"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { ClientSearch } from "@/components/client-search"
import { ProductSearch } from "@/components/product-search"
import { Loader2, Save, CheckCircle, ArrowLeft, PlusCircle, Trash, Printer, Calculator, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from "@/components/ui/dialog"
import { DiscountSelect } from "@/components/discount-select"
import { PdfTemplate } from "@/components/pdf-template"
import { PriceCalculatorModal } from "@/components/price-calculator-modal"
import { formatCurrency, calculateDiscountedPrice, calculateTotals } from "@/lib/utils"
import type { Client, Product, Order, OrderItem, InsertOrder, InsertOrderItem } from "@shared/schema"

export default function OrderFormPage() {
  const [location, navigate] = useLocation()
  const { toast } = useToast()
  const { user } = useAuth()

  // Usar useRoute para capturar parâmetros de rota
  const [match, params] = useRoute("/orders/:id")
  const [id, setId] = useState<string | undefined>(params?.id)
  const [isEditMode, setIsEditMode] = useState<boolean>(!!params?.id)
  const isNewOrder = id === "new"

  // Estado para mostrar o painel de atalhos
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false)

  // Estado para controlar se há alterações não salvas
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false)

  console.log("OrderFormPage - URL atual:", location)
  console.log("OrderFormPage - ID do pedido:", id)
  console.log("OrderFormPage - É modo de edição?", isEditMode)
  console.log("OrderFormPage - É pedido novo?", isNewOrder)

  // Order form state
  const [clientId, setClientId] = useState<number | null>(null)
  const [status, setStatus] = useState<"cotacao" | "confirmado">("cotacao")
  const [paymentTerms, setPaymentTerms] = useState<string>("")
  const [notes, setNotes] = useState<string>("")

  // Order items state
  const [orderItems, setOrderItems] = useState<
    Array<{
      id?: number
      productId: number
      quantity: number
      unitPrice: number
      discountId: number | null
      discountPercentage: number
      commission: number
      subtotal: number
      product?: Product
      clientRef?: string | null
    }>
  >([])

  // UI state
  const [addProductModalOpen, setAddProductModalOpen] = useState(false)
  const [productsModalOpen, setProductsModalOpen] = useState(false)
  const [tempOrderItems, setTempOrderItems] = useState<
    Array<{
      id?: number
      productId: number
      quantity: number
      unitPrice: number
      discountId: number | null
      discountPercentage: number
      commission: number
      subtotal: number
      product?: Product
      clientRef?: string | null
    }>
  >([])
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [selectedDiscountId, setSelectedDiscountId] = useState<number | null>(null)
  const [productQuantity, setProductQuantity] = useState(1)
  const [clientRef, setClientRef] = useState("")
  const [isSearchingByClientRef, setIsSearchingByClientRef] = useState(false)
  const [shouldSaveConversion, setShouldSaveConversion] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [showClientRefsInPdf, setShowClientRefsInPdf] = useState(true) // Estado para controlar a exibição das referências do cliente no PDF
  const [showClientRefsInPrint, setShowClientRefsInPrint] = useState<boolean>(true) // Estado para controlar a exibição das referências do cliente na impressão

  // Estados para gerenciar preços competitivos
  // const [competitivePrices, setCompetitivePrices] = useState<{[key: number]: boolean}>({})
  // const [itemNotes, setItemNotes] = useState<{[key: number]: string}>({})
  // const [competitorDetailsOpen, setCompetitorDetailsOpen] = useState(false)
  // const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  // const [tempCompetitorName, setTempCompetitorName] = useState("")
  // const [tempCompetitorNote, setTempCompetitorNote] = useState("")

  // Adicionar o estado temporário para os produtos na modal
  // Adicionar logo após os estados UI existentes
  // Adicionar estado para controlar a modal de produtos

  // Estado para a modal de nova condição de pagamento
  const [addPaymentTermModalOpen, setAddPaymentTermModalOpen] = useState(false)
  const [newPaymentTerm, setNewPaymentTerm] = useState("")
  const [calculatorProduct, setCalculatorProduct] = useState<Product | null>(null)
  const [totals, setTotals] = useState<{
    subtotal: number
    taxes: number
    total: number
  }>({
    subtotal: 0,
    taxes: 0,
    total: 0,
  })

  // Get clients
  const clientsQuery = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  })

  const clients = clientsQuery.data || []
  const isLoadingClients = clientsQuery.isLoading

  // Get representatives (para permitir que o admin selecione o representante)
  const { data: representatives, isLoading: isLoadingRepresentatives } = useQuery<any[]>({
    queryKey: ["/api/representatives"],
    enabled: user?.role === "admin", // Somente carrega se o usuário for admin
  })

  // Estado para armazenar o representante selecionado
  const [representativeId, setRepresentativeId] = useState<number | null>(user?.id || null)

  // Logger para debug - executado apenas uma vez quando os dados carregarem
  useEffect(() => {
    if (clients && clients.length > 0) {
      console.log(`Clientes carregados: ${clients.length}`)

      // Log de alguns clientes para verificação
      console.log(
        "Exemplos de clientes:",
        clients.slice(0, 5).map((client) => ({
          id: client.id,
          name: client.name,
          code: client.code,
        })),
      )

      // Verificar se temos cliente com código específico
      const cliente8028 = clients.find((client) => client.code === "8028")
      if (cliente8028) {
        console.log("Cliente 8028 encontrado:", cliente8028)
      } else {
        console.log("Cliente 8028 NÃO encontrado nos dados carregados")

        // Listar alguns códigos de clientes para verificação
        const sampleCodes = clients.slice(0, 20).map((c) => c.code)
        console.log("Alguns códigos de clientes disponíveis:", sampleCodes)
      }
    }
  }, [clients])

  // Get products
  // Get discounts
  const { data: discounts, isLoading: isLoadingDiscounts } = useQuery<any[]>({
    queryKey: ["/api/discounts"],
  })

  // Get order details if in edit mode (mas não para pedidos novos com id="new")
  const { data: order, isLoading: isLoadingOrder } = useQuery<Order>({
    queryKey: ["orders", id],
    enabled: isEditMode && id !== "new",
    refetchOnWindowFocus: false,
  })

  // Buscar itens do pedido se estivermos em modo de edição, o pedido foi carregado, e não é um pedido novo
  const { data: orderItemsData, isLoading: isLoadingOrderItems } = useQuery<OrderItem[]>({
    queryKey: ["orders", id, "items"],
    enabled: isEditMode && id !== "new" && !!order,
    refetchOnWindowFocus: false,
  })

  // Log para depuração
  useEffect(() => {
    if (order) {
      console.log("Detalhes do pedido carregados:", order)
    }
    if (orderItemsData) {
      console.log("Itens do pedido carregados:", orderItemsData)
    }
  }, [order, orderItemsData])

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: { order: InsertOrder; items: Omit<InsertOrderItem, "orderId">[] }) => {
      const response = await apiRequest("POST", "/api/orders", data)
      return response.json()
    },
    onSuccess: (data) => {
      // Invalidar o cache de pedidos
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] })

      // Se recebemos um ID do pedido, atualizamos a URL sem redirecionar
      if (data && data.order && data.order.id) {
        // Atualizar a URL para o pedido criado sem recarregar a página
        window.history.replaceState(null, "", `/orders/${data.order.id}`)

        // Atualizar state para refletir que estamos agora em modo de edição
        setIsEditMode(true)

        // Definir o ID do pedido para o novo pedido criado
        setId(String(data.order.id))

        // Recarregar os dados do pedido
        queryClient.invalidateQueries({ queryKey: ["orders", String(data.order.id)] })
        queryClient.invalidateQueries({ queryKey: ["orders", String(data.order.id), "items"] })

        toast({
          title: "Pedido criado",
          description: "Pedido foi criado com sucesso. A página será atualizada com os dados mais recentes.",
        })

        // Forçar uma atualização da página após um atraso para garantir que o salvamento foi concluído
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }

      // Redefinir o estado isSubmitting e hasUnsavedChanges
      setIsSubmitting(false)
      setHasUnsavedChanges(false)
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao criar pedido: ${error.message}`,
        variant: "destructive",
      })
      setIsSubmitting(false)
    },
  })

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "cotacao" | "confirmado" }) => {
      const response = await apiRequest("PUT", `/api/orders/${id}/status`, { status })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", id] })
      toast({
        title: "Status atualizado",
        description: "Status do pedido foi atualizado com sucesso",
      })
      setHasUnsavedChanges(false)
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar status: ${error.message}`,
        variant: "destructive",
      })
    },
  })

  // Load order data if in edit mode
  useEffect(() => {
    if (isEditMode && order) {
      console.log("Carregando dados do pedido:", order)
      console.log("Observações do pedido:", order.notes)

      setClientId(order.clientId)
      setStatus(order.status as "cotacao" | "confirmado")
      setPaymentTerms(order.paymentTerms || "")
      setNotes(order.notes || "")
    }
  }, [isEditMode, order])

  // Função para buscar um produto por ID
  const fetchProductById = async (productId: number): Promise<Product | null> => {
    try {
      const response = await fetch(`/api/products/${productId}`)
      if (!response.ok) {
        console.error(`Erro ao buscar o produto ${productId}:`, response.statusText)
        return null
      }
      return await response.json()
    } catch (error) {
      console.error(`Erro ao buscar o produto ${productId}:`, error)
      return null
    }
  }

  // Load order items if order is loaded
  useEffect(() => {
    const loadOrderItemsWithProducts = async () => {
      if (isEditMode && orderItemsData && Array.isArray(orderItemsData)) {
        console.log("Processando itens do pedido:", orderItemsData)

        // Carregar produtos para cada item
        const itemsWithProductsPromises = orderItemsData.map(async (item: any) => {
          // Buscar o produto para este item
          const product = await fetchProductById(item.productId)

          // Log detalhado para cada item
          console.log("Processando item:", item, "Produto encontrado:", product)

          return {
            id: item.id,
            productId: item.productId,
            // Converter strings para números com valores padrão para evitar nulos
            unitPrice: typeof item.unitPrice === "string" ? Number(item.unitPrice) : item.unitPrice || 0,
            quantity: typeof item.quantity === "string" ? Number(item.quantity) : item.quantity || 0,
            discountPercentage:
              typeof item.discountPercentage === "string"
                ? Number(item.discountPercentage)
                : item.discountPercentage || 0,
            commission: typeof item.commission === "string" ? Number(item.commission) : item.commission || 0,
            subtotal: typeof item.subtotal === "string" ? Number(item.subtotal) : item.subtotal || 0,
            discountId: item.discountId,
            product: product || undefined,
            clientRef: item.clientRef || product?.conversion || null,
          }
        })

        // Esperar que todos os produtos sejam carregados
        const mappedItems = await Promise.all(itemsWithProductsPromises)

        console.log("Itens mapeados:", mappedItems)
        setOrderItems(mappedItems)
      } else {
        console.log("Não foi possível processar itens do pedido:", {
          isEditMode,
          orderItemsData,
          isArray: Array.isArray(orderItemsData),
        })
      }
    }

    loadOrderItemsWithProducts()
  }, [isEditMode, orderItemsData])

  // Calculate order totals and update the state
  useEffect(() => {
    // O subtotal é a soma dos subtotais de cada item (que já incluem o desconto)
    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0)

    // Não precisamos calcular desconto separadamente, pois já está incluído no preço unitário
    // O total é simplesmente o subtotal + taxa de frete
    const taxes = isEditMode && order ? Number.parseFloat(order.taxes || "0") : 0 // Taxa de frete editável pelo usuário
    const total = subtotal + taxes

    console.log(`
      Resumo do pedido:
      - Subtotal (com desconto): ${formatCurrency(subtotal)}
      - Taxa de Frete: ${formatCurrency(taxes)}
      - Total: ${formatCurrency(total)}
    `)

    setTotals({
      subtotal: Number(subtotal.toFixed(2)),
      taxes: Number(taxes.toFixed(2)),
      total: Number(total.toFixed(2)),
    })
  }, [orderItems, isEditMode, order])

  // Function to handle adding a new payment term
  const handleAddPaymentTerm = () => {
    if (!newPaymentTerm || newPaymentTerm.trim() === "") {
      toast({
        title: "Erro",
        description: "Por favor, digite uma condição de pagamento válida.",
        variant: "destructive",
      })
      return
    }

    // Fechar o modal
    setAddPaymentTermModalOpen(false)

    // Selecionar a nova condição de pagamento
    setPaymentTerms(newPaymentTerm)

    // Marcar que há alterações não salvas
    setHasUnsavedChanges(true)

    toast({
      title: "Condição adicionada",
      description: `A condição "${newPaymentTerm}" foi adicionada com sucesso.`,
    })
  }

  // Function to open calculator with a product
  const openCalculator = async (productId: number | null) => {
    if (!productId) return

    try {
      const product = await fetchProductById(productId)
      if (product) {
        setCalculatorProduct(product)
        setCalculatorOpen(true)
      } else {
        toast({
          title: "Erro",
          description: "Produto não encontrado.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao buscar produto para calculadora:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as informações do produto.",
        variant: "destructive",
      })
    }
  }

  // Referência para o botão "Adicionar Produto"
  const addProductButtonRef = useRef<HTMLButtonElement>(null)

  // Hook de atalhos de teclado
  const useKeyboardShortcuts = useCallback(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Ignorar atalhos quando um input estiver com foco
      const activeElement = document.activeElement
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "SELECT")

      // Ignorar atalhos em inputs de texto, exceto Escape
      if (isInputFocused && e.key !== "Escape") return

      // Atalhos que funcionam em qualquer situação
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault()
        setShowShortcutsHelp((prev) => !prev)
        return
      }

      // Ignorar se um modal estiver aberto, exceto ESC para fechar
      if (addProductModalOpen || calculatorOpen || showPdfPreview) {
        if (e.key === "Escape") {
          e.preventDefault()

          if (showPdfPreview) {
            setShowPdfPreview(false)
          } else if (calculatorOpen) {
            setCalculatorOpen(false)
          } else if (addProductModalOpen) {
            setAddProductModalOpen(false)
          }
        }
        return
      }

      // Atalhos ativos só quando nenhum modal estiver aberto
      switch (e.key) {
        case "a":
          // Atalho para adicionar novo produto
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            // Abre a modal
            setAddProductModalOpen(true)

            // Limpa os campos
            setSelectedProductId(null)
            setClientRef("")
            setProductQuantity(1)
            setSelectedDiscountId(null)
            setShouldSaveConversion(false)

            // Dá tempo para o componente carregar antes de focar no campo de referência do cliente
            setTimeout(() => {
              const clientRefInput = document.getElementById("clientRefSearchInput")
              if (clientRefInput) {
                ;(clientRefInput as HTMLElement).focus()
              }
            }, 100)
          }
          break

        case "s":
          // Atalho para salvar pedido
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            handleSaveOrder()
          } else if (e.ctrlKey || e.metaKey) {
            // Captura o Ctrl+S ou Cmd+S padrão
            e.preventDefault()
            handleSaveOrder()
          }
          break

        case "p":
          // Atalho para imprimir/visualizar PDF
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setShowPdfPreview(true)
          }
          break

        case "Escape":
          // Atalho para voltar para a lista de pedidos
          e.preventDefault()
          navigate("/orders")
          break

        case "c":
          // Atalho para abrir calculadora (se não for input)
          if (!isInputFocused) {
            e.preventDefault()
            const firstProductId = orderItems[0]?.productId
            if (firstProductId) {
              openCalculator(firstProductId)
            }
          }
          break
      }
    }

    // Adicionar event listener global
    window.addEventListener("keydown", handleKeyDown)

    // Limpar event listener ao desmontar
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [addProductModalOpen, calculatorOpen, showPdfPreview, orderItems, navigate])

  // Ativar atalhos de teclado
  useEffect(() => {
    const cleanup = useKeyboardShortcuts()
    return cleanup
  }, [useKeyboardShortcuts])

  // Add product to order
  // Função completamente reescrita para evitar problemas de sincronização
  // Add product to order
  // Funçã -> This hook is being called from a nested function, but all hooks must be called unconditionally from the top-level component.
  // Função completamente reescrita para adicionar na lista temporária
  const addProductToOrder = async () => {
    // Logging para diagnóstico
    console.log("===== INICIANDO ADIÇÃO DE PRODUTO TEMPORÁRIO =====")
    console.log("Estado inicial:", {
      selectedProductId,
      productQuantity,
      clientId,
      clientRef,
      shouldSaveConversion,
      selectedDiscountId,
    })

    // Validações iniciais
    if (!selectedProductId || productQuantity <= 0) {
      console.log("ERRO: Produto não selecionado ou quantidade inválida.")
      return
    }

    try {
      // 1. Preparar o estado de UI preventivamente para feedback imediato do usuário
      setIsSubmitting(true)

      // 2. Buscar o produto
      console.log(`Buscando produto ${selectedProductId}`)
      const product = await fetchProductById(selectedProductId)

      if (!product) {
        console.error(`ERRO: Produto ${selectedProductId} não encontrado`)
        toast({
          title: "Erro",
          description: "Produto não encontrado.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      console.log(`Produto encontrado:`, product)

      // 3. Definir a referência final do cliente
      const finalClientRef = clientRef && clientRef.trim() !== "" ? clientRef.trim() : product.conversion || null

      console.log(`Referência do cliente definida:`, finalClientRef)

      // 4. Se necessário, salvar a conversão no servidor
      if (clientRef && clientRef.trim() !== "" && shouldSaveConversion) {
        try {
          console.log(`Salvando conversão para o produto ${selectedProductId}`)

          const response = await fetch(`/api/products/${selectedProductId}/save-conversion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientRef }),
          })

          if (response.ok) {
            console.log("Conversão salva com sucesso")
            toast({
              title: "Referência salva",
              description: "Referência do cliente vinculada ao produto com sucesso.",
            })

            // Atualizar a lista de produtos
            queryClient.invalidateQueries({ queryKey: ["/api/products"] })
          } else {
            throw new Error("Erro na resposta do servidor")
          }
        } catch (error) {
          console.error("ERRO ao salvar conversão:", error)
          toast({
            title: "Aviso",
            description: "O produto foi adicionado, mas não foi possível salvar a referência.",
            variant: "destructive",
          })
        }
      }

      // 5. Calcular preços e descontos
      const unitPrice = Number(product.price)
      let discountPercentage = 0
      let commission = 0

      if (selectedDiscountId !== null && discounts) {
        const discount = discounts.find((d) => d.id === selectedDiscountId)
        if (discount) {
          discountPercentage = Number.parseFloat(discount.percentage)
          commission = Number.parseFloat(discount.commission)
          console.log(`Desconto encontrado: ${discount.name} (${discountPercentage}%)`)
        } else {
          console.log(`Desconto com ID ${selectedDiscountId} não encontrado na lista`)
        }
      }

      // Cálculo do preço com desconto
      const discountedUnitPrice = calculateDiscountedPrice(unitPrice, discountPercentage)

      // Subtotal baseado no preço unitário já com desconto
      const subtotal = Number((productQuantity * discountedUnitPrice).toFixed(2))

      console.log(`
      Adicionando produto temporário:
      - Produto: ${product.name} (${product.code})
      - Preço original: ${formatCurrency(unitPrice)}
      - Desconto: ${discountPercentage}%
      - Preço com desconto: ${formatCurrency(discountedUnitPrice)}
      - Quantidade: ${productQuantity}
      - Subtotal: ${formatCurrency(subtotal)}
      ${clientRef ? `- Referência do Cliente: ${clientRef}` : ""}
      ${selectedDiscountId ? `- Comissão: ${commission}%` : ""}
    `)

      // 6. Criar um novo item temporário
      const newItem = {
        productId: selectedProductId,
        quantity: productQuantity,
        unitPrice: unitPrice,
        discountId: selectedDiscountId,
        discountPercentage: discountPercentage,
        commission: commission,
        subtotal: subtotal,
        product: { ...product }, // Criar cópia do produto para evitar referências compartilhadas
        clientRef: finalClientRef, // Usar a referência já definida
      }

      // 7. Adicionar à lista temporária
      setTempOrderItems((prev) => [...prev, newItem])

      // 8. Fechar modal de produto e limpar os campos
      setAddProductModalOpen(false)
      setSelectedProductId(null)
      setSelectedDiscountId(null)
      setProductQuantity(1)
      setClientRef("")
      setIsSearchingByClientRef(false)
      setShouldSaveConversion(false)
      setIsSubmitting(false)

      console.log("===== PRODUTO ADICIONADO À LISTA TEMPORÁRIA COM SUCESSO =====")
    } catch (error) {
      console.error("ERRO CRÍTICO:", error)
      toast({
        title: "Erro ao adicionar produto",
        description: "Ocorreu um erro ao adicionar o produto. Tente novamente.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  // Remove product from order
  const removeOrderItem = (index: number) => {
    // Usar o índice diretamente, pois não estamos mais invertendo a ordem
    const actualIndex = index

    // Usar o callback do setOrderItems para garantir que temos o estado mais recente
    setOrderItems((prevItems) => {
      const newItems = [...prevItems]
      newItems.splice(actualIndex, 1)
      console.log(`Removendo item na posição ${actualIndex}. Novos itens:`, newItems)

      // Marcar que há alterações não salvas
      setHasUnsavedChanges(true)

      return newItems
    })
  }

  // Update item discount
  const updateItemDiscount = (
    index: number,
    discountId: number | null,
    discountPercentage: number,
    commission: number,
  ) => {
    // Usar o índice diretamente, pois não estamos mais invertendo a ordem
    const actualIndex = index

    // Usar o callback do setOrderItems para garantir que temos o estado mais recente
    setOrderItems((prevItems) => {
      const newItems = [...prevItems]
      const item = newItems[actualIndex]

      // Calcular o preço unitário com desconto primeiro
      const discountedUnitPrice = calculateDiscountedPrice(item.unitPrice, discountPercentage)

      // Calcular o subtotal com base no preço unitário já com desconto
      const discountedSubtotal = Number((item.quantity * discountedUnitPrice).toFixed(2))

      console.log(`
        Aplicando desconto:
        - Produto: ${item.product?.name} (${item.product?.code})
        - Preço original: ${formatCurrency(item.unitPrice)}
        - Desconto: ${discountPercentage}%
        - Preço com desconto: ${formatCurrency(discountedUnitPrice)}
        - Quantidade: ${item.quantity}
        - Subtotal: ${formatCurrency(discountedSubtotal)}
        - Comissão: ${commission}%
      `)

      newItems[actualIndex] = {
        ...item,
        discountId,
        discountPercentage,
        commission,
        subtotal: discountedSubtotal,
      }

      // Marcar que há alterações não salvas
      setHasUnsavedChanges(true)

      return newItems
    })
  }

  // Update item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return

    // Usar o índice diretamente, pois não estamos mais invertendo a ordem
    const actualIndex = index

    // Usar o callback do setOrderItems para garantir que temos o estado mais recente
    setOrderItems((prevItems) => {
      const newItems = [...prevItems]
      const item = newItems[actualIndex]

      // Pegar o preço unitário com desconto
      const discountedUnitPrice = calculateDiscountedPrice(item.unitPrice, item.discountPercentage)

      // Recalcular subtotal com base no preço unitário já com desconto
      const discountedSubtotal = Number((quantity * discountedUnitPrice).toFixed(2))

      console.log(`
        Atualizando quantidade:
        - Produto: ${item.product?.name} (${item.product?.code})
        - Preço original: ${formatCurrency(item.unitPrice)}
        - Desconto: ${item.discountPercentage}%
        - Preço com desconto: ${formatCurrency(discountedUnitPrice)}
        - Nova quantidade: ${quantity}
        - Novo subtotal: ${formatCurrency(discountedSubtotal)}
      `)

      newItems[actualIndex] = {
        ...item,
        quantity,
        subtotal: discountedSubtotal,
      }

      // Marcar que há alterações não salvas
      setHasUnsavedChanges(true)

      return newItems
    })
  }

  // Função auxiliar para calcular o preço com desconto
  const getPriceWithDiscount = (item: any) => {
    return item.unitPrice * (1 - item.discountPercentage / 100);
  }

  // Componente de entrada de preço formatado
  const PriceInput = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => {
    const [displayValue, setDisplayValue] = useState(formatCurrency(value));
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Atualiza o valor de exibição quando o valor real muda
    useEffect(() => {
      if (!isEditing) {
        setDisplayValue(formatCurrency(value));
      }
    }, [value, isEditing]);

    // Quando o campo recebe foco, mostra o valor numérico para edição
    const handleFocus = () => {
      setIsEditing(true);
      setDisplayValue(value.toFixed(2).replace('.', ','));
    };

    // Quando o campo perde foco, formata o valor como moeda
    const handleBlur = () => {
      setIsEditing(false);
      
      // Tratamento especial para valores com vírgula
      let numericValue: number;
      
      if (displayValue.includes(',')) {
        // Se contém vírgula, tratar como formato brasileiro
        const parts = displayValue.split(',');
        const integerPart = parts[0].replace(/\D/g, '');
        let decimalPart = parts[1] ? parts[1].replace(/\D/g, '') : '00';
        
        // Garantir que a parte decimal tenha 2 dígitos
        decimalPart = decimalPart.padEnd(2, '0').substring(0, 2);
        
        // Construir o número como string e converter para número
        numericValue = Number(`${integerPart}.${decimalPart}`);
      } else {
        // Se não contém vírgula, tratar como formato padrão
        const cleanValue = displayValue.replace(/\D/g, '');
        numericValue = cleanValue ? Number(cleanValue) / 100 : 0;
      }
      
      if (!isNaN(numericValue)) {
        onChange(numericValue);
        setDisplayValue(formatCurrency(numericValue));
      } else {
        setDisplayValue(formatCurrency(value));
      }
    };

    // Quando o usuário digita, atualiza o valor de exibição
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Permitir apenas números, vírgula e ponto
      const inputValue = e.target.value.replace(/[^\d,.]/g, '');
      
      // Garantir que só existe uma vírgula ou ponto
      const parts = inputValue.split(/[,.]/);
      if (parts.length > 2) {
        // Se houver mais de um separador decimal, manter apenas o primeiro
        const firstPart = parts[0];
        const secondPart = parts.slice(1).join('');
        setDisplayValue(`${firstPart},${secondPart}`);
      } else {
        setDisplayValue(inputValue);
      }
    };

    // Quando o usuário pressiona Enter, confirma a edição
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Previne o comportamento padrão do Enter
        handleBlur();
      }
    };

    return (
      <Input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-24 text-right"
      />
    );
  };

  // Função para atualizar o preço com desconto manualmente
  const updateItemManualPrice = (index: number, manualPrice: number) => {
    // Usar o índice diretamente, pois não estamos mais invertendo a ordem
    const actualIndex = index;
    
    const updatedItems = [...orderItems];
    const item = updatedItems[actualIndex];
    
    // Não alteramos o preço de tabela (unitPrice)
    // Em vez disso, calculamos o desconto necessário para atingir o preço manual desejado
    
    // Se o preço manual for menor que o preço de tabela, calculamos o desconto necessário
    if (manualPrice < item.unitPrice) {
      // Fórmula: desconto = (1 - preçoManual/preçoTabela) * 100
      const newDiscountPercentage = (1 - manualPrice / item.unitPrice) * 100;
      item.discountPercentage = Number(newDiscountPercentage.toFixed(2));
    } else {
      // Se o preço manual for maior ou igual ao preço de tabela, removemos o desconto
      item.discountPercentage = 0;
    }
    
    // Recalcula o subtotal com base no novo preço com desconto e quantidade
    const priceWithDiscount = item.unitPrice * (1 - item.discountPercentage / 100);
    item.subtotal = Number((priceWithDiscount * item.quantity).toFixed(2));
    
    // Recalcula a comissão com base no novo preço com desconto
    if (item.discountId && discounts) {
      const discount = discounts.find(d => d.id === item.discountId);
      if (discount) {
        // A comissão é calculada como uma porcentagem do subtotal
        item.commission = discount.commission;
      }
    }
    
    // Removida a lógica que marcava o preço como competitivo
    
    setOrderItems(updatedItems);
    
    // Recalcula os totais
    const subtotal = updatedItems.reduce((total, item) => total + item.subtotal, 0);
    
    // Atualizar os totais mantendo a taxa de frete e recalculando o total
    setTotals(prev => {
      const total = subtotal + prev.taxes;
      return {
        subtotal: Number(subtotal.toFixed(2)),
        taxes: prev.taxes,
        total: Number(total.toFixed(2))
      };
    });
    
    // Marcar que há alterações não salvas
    setHasUnsavedChanges(true);
  };

  // Mutation para atualizar pedido existente
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, order, items }: { id: number; order: InsertOrder; items: any[] }) => {
      console.log(`Enviando requisição para atualizar pedido ${id}:`, { order, items })
      const res = await apiRequest("PUT", `/api/orders/${id}`, { order, items })
      const data = await res.json()
      console.log(`Resposta da atualização do pedido ${id}:`, data)
      return data
    },
    onSuccess: (data, variables) => {
      const orderId = variables.id
      console.log(`Sucesso na atualização do pedido ${orderId}`, data)

      // Invalidar todos os caches relacionados a este pedido específico
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] })
      queryClient.invalidateQueries({ queryKey: ["orders", String(orderId)] })
      queryClient.invalidateQueries({ queryKey: ["orders", String(orderId), "items"] })

      // Também atualizar diretamente o cache para certeza
      queryClient.setQueryData(["orders", String(orderId)], data.order)
      queryClient.setQueryData(["orders", String(orderId), "items"], data.items)

      toast({
        title: "Pedido atualizado",
        description: "O pedido foi atualizado com sucesso. A página será atualizada com os dados mais recentes.",
      })

      // Redefinir o estado isSubmitting e hasUnsavedChanges
      setIsSubmitting(false)
      setHasUnsavedChanges(false)

      // Forçar uma atualização da página após um atraso para garantir que o salvamento foi concluído
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar pedido",
        description: error.message,
        variant: "destructive",
      })
      setIsSubmitting(false)
    },
  })

  // Salvar pedido
  const handleSaveOrder = async () => {
    // Verificar se temos pelo menos um cliente selecionado
    if (!clientId) {
      toast({
        title: "Cliente não selecionado",
        description: "Por favor, selecione um cliente para o pedido.",
        variant: "destructive",
      })
      return
    }

    // Alerta informativo se não há produtos, mas permitir salvar mesmo assim
    if (orderItems.length === 0) {
      toast({
        title: "Pedido sem produtos",
        description: "O pedido será salvo sem produtos. Você poderá adicionar produtos depois.",
      })
      // Continuamos com o salvamento
    }

    setIsSubmitting(true)

    const orderData: InsertOrder = {
      clientId,
      representativeId: representativeId || user!.id, // Usa o representante selecionado (para admin) ou o próprio usuário
      status,
      paymentTerms,
      subtotal: totals.subtotal.toString(), // Convertido para string conforme esperado pelo InsertOrder
      discount: "0", // Desconto zero como string
      taxes: totals.taxes.toString(), // Convertido para string conforme esperado pelo InsertOrder
      total: totals.total.toString(), // Convertido para string conforme esperado pelo InsertOrder
      notes,
    }

    const itemsData = orderItems.map(
      (item: {
        productId: number
        quantity: number
        unitPrice: number
        discountId: number | null
        discountPercentage: number
        commission: number
        subtotal: number
        product?: Product
        clientRef?: string | null
      }) => {
        const itemData = {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(), // Convertido para string
          discountId: item.discountId,
          discountPercentage: item.discountPercentage.toString(), // Convertido para string
          commission: item.commission.toString(), // Convertido para string
          subtotal: item.subtotal.toString(), // Convertido para string
          clientRef: item.clientRef || item.product?.conversion || null, // Adiciona a referência do cliente
        }
        console.log("Preparando item para envio:", itemData)
        return itemData
      },
    )

    if (isEditMode && id && id !== "new") {
      // Atualizar pedido existente
      const orderId = Number.parseInt(id)
      if (!isNaN(orderId)) {
        updateOrderMutation.mutate({
          id: orderId,
          order: orderData,
          items: itemsData,
        })
      } else {
        toast({
          title: "Erro",
          description: "ID do pedido inválido",
          variant: "destructive",
        })
        setIsSubmitting(false)
      }
    } else {
      // Criar novo pedido
      createOrderMutation.mutate({ order: orderData, items: itemsData })
    }
  }

  const handleSaveOrderWithItems = async (
    items: Array<{
      id?: number
      productId: number
      quantity: number
      unitPrice: number
      discountId: number | null
      discountPercentage: number
      commission: number
      subtotal: number
      product?: Product
      clientRef?: string | null
    }>,
  ) => {
    // Verificar se temos pelo menos um cliente selecionado
    if (!clientId) {
      toast({
        title: "Cliente não selecionado",
        description: "Por favor, selecione um cliente para o pedido.",
        variant: "destructive",
      })
      return
    }

    // Alerta informativo se não há produtos, mas permitir salvar mesmo assim
    if (items.length === 0) {
      toast({
        title: "Pedido sem produtos",
        description: "O pedido será salvo sem produtos. Você poderá adicionar produtos depois.",
      })
      // Continuamos com o salvamento
    }

    setIsSubmitting(true)

    const orderData = {
      clientId,
      representativeId: representativeId || user?.id || 0,
      status,
      paymentTerms,
      subtotal: totals.subtotal.toString(),
      discount: "0",
      taxes: totals.taxes.toString(),
      total: totals.total.toString(),
      notes,
    }

    const itemsData = items.map(
      (item: {
        productId: number
        quantity: number
        unitPrice: number
        discountId: number | null
        discountPercentage: number
        commission: number
        subtotal: number
        product?: Product
        clientRef?: string | null
      }) => {
        // Anteriormente calculava se o item tinha preço competitivo
        // const actualIndex = orderItems.length - 1 - idx;
        // const isCompetitivePrice = competitivePrices[actualIndex] || false;
        // const competitorNote = itemNotes[actualIndex] || '';
        
        const itemData = {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(), // Convertido para string
          discountId: item.discountId,
          discountPercentage: item.discountPercentage.toString(), // Convertido para string
          commission: item.commission.toString(), // Convertido para string
          subtotal: item.subtotal.toString(), // Convertido para string
          clientRef: item.clientRef || item.product?.conversion || null, // Adiciona a referência do cliente
          // Removidas as propriedades isCompetitivePrice e competitorNote
        }
        console.log("Preparando item para envio:", itemData)
        return itemData
      },
    )

    console.log("Enviando pedido com os seguintes itens:", itemsData)

    if (isEditMode && id && id !== "new") {
      // Atualizar pedido existente
      const orderId = Number.parseInt(id)
      if (!isNaN(orderId)) {
        updateOrderMutation.mutate({
          id: orderId,
          order: orderData,
          items: itemsData,
        })
      } else {
        toast({
          title: "Erro",
          description: "ID do pedido inválido",
        })
        setIsSubmitting(false)
      }
    } else {
      // Criar novo pedido
      createOrderMutation.mutate({ order: orderData, items: itemsData })
    }
  }

  // Update order status
  const updateOrderStatus = (newStatus: "cotacao" | "confirmado") => {
    if (!isEditMode || !id || id === "new") return

    const orderId = Number.parseInt(id)
    if (isNaN(orderId)) {
      toast({
        title: "Erro",
        description: "ID do pedido inválido",
        variant: "destructive",
      })
      return
    }

    updateOrderStatusMutation.mutate({
      id: orderId,
      status: newStatus,
    })
  }

  // Prepare data for PDF preview
  const preparePdfData = () => {
    const client = clients?.find((c) => c.id === clientId)

    // Preparar os itens do pedido para o PDF com descontos
    const pdfItems = orderItems.map((item, idx) => {
      const product = item.product;
      const discount = discounts ? discounts.find((d) => d.id === item.discountId) : undefined;
      
      // Usar o preço com desconto atual
      const priceWithDiscount = getPriceWithDiscount(item);
      
      // Não precisamos mais calcular índices para preços competitivos
      // const actualIndex = orderItems.length - 1 - idx;
      // const isCompetitivePrice = competitivePrices[actualIndex] || false;
      // const competitorNote = itemNotes[actualIndex] || '';
      
      return {
        id: item.id || 0,
        name: product?.name || "",
        code: product?.code || "",
        clientRef: item.clientRef,
        quantity: item.quantity,
        unitPrice: priceWithDiscount, // Usar o preço com desconto
        discount: item.discountPercentage,
        subtotal: item.subtotal,
        brand: product?.brand || null,
        discountName: discount?.name || null,
        commission: item.commission
        // Propriedades removidas: isCompetitivePrice, competitorNote
      };
    })

    // Log dos itens com suas referências
    console.log(
      "Preparando dados para PDF, itens do pedido:",
      orderItems.map((item) => ({
        id: item.productId,
        name: item.product?.name,
        clientRef: item.product?.conversion,
      })),
    )

    // Calcular o total da comissão se o pedido for confirmado
    const totalCommission =
      status === "confirmado"
        ? orderItems.reduce((sum, item) => {
            const totalItem = item.unitPrice * (1 - item.discountPercentage / 100) * item.quantity
            return sum + totalItem * (item.commission / 100)
          }, 0)
        : 0

    return {
      order: {
        id: isEditMode ? Number.parseInt(id!) : 0,
        clientId: clientId || undefined,
        clientName: client?.name || "Cliente não selecionado",
        clientCnpj: client?.cnpj || "",
        clientCode: client?.code || "",
        date: new Date().toISOString(),
        status: status,
        paymentTerms: paymentTerms || "À vista",
        subtotal: totals.subtotal,
        discount: 0, // Não temos mais desconto separado
        taxes: totals.taxes,
        total: totals.total,
        representative: user?.name || "",
        totalCommission: totalCommission,
        notes: notes,
      },
      items: pdfItems,
    }
  }

  // Loading state
  const isLoading = isLoadingClients || (isEditMode && !isNewOrder && (isLoadingOrder || isLoadingOrderItems))

  // Função para atualizar campos do formulário
  const handleFormChange = (field: string, value: any) => {
    switch (field) {
      case "clientId":
        setClientId(value)
        break
      case "status":
        setStatus(value as "cotacao" | "confirmado")
        break
      case "paymentTerms":
        setPaymentTerms(value)
        break
      case "notes":
        setNotes(value)
        break
      case "taxes":
        setTotals({
          ...totals,
          taxes: value,
          total: totals.subtotal + value,
        })
        break
    }

    // Marcar que há alterações não salvas
    setHasUnsavedChanges(true)
  }

  // Adicionar estado para edição inline da referência do cliente
  const [editingClientRefIndex, setEditingClientRefIndex] = useState<number | null>(null)
  const [tempClientRef, setTempClientRef] = useState<string>("")

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cabeçalho responsivo com botões adaptados para mobile */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/orders")}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">
                {isEditMode ? `Pedido #${id}` : "Novo Pedido"}
              </h1>
              {hasUnsavedChanges && (
                <span className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-medium">
                  (Não salvo)
                </span>
              )}
            </div>
          </div>

          {/* Botões de ação responsivos - Grid em mobile */}
          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.print()} 
              className="w-full sm:w-auto"
            >
              <Printer className="h-4 w-4 mr-2" />
              <span className="text-xs sm:text-sm">Imprimir</span>
            </Button>

            <Button 
              size="sm" 
              onClick={handleSaveOrder} 
              disabled={isSubmitting} 
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              <span className="text-xs sm:text-sm">
                {isEditMode ? "Salvar" : "Criar"}
              </span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                if (clientId) {
                  handleSaveOrder()
                  setTimeout(() => {
                    navigate("/orders")
                  }, 500)
                } else {
                  navigate("/orders")
                }
              }}
              variant="default"
              className="w-full sm:w-auto"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              <span className="text-xs sm:text-sm">Concluir</span>
            </Button>
          </div>
        </div>

        {/* Versão para impressão - visível apenas durante a impressão */}
        <div className="hidden print:block print-document">
          <PdfTemplate
            order={preparePdfData().order}
            items={preparePdfData().items}
            onClose={() => {}}
            showClientRefs={showClientRefsInPrint}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 print:hidden">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-auto">
                <TabsTrigger value="details" className="text-xs sm:text-sm px-2 py-2">
                  <span className="hidden sm:inline">Detalhes do Pedido</span>
                  <span className="sm:hidden">Detalhes</span>
                </TabsTrigger>
                <TabsTrigger value="products" className="text-xs sm:text-sm px-2 py-2">
                  Produtos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4 px-4 sm:px-6">
                    <CardTitle className="text-lg sm:text-xl">Informações do Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
                      <div className="col-span-1 sm:col-span-2">
                        <Label htmlFor="client">Cliente *</Label>
                        <ClientSearch
                          clients={clients}
                          selectedClientId={clientId}
                          onClientSelect={(value) => handleFormChange("clientId", value)}
                          disabled={false} // Permitir edição do cliente mesmo em pedidos existentes
                        />
                      </div>

                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={status}
                          onValueChange={(value) => handleFormChange("status", value)}
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
                        <div className="flex justify-between items-center mb-2">
                          <Label htmlFor="paymentTerms">Condição de Pagamento</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAddPaymentTermModalOpen(true)}
                          >
                            <PlusCircle className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Nova</span>
                          </Button>
                        </div>
                        <Select
                          value={paymentTerms}
                          onValueChange={(value) => handleFormChange("paymentTerms", value)}
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
                              <SelectItem value="BOLETO 7D">Boleto Doc 7D</SelectItem>
                              <SelectItem value="BOLETO 14D">Boleto Doc 14D</SelectItem>
                              <SelectItem value="BOLETO 14/28D">Boleto Doc 14/28D</SelectItem>
                              <SelectItem value="BOLETO 28D">Boleto Doc 28D</SelectItem>
                              <SelectItem value="BOLETO 28/35D">Boleto Doc 28/35D</SelectItem>
                              <SelectItem value="BOLETO 28/35/42D">Boleto Doc 28/35/42D</SelectItem>
                              <SelectItem value="BOLETO 28/42/56D">Boleto Doc 28/42/56D</SelectItem>
                              <SelectItem value="BOLETO 28/56/84D">Boleto Doc 28/56/84D</SelectItem>
                              <SelectItem value="BOLETO 30D">Boleto Doc 30D</SelectItem>
                              <SelectItem value="BOLETO 30/45D">Boleto Doc 30/45D</SelectItem>
                              <SelectItem value="BOLETO 30/45/60D">Boleto Doc 30/45/60D</SelectItem>
                              <SelectItem value="BOLETO 30/45/60/75D">Boleto Doc 30/45/60/75D</SelectItem>
                              <SelectItem value="BOLETO 30/45/60/75/90D">Boleto Doc 30/45/60/75/90D</SelectItem>
                              <SelectItem value="BOLETO 30/60D">Boleto Doc 30/60D</SelectItem>
                              <SelectItem value="BOLETO 30/60/90D">Boleto Doc 30/60/90D</SelectItem>
                              <SelectItem value="BOLETO 35D">Boleto Doc 35D</SelectItem>
                              <SelectItem value="BOLETO 28/35/42/49D">Boleto Doc 28/35/42/49D</SelectItem>
                              <SelectItem value="BOLETO 28/42/56/70D">Boleto Doc 28/42/56/70D</SelectItem>
                              <SelectItem value="BOLETO 28/42">Boleto Doc 28/42</SelectItem>
                              <SelectItem value="BOLETO 30/60/90/120D">Boleto Doc 30/60/90/120D</SelectItem>

                              {newPaymentTerm && <SelectItem value={newPaymentTerm}>{newPaymentTerm}</SelectItem>}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="sm:col-span-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                          placeholder="Observações do pedido"
                          value={notes}
                          onChange={(e) => handleFormChange("notes", e.target.value)}
                          disabled={false}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="products" className="space-y-4 mt-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="px-4 sm:px-6 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <CardTitle className="text-lg sm:text-xl">Produtos do Pedido</CardTitle>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="showClientRefsInPrint"
                            checked={showClientRefsInPrint}
                            onChange={(e) => setShowClientRefsInPrint(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <Label htmlFor="showClientRefsInPrint" className="text-xs sm:text-sm font-normal text-gray-600 dark:text-gray-400">
                            Ref. na impressão
                          </Label>
                        </div>
                      </div>
                      <Button
                        ref={addProductButtonRef}
                        onClick={() => {
                          setTempOrderItems([])
                          setProductsModalOpen(true)
                        }}
                        disabled={false}
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        <span className="text-xs sm:text-sm">Gerenciar Produtos</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    {/* Mobile: Cards Layout | Desktop: Table Layout */}
                    <div className="block sm:hidden space-y-3">
                      {orderItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p className="text-sm">Nenhum produto adicionado</p>
                          <p className="text-xs mt-1">Toque em "Gerenciar Produtos" para começar</p>
                        </div>
                      ) : (
                        orderItems.map((item, index) => (
                          <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                            {/* Produto e Ref Cliente */}
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.product?.name || `Produto #${item.productId}`}</p>
                                <p className="text-xs text-gray-500">{item.product?.code}</p>
                                <div className="mt-1">
                                  {editingClientRefIndex === index ? (
                                    <Input
                                      autoFocus
                                      value={tempClientRef}
                                      onChange={e => setTempClientRef(e.target.value)}
                                      onBlur={() => {
                                        setOrderItems(prev => {
                                          const updated = [...prev]
                                          updated[index] = { ...updated[index], clientRef: tempClientRef }
                                          return updated
                                        })
                                        setEditingClientRefIndex(null)
                                      }}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") {
                                          setOrderItems(prev => {
                                            const updated = [...prev]
                                            updated[index] = { ...updated[index], clientRef: tempClientRef }
                                            return updated
                                          })
                                          setEditingClientRefIndex(null)
                                        } else if (e.key === "Escape") {
                                          setEditingClientRefIndex(null)
                                        }
                                      }}
                                      className="h-7 text-xs"
                                      placeholder="Ref. Cliente"
                                    />
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditingClientRefIndex(index)
                                        setTempClientRef(item.clientRef || item.product?.conversion || "")
                                      }}
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                      Ref: {item.clientRef || item.product?.conversion || "Adicionar"}
                                    </button>
                                  )}
                                </div>
                              </div>
                              {/* Ações */}
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openCalculator(item.productId)}
                                  className="h-8 w-8"
                                >
                                  <Calculator className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeOrderItem(index)}
                                  className="h-8 w-8 text-red-500"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Quantidade e Preço */}
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Qtde</p>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(index, Number.parseInt(e.target.value))}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Desconto</p>
                                <DiscountSelect
                                  value={item.discountId}
                                  onChange={(discountId, discountPercentage, commission) =>
                                    updateItemDiscount(index, discountId, discountPercentage, commission)
                                  }
                                  label=""
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Preço Unit.</p>
                                <PriceInput
                                  value={getPriceWithDiscount(item)}
                                  onChange={(newPrice) => updateItemManualPrice(index, newPrice)}
                                />
                              </div>
                            </div>

                            {/* Subtotal */}
                            <div className="flex justify-between items-center pt-2 border-t">
                              <span className="text-xs text-gray-500">Subtotal</span>
                              <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Desktop Table - Hidden on Mobile */}
                    <div className="hidden sm:block relative overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-32">Ref. Cliente</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead className="w-20">Qtde</TableHead>
                            <TableHead className="w-28">Preço Tab.</TableHead>
                            <TableHead className="w-32">Desconto</TableHead>
                            <TableHead className="w-32">Preço c/ Desc.</TableHead>
                            <TableHead className="w-28">Subtotal</TableHead>
                            <TableHead className="text-right w-28">Ações</TableHead>
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
                                {/* Referência do Cliente */}
                                <TableCell>
                                    {editingClientRefIndex === index ? (
                                      <Input
                                        autoFocus
                                        value={tempClientRef}
                                        onChange={e => setTempClientRef(e.target.value)}
                                        onBlur={() => {
                                          // Salva o valor editado no estado do item
                                          setOrderItems(prev => {
                                            const updated = [...prev]
                                            updated[index] = { ...updated[index], clientRef: tempClientRef }
                                            return updated
                                          })
                                          setEditingClientRefIndex(null)
                                        }}
                                        onKeyDown={e => {
                                          if (e.key === "Enter") {
                                            setOrderItems(prev => {
                                              const updated = [...prev]
                                              updated[index] = { ...updated[index], clientRef: tempClientRef }
                                              return updated
                                            })
                                            setEditingClientRefIndex(null)
                                          } else if (e.key === "Escape") {
                                            setEditingClientRefIndex(null)
                                          }
                                        }}
                                        className="w-32 text-sm"
                                      />
                                    ) : (
                                      <span
                                        className={
                                          (item.clientRef || item.product?.conversion)
                                            ? "px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                                            : "text-muted-foreground cursor-pointer hover:underline"
                                        }
                                        title="Clique para editar a referência do cliente"
                                        onClick={() => {
                                          setEditingClientRefIndex(index)
                                          setTempClientRef(item.clientRef || item.product?.conversion || "")
                                        }}
                                      >
                                        {item.clientRef || item.product?.conversion || <span className="italic">Clique para informar!</span>}
                                      </span>
                                    )}
                                  </TableCell>

                                  {/* Nome do Produto */}
                                  <TableCell
                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                    onClick={() => {
                                      setAddProductModalOpen(true)
                                      setSelectedProductId(item.productId)
                                      setProductQuantity(item.quantity)
                                      setSelectedDiscountId(item.discountId || null)
                                      setClientRef(item.product?.conversion || item.clientRef || "")
                                      setShouldSaveConversion(true)
                                    }}
                                  >
                                    <div>
                                      <p className="text-primary hover:underline">
                                        {item.product?.name || `Produto #${item.productId}`}
                                      </p>
                                      <p className="text-xs text-gray-500">{item.product?.code}</p>
                                    </div>
                                  </TableCell>

                                  {/* Quantidade */}
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => updateItemQuantity(index, Number.parseInt(e.target.value))}
                                      className="w-16 h-8"
                                    />
                                  </TableCell>

                                  {/* Preço Tabela */}
                                  <TableCell>
                                    {formatCurrency(item.unitPrice)}
                                  </TableCell>

                                  {/* Desconto */}
                                  <TableCell>
                                    <DiscountSelect
                                      value={item.discountId}
                                      onChange={(discountId, discountPercentage, commission) =>
                                        updateItemDiscount(index, discountId, discountPercentage, commission)
                                      }
                                      label=""
                                      className="w-28"
                                    />
                                  </TableCell>

                                  {/* Preço com Desconto */}
                                  <TableCell>
                                    <PriceInput
                                      value={getPriceWithDiscount(item)}
                                      onChange={(newPrice) => updateItemManualPrice(index, newPrice)}
                                    />
                                  </TableCell>

                                  {/* Subtotal */}
                                  <TableCell>
                                    {formatCurrency(item.subtotal)}
                                  </TableCell>

                                  {/* Ações */}
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openCalculator(item.productId)}
                                        className="text-blue-500 hover:text-blue-700"
                                        title="Calculadora de preço"
                                      >
                                        <Calculator className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          // Predefinir os valores para edição
                                          setSelectedProductId(item.productId)
                                          setProductQuantity(item.quantity)
                                          setSelectedDiscountId(item.discountId || null)
                                          setClientRef(item.product?.conversion || item.clientRef || "")
                                          setShouldSaveConversion(true)

                                          // Remover o item atual para ser substituído
                                          // Usar o índice diretamente, pois não estamos mais invertendo a ordem
                                          const actualIndex = index
                                          const updatedItems = [...orderItems]
                                          updatedItems.splice(actualIndex, 1)
                                          setOrderItems(updatedItems)

                                          // Marcar que há alterações não salvas
                                          setHasUnsavedChanges(true)

                                          // Abrir o modal para edição
                                          setAddProductModalOpen(true)
                                        }}
                                        className="text-amber-500 hover:text-amber-700"
                                        title="Editar item"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeOrderItem(index)}
                                        className="text-red-500 hover:text-red-700"
                                        title="Excluir item"
                                      >
                                        <Trash className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Order Summary */}
                    {orderItems.length > 0 && (
                      <div className="mt-6 sm:mt-8">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 sm:p-6 sm:ml-auto sm:w-96">
                          <h3 className="font-medium text-base sm:text-lg mb-3">Resumo do Pedido</h3>
                          <dl className="space-y-2">
                            <div className="flex justify-between items-center">
                              <dt className="text-sm text-gray-500 dark:text-gray-400">Subtotal (com desconto)</dt>
                              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatCurrency(totals.subtotal)}
                              </dd>
                            </div>
                            <div className="flex justify-between items-center">
                              <dt className="text-sm text-gray-500 dark:text-gray-400">Taxa de Frete</dt>
                              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                                <Input
                                  type="text"
                                  value={totals.taxes}
                                  onChange={(e) => {
                                    // Permitir apenas números e ponto decimal
                                    const inputValue = e.target.value.replace(/[^0-9.]/g, "")
                                    const value = Number.parseFloat(inputValue) || 0
                                    handleFormChange("taxes", value)
                                  }}
                                  className="w-24 h-6 text-right"
                                />
                              </dd>
                            </div>
                            <div className="flex justify-between items-center">
                              <dt className="text-sm md:hidden text-gray-500 dark:text-gray-400">Total de Peças</dt>
                              <dd className="text-sm md:hidden font-medium text-gray-900 dark:text-white">
                                {orderItems.reduce((sum, item) => sum + item.quantity, 0)}
                              </dd>
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between items-center">
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
              <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">
                    {selectedProductId ? "Editar Produto" : "Adicionar Produto"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2 sm:py-4">
                  <Tabs defaultValue="code" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="code">Código do Produto</TabsTrigger>
                      <TabsTrigger value="clientRef">Referência do Cliente</TabsTrigger>
                    </TabsList>
                    <TabsContent value="code" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="product">Produto</Label>
                        <ProductSearch
                          selectedProductId={selectedProductId}
                          onProductSelect={setSelectedProductId}
                          autoFocus={true}
                          onEnterKeyPressed={() => {
                            // Se um produto foi selecionado e tudo está OK, adicionar o produto
                            if (selectedProductId && productQuantity > 0) {
                              addProductToOrder()
                            }
                          }}
                          // Novo placeholder e instrução
                          // O componente já está atualizado para autocomplete incremental
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="clientRef" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientReference">Referência do Cliente</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="clientRefSearchInput"
                            type="text"
                            placeholder="Digite a referência do cliente"
                            value={clientRef}
                            onChange={(e) => setClientRef(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && clientRef && !isSearchingByClientRef) {
                                e.preventDefault()
                                setIsSearchingByClientRef(true)
                                fetch(`/api/products/by-client-reference/${encodeURIComponent(clientRef)}`)
                                  .then((res) => {
                                    if (!res.ok) {
                                      if (res.status === 404) {
                                        toast({
                                          title: "Referência não encontrada",
                                          description: `Não encontramos um produto com a referência "${clientRef}".`,
                                          variant: "destructive",
                                        })

                                        setIsSearchingByClientRef(false)
                                        return null
                                      }
                                      throw new Error("Erro ao buscar produto")
                                    }
                                    return res.json()
                                  })
                                  .then((product) => {
                                    if (product) {
                                      if (!product.conversion) {
                                        product.conversion = clientRef
                                      }

                                      setSelectedProductId(product.id)

                                      fetch(`/api/products/${product.id}/save-conversion`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ clientRef }),
                                      })
                                        .then((res) => res.json())
                                        .then((updatedProduct) => {
                                          console.log("Conversão salva com sucesso:", updatedProduct)
                                        })
                                        .catch((error) => {
                                          console.error("Erro ao salvar conversão:", error)
                                        })

                                      toast({
                                        title: "Produto encontrado",
                                        description: `${product.name} (${product.code}) foi selecionado.`,
                                      })
                                    }
                                  })
                                  .catch((error) => {
                                    toast({
                                      title: "Erro",
                                      description: "Falha ao buscar produto.",
                                      variant: "destructive",
                                    })
                                  })
                                  .finally(() => {
                                    setIsSearchingByClientRef(false)
                                  })
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            onClick={() => {
                              setIsSearchingByClientRef(true)
                              fetch(`/api/products/by-client-reference/${encodeURIComponent(clientRef)}`)
                                .then((res) => {
                                  if (!res.ok) {
                                    if (res.status === 404) {
                                      // Produto não encontrado, mostramos um toast
                                      toast({
                                        title: "Referência não encontrada",
                                        description: `Não encontramos um produto com a referência "${clientRef}".`,
                                        variant: "destructive",
                                      })

                                      setIsSearchingByClientRef(false)
                                      return null
                                    }
                                    throw new Error("Erro ao buscar produto")
                                  }
                                  return res.json()
                                })
                                .then((product) => {
                                  if (product) {
                                    // Adicionar a referência do cliente ao produto recebido
                                    if (!product.conversion) {
                                      product.conversion = clientRef
                                    }
                                    console.log("Produto encontrado com referência do cliente:", {
                                      produto: product.name,
                                      id: product.id,
                                      referencia: clientRef,
                                    })

                                    setSelectedProductId(product.id)

                                    // Salvar a conversão no servidor imediatamente
                                    fetch(`/api/products/${product.id}/save-conversion`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ clientRef }),
                                    })
                                      .then((res) => res.json())
                                      .then((updatedProduct) => {
                                        console.log("Conversão salva com sucesso:", updatedProduct)
                                      })
                                      .catch((error) => {
                                        console.error("Erro ao salvar conversão:", error)
                                      })

                                    toast({
                                      title: "Produto encontrado",
                                      description: `${product.name} (${product.code}) foi selecionado.`,
                                    })
                                  }
                                })
                                .catch((error) => {
                                  toast({
                                    title: "Erro",
                                    description: "Falha ao buscar produto.",
                                  })
                                })
                                .finally(() => {
                                  setIsSearchingByClientRef(false)
                                })
                            }}
                            disabled={!clientRef || isSearchingByClientRef}
                          >
                            {isSearchingByClientRef ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={productQuantity}
                        onChange={(e) => setProductQuantity(Number.parseInt(e.target.value) || 1)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && selectedProductId && productQuantity > 0) {
                            e.preventDefault()
                            addProductToOrder()
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discount">Desconto</Label>
                      <DiscountSelect
                        value={selectedDiscountId}
                        onChange={(discountId, discountPercentage, commission) => {
                          setSelectedDiscountId(discountId)
                        }}
                        label=""
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={addProductToOrder} disabled={!selectedProductId || productQuantity <= 0}>
                    Adicionar
                  </Button>
                  <Button variant="outline" onClick={() => setAddProductModalOpen(false)}>
                    Cancelar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Modal de Gerenciamento de Produtos */}
            <Dialog open={productsModalOpen} onOpenChange={setProductsModalOpen}>
              <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-lg sm:text-xl">Gerenciar Produtos</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 flex-1 overflow-y-auto">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Produtos Temporários</h3>
                    <Button
                      onClick={() => {
                        setAddProductModalOpen(true)
                        setSelectedProductId(null)
                        setClientRef("")
                        setProductQuantity(1)
                        setSelectedDiscountId(null)
                        setShouldSaveConversion(false)
                      }}
                      size="sm"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Adicionar Produto
                    </Button>
                  </div>

                  {tempOrderItems.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <p className="text-gray-500 dark:text-gray-400">
                        Nenhum produto adicionado ainda. Clique em "Adicionar Produto" para começar.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-md">
                      <div className="max-h-[60vh] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead>Qtde</TableHead>
                              <TableHead>Preço Unit.</TableHead>
                              <TableHead>Desconto</TableHead>
                              <TableHead>Subtotal</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tempOrderItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <div>
                                    <p>{item.product?.name || `Produto #${item.productId}`}</p>
                                    <p className="text-xs text-gray-500">{item.product?.code}</p>
                                    {(item.clientRef || item.product?.conversion) && (
                                      <p className="text-xs text-blue-500">
                                        Ref: {item.clientRef || item.product?.conversion}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newQty = Number.parseInt(e.target.value) || 1
                                      const newItems = [...tempOrderItems]
                                      const discountedUnitPrice = calculateDiscountedPrice(
                                        item.unitPrice,
                                        item.discountPercentage,
                                      )
                                      newItems[index] = {
                                        ...item,
                                        quantity: newQty,
                                        subtotal: Number((newQty * discountedUnitPrice).toFixed(2)),
                                      }
                                      setTempOrderItems(newItems)
                                    }}
                                    className="w-20 h-8"
                                  />
                                </TableCell>
                                <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                                <TableCell>
                                  {item.discountPercentage > 0 ? (
                                    <span>{item.discountPercentage}%</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const updatedItems = [...tempOrderItems]
                                        updatedItems.splice(index, 1)
                                        setTempOrderItems(updatedItems)
                                      }}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div>
                      {tempOrderItems.length > 0 && (
                        <p className="text-sm font-medium">
                          Total de {tempOrderItems.length} produtos |{" "}
                          {tempOrderItems.reduce((sum, item) => sum + item.quantity, 0)} unidades |{" "}
                          {formatCurrency(tempOrderItems.reduce((sum, item) => sum + item.subtotal, 0))}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={() => setProductsModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => {
                          // Importante: Primeiro salvamos o estado em uma variável
                          const itemsToAdd = [...tempOrderItems]

                          // Verificamos se há itens para adicionar
                          if (itemsToAdd.length === 0) {
                            toast({
                              title: "Nenhum produto",
                              description: "Não há produtos para adicionar ao pedido.",
                              variant: "destructive",
                            })
                            return
                          }

                          // Fechamos a modal e limpamos os itens temporários
                          setProductsModalOpen(false)
                          setTempOrderItems([])

                          // Atualizamos o estado com os novos itens
                          setOrderItems((prevItems) => {
                            const updatedItems = [...prevItems, ...itemsToAdd]
                            console.log("Novo estado de orderItems:", updatedItems)

                            // Marcar que há alterações não salvas
                            setHasUnsavedChanges(true)

                            return updatedItems
                          })

                          // Feedback para o usuário
                          toast({
                            title: "Produtos adicionados",
                            description: `${itemsToAdd.length} produtos foram adicionados ao pedido.`,
                          })
                        }}
                        disabled={tempOrderItems.length === 0}
                      >
                        Incluir no Pedido
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* PDF Preview Modal */}
            <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Visualização do Pedido em PDF</DialogTitle>
                </DialogHeader>

                <div className="flex items-center mb-4 space-x-2">
                  <input
                    type="checkbox"
                    id="showClientRefsInPdf"
                    checked={showClientRefsInPdf}
                    onChange={(e) => setShowClientRefsInPdf(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="showClientRefsInPdf" className="text-sm font-normal">
                    Exibir Referências do Cliente no PDF
                  </Label>
                </div>
                <div className="flex items-center mb-4 space-x-2">
                  <input
                    type="checkbox"
                    id="showClientRefsInPrintModal"
                    checked={showClientRefsInPrint}
                    onChange={(e) => setShowClientRefsInPrint(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="showClientRefsInPrintModal" className="text-sm font-normal">
                    Exibir Referências do Cliente na Impressão
                  </Label>
                </div>

                <PdfTemplate
                  order={preparePdfData().order}
                  items={preparePdfData().items}
                  onClose={() => setShowPdfPreview(false)}
                  showClientRefs={showClientRefsInPdf}
                />
              </DialogContent>
            </Dialog>

            {/* Price Calculator Modal */}
            <PriceCalculatorModal open={calculatorOpen} onOpenChange={setCalculatorOpen} product={calculatorProduct} />
          </div>
        )}
      </div>

      {/* Componente de ajuda com atalhos de teclado */}
      {showShortcutsHelp && <KeyboardShortcutsHelp />}

      {/* Modal para adicionar condição de pagamento personalizada */}
      <Dialog open={addPaymentTermModalOpen} onOpenChange={setAddPaymentTermModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nova Condição de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newPaymentTerm">Condição de Pagamento</Label>
              <Input
                id="newPaymentTerm"
                placeholder="Ex: Boleto 30/45/60d"
                value={newPaymentTerm}
                onChange={(e) => setNewPaymentTerm(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleAddPaymentTerm}>
              Adicionar
            </Button>
            <Button type="button" variant="outline" onClick={() => setAddPaymentTermModalOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
