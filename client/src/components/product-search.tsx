import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Search, X, Package, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { Product } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
  const [open, setOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Buscar produto selecionado pelo ID
  const { data: selectedProduct } = useQuery<Product>({
    queryKey: ["/api/products", selectedProductId],
    enabled: !!selectedProductId,
  });
  
  // Buscar todos os produtos (igual à tela de produtos)
  const { data: allProducts = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  
  // Filtrar produtos localmente, igual à tela de produtos
  const filteredProducts = searchTerm.trim().length < 2 ? [] : allProducts.filter(product => {
    const term = searchTerm.trim().toLowerCase();
    return (
      product.name?.toLowerCase().includes(term) ||
      product.code?.toLowerCase().includes(term) ||
      product.brand?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term) ||
      product.conversion?.toLowerCase().includes(term)
    );
  });
  
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredProducts]);
  
  const handleProductSelect = (productId: number) => {
    onProductSelect(productId);
    setOpen(false);
    if (onEnterKeyPressed) {
      onEnterKeyPressed();
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (filteredProducts.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < filteredProducts.length - 1 ? prev + 1 : prev);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
        
      case 'Enter':
        e.preventDefault();
        handleProductSelect(filteredProducts[highlightedIndex].id);
        break;
        
      case 'Escape':
        setOpen(false);
        break;
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
                ref={inputRef}
                placeholder="Busque por nome, código, marca, categoria ou referência do cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus={true}
                autoComplete="off"
                className="pl-9 pr-8"
              />
              {isLoadingProducts && (
                <Loader2 className="absolute right-2 top-2 h-5 w-5 animate-spin text-primary" />
              )}
            </div>
            {filteredProducts.length > 0 ? (
              <ScrollArea className="max-h-72 border rounded-md">
                <ul>
                  {filteredProducts.map((product, idx) => (
                    <li
                      key={product.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-primary/10",
                        idx === highlightedIndex && "bg-primary/10"
                      )}
                      onClick={() => handleProductSelect(product.id)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Código: {product.code} • Marca: {product.brand || "-"} • Categoria: {product.category || "-"}
                        </span>
                        {product.conversion && (
                          <span className="text-xs text-blue-600">Ref. Cliente: {product.conversion}</span>
                        )}
                      </div>
                      <Badge variant="outline">Estoque: {product.stockQuantity ?? "-"}</Badge>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              !isLoadingProducts && searchTerm.length >= 2 && (
                <div className="text-center text-muted-foreground text-sm py-4">
                  Nenhum produto encontrado.
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}