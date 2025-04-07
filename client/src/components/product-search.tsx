import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Search, X, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { Product } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductSearchProps {
  selectedProductId: number | null;
  onProductSelect: (productId: number | null) => void;
  onEnterKeyPressed?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function ProductSearch({ 
  selectedProductId,
  onProductSelect,
  onEnterKeyPressed,
  autoFocus = false,
  disabled = false
}: ProductSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Buscar produto selecionado pelo ID
  const { data: selectedProduct } = useQuery<Product>({
    queryKey: ["/api/products", selectedProductId],
    enabled: !!selectedProductId,
  });
  
  // Buscar produtos
  const searchProducts = async (term: string) => {
    if (!term || term.length < 1) {
      setProducts([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/products/search/${encodeURIComponent(term)}`);
      if (!response.ok) {
        throw new Error("Erro ao buscar produtos");
      }
      const data = await response.json();
      console.log(`Encontrados ${data.length} produtos para "${term}"`);
      setProducts(data);
    } catch (error) {
      console.error("Erro na busca:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Debounce para a busca
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        searchProducts(searchTerm);
      } else {
        setProducts([]);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Limpar a busca quando fechar o diálogo
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
    }
  }, [open]);
  
  // Focar no input quando abrir
  useEffect(() => {
    if (open) {
      // Usar um timeout para garantir que o DOM tenha sido atualizado
      setTimeout(() => {
        const inputElement = document.getElementById("product-search-input");
        if (inputElement) {
          inputElement.focus();
        }
      }, 50);
    }
  }, [open]);
  
  const handleProductSelect = (productId: number) => {
    onProductSelect(productId);
    setOpen(false);
    if (onEnterKeyPressed) {
      onEnterKeyPressed();
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && products.length > 0) {
      e.preventDefault();
      handleProductSelect(products[0].id);
    }
  };
  
  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "w-full justify-between text-left font-normal",
          !selectedProduct && "text-muted-foreground"
        )}
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        {selectedProduct ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1 rounded-md">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium">{selectedProduct.name}</span>
                <span className="text-xs text-muted-foreground">
                  {selectedProduct.code && `Código: ${selectedProduct.code}`}
                  {selectedProduct.price && ` • ${formatCurrency(Number(selectedProduct.price))}`}
                </span>
              </div>
            </div>
            {!disabled && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onProductSelect(null);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span>Pesquisar produto</span>
          </div>
        )}
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buscar Produto</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Input
                id="product-search-input"
                placeholder="Digite código, nome ou referência..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus={true}
                autoComplete="off"
              />
              {loading && (
                <div className="absolute right-2 top-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            
            {searchTerm && !loading && products.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum produto encontrado
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-start p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => handleProductSelect(product.id)}
                    >
                      <div className="bg-primary/10 p-1 rounded-md mr-2">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Código: {product.code} • {formatCurrency(Number(product.price || 0))}
                        </div>
                        {product.brand && (
                          <div className="text-xs text-muted-foreground">
                            Marca: {product.brand}
                          </div>
                        )}
                        {product.conversion && (
                          <div className="text-xs bg-primary/10 px-2 py-0.5 rounded mt-1 text-primary inline-block">
                            Referência: {product.conversion}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}