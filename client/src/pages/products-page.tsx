import { useState } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DataTable } from "@/components/data-table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, PlusCircle, Import, Package, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Product, InsertProduct } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { ImportModal } from "@/components/import-modal";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export default function ProductsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [inlineEdit, setInlineEdit] = useState<{ id: number; field: string; value: string } | null>(null);

  // Fetch products
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Product form validation schema
  const productFormSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    description: z.string().optional(),
    code: z.string().min(1, "Código é obrigatório"),
    barcode: z.string().optional(),
    category: z.string().optional(),
    brand: z.string().optional(),
    equivalentBrands: z.array(z.string()).optional(),
    price: z.coerce.number().positive("Preço deve ser positivo"),
    stockQuantity: z.coerce.number().int().default(0),
    active: z.boolean().default(true),
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (product: z.infer<typeof productFormSchema>) => {
      const response = await apiRequest("POST", "/api/products", product);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setProductModalOpen(false);
      toast({
        title: "Produto criado",
        description: "Produto foi criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao criar produto: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProduct> }) => {
      const response = await apiRequest("PUT", `/api/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setProductModalOpen(false);
      setEditingProduct(null);
      toast({
        title: "Produto atualizado",
        description: "Produto foi atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar produto: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Inline edit mutation
  const inlineEditMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProduct> }) => {
      const response = await apiRequest("PUT", `/api/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setInlineEdit(null);
      toast({
        title: "Produto atualizado",
        description: "Informação atualizada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Import products mutation
  const importProductsMutation = useMutation({
    mutationFn: async (products: any[]) => {
      const response = await apiRequest("POST", "/api/products/import", products);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setImportModalOpen(false);
      toast({
        title: "Produtos importados",
        description: "Produtos foram importados com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao importar produtos: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      code: "",
      barcode: "",
      category: "",
      brand: "",
      equivalentBrands: [],
      price: 0,
      stockQuantity: 0,
      active: true,
    },
  });

  const openNewProductModal = () => {
    form.reset({
      name: "",
      description: "",
      code: "",
      barcode: "",
      category: "",
      brand: "",
      equivalentBrands: [],
      price: 0,
      stockQuantity: 0,
      active: true,
    });
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      code: product.code,
      barcode: product.barcode || "",
      category: product.category || "",
      brand: product.brand || "",
      equivalentBrands: product.equivalentBrands || [],
      price: Number(product.price),
      stockQuantity: product.stockQuantity || 0,
      active: product.active,
    });
    setProductModalOpen(true);
  };

  const onSubmit = (data: z.infer<typeof productFormSchema>) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleImport = (data: any[]) => {
    if (data.length > 0) {
      // Processar registros e normalizar os dados para o formato esperado pela API
      const transformedData = data.map(item => {
        // Log para debug
        console.log("Processando item:", item);
        
        // Mapeamento de campos para lidar com diferentes nomenclaturas
        const processedItem = {
          name: item.name || item.Nome || item.NOME || item.produto || item.PRODUTO || "",
          code: item.code || item.Codigo || item.CODIGO || item.código || item.CÓDIGO || "",
          description: item.description || item.Description || item.descricao || item.DESCRICAO || "",
          barcode: item.barcode || item.Barcode || item.codigoBarras || item.CODIGOBARRAS || item.ean || item.EAN || "",
          category: item.category || item.Category || item.categoria || item.CATEGORIA || "",
          brand: item.brand || item.Brand || item.marca || item.MARCA || "",
          
          // Campos numéricos precisam ser convertidos corretamente
          price: parseFloat(String(item.price || item.Price || item.preco || item.PRECO || item.valor || item.VALOR || "0").replace(',', '.')),
          stockQuantity: parseInt(String(item.stockQuantity || item.StockQuantity || item.estoque || item.ESTOQUE || "0")),
          
          // Campo booleano
          active: item.active === true || 
                  item.active === "true" || 
                  item.active === "sim" || 
                  item.active === "yes" || 
                  item.active === "1" || 
                  item.active === 1 ||
                  item.ativo === true || 
                  item.ativo === "true" || 
                  item.ativo === "sim" || 
                  item.ativo === "yes" || 
                  item.ativo === "1" || 
                  item.ativo === 1 || 
                  true, // Por padrão, produtos são ativos
        };
        
        // Validação básica: se não tiver nome ou código, gerar um código aleatório
        if (!processedItem.code) {
          processedItem.code = `PROD${Date.now().toString().substring(7)}`;
        }
        
        // Se não tiver nome, usar o código como nome
        if (!processedItem.name) {
          processedItem.name = `Produto ${processedItem.code}`;
        }
        
        // Garantir que o preço seja um número válido
        if (isNaN(processedItem.price) || processedItem.price < 0) {
          processedItem.price = 0;
        }
        
        // Garantir que o estoque seja um número válido
        if (isNaN(processedItem.stockQuantity) || processedItem.stockQuantity < 0) {
          processedItem.stockQuantity = 0;
        }
        
        console.log("Item processado:", processedItem);
        return processedItem;
      });
      
      importProductsMutation.mutate(transformedData);
    }
  };

  const startInlineEdit = (id: number, field: string, value: string) => {
    setInlineEdit({ id, field, value });
  };

  const saveInlineEdit = () => {
    if (!inlineEdit) return;
    
    const { id, field, value } = inlineEdit;
    const data: Partial<InsertProduct> = {};
    
    // Convert to proper type based on field
    if (field === 'price') {
      data[field] = parseFloat(value);
    } else if (field === 'stockQuantity') {
      data[field] = parseInt(value);
    } else {
      data[field] = value;
    }
    
    inlineEditMutation.mutate({ id, data });
  };

  const cancelInlineEdit = () => {
    setInlineEdit(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Produtos</h1>
          <div className="flex gap-2">
            <Button onClick={() => setImportModalOpen(true)} variant="outline">
              <Import className="mr-2 h-4 w-4" />
              Importar
            </Button>
            {user?.role === "admin" && (
              <Button onClick={openNewProductModal}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            )}
          </div>
        </div>

        {/* Products Table */}
        {isLoadingProducts ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <DataTable
            columns={[
              {
                header: "Código",
                accessorKey: "code",
                sortable: true,
              },
              {
                header: "Produto",
                accessorKey: "name",
                sortable: true,
                cell: (product) => (
                  <div className="flex items-center">
                    <Package className="h-5 w-5 mr-2 text-gray-400" />
                    <span>{product.name}</span>
                  </div>
                ),
              },
              {
                header: "Categoria",
                accessorKey: "category",
                sortable: true,
              },
              {
                header: "Marca",
                accessorKey: "brand",
                sortable: true,
              },
              {
                header: "Preço",
                accessorKey: "price",
                sortable: true,
                cell: (product) => {
                  if (inlineEdit && inlineEdit.id === product.id && inlineEdit.field === "price") {
                    return (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24 h-8"
                          value={inlineEdit.value}
                          onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                        />
                        <button onClick={saveInlineEdit} className="text-green-600 hover:text-green-800">
                          <Save size={16} />
                        </button>
                        <button onClick={cancelInlineEdit} className="text-red-600 hover:text-red-800">
                          <X size={16} />
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center">
                      <span>{formatCurrency(Number(product.price))}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          startInlineEdit(product.id, "price", product.price.toString());
                        }}
                      >
                        <Edit size={14} />
                      </Button>
                    </div>
                  );
                },
              },
              {
                header: "Estoque",
                accessorKey: "stockQuantity",
                sortable: true,
                cell: (product) => {
                  if (inlineEdit && inlineEdit.id === product.id && inlineEdit.field === "stockQuantity") {
                    return (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          className="w-20 h-8"
                          value={inlineEdit.value}
                          onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                        />
                        <button onClick={saveInlineEdit} className="text-green-600 hover:text-green-800">
                          <Save size={16} />
                        </button>
                        <button onClick={cancelInlineEdit} className="text-red-600 hover:text-red-800">
                          <X size={16} />
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center">
                      <span>{product.stockQuantity}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          startInlineEdit(product.id, "stockQuantity", product.stockQuantity?.toString() || "0");
                        }}
                      >
                        <Edit size={14} />
                      </Button>
                    </div>
                  );
                },
              },
              {
                header: "Status",
                accessorKey: "active",
                cell: (product) => (
                  <Badge variant={product.active ? "success" : "secondary"}>
                    {product.active ? "Ativo" : "Inativo"}
                  </Badge>
                ),
              },
            ]}
            data={products || []}
            keyField="id"
            searchable
            searchPlaceholder="Buscar produtos por nome, código, categoria ou marca..."
            onRowClick={user?.role === "admin" ? openEditProductModal : undefined}
          />
        )}

        {/* Product Form Dialog */}
        <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? "Edite as informações do produto abaixo."
                  : "Preencha os detalhes para criar um novo produto."}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do produto" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Código do produto" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Descrição do produto" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Barras</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Código de barras" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Categoria" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Marca" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stockQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade em Estoque</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Status</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={
                      createProductMutation.isPending || updateProductMutation.isPending
                    }
                  >
                    {(createProductMutation.isPending || updateProductMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingProduct ? "Atualizar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Import Modal */}
        <ImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImport={handleImport}
          title="Importar Produtos"
          description="Importe seu catálogo de produtos a partir de arquivo CSV ou Excel. O sistema reconhecerá diferentes formatos de cabeçalho."
          templateFields={["name", "code", "description", "barcode", "category", "brand", "price", "stockQuantity", "active"]}
          loading={importProductsMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
