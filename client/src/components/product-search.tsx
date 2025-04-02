import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { Product } from "@shared/schema";

interface ProductSearchProps {
  products: Product[] | undefined;
  selectedProductId: number | null;
  onProductSelect: (productId: number | null) => void;
  disabled?: boolean;
}

export function ProductSearch({ 
  products = [],
  selectedProductId,
  onProductSelect,
  disabled = false
}: ProductSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  // Debug dos produtos recebidos
  useEffect(() => {
    console.log("ProductSearch - Produtos recebidos:", products.length);
  }, [products]);

  // Filtrar produtos - implementação específica para os campos mais importantes
  const filteredProducts = products.filter(product => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    
    // Verifica apenas nos campos específicos mais utilizados
    const nameMatch = product.name?.toLowerCase().includes(query) || false;
    const codeMatch = product.code?.toLowerCase().includes(query) || false;
    const descriptionMatch = product.description?.toLowerCase().includes(query) || false;
    const brandMatch = product.brand?.toLowerCase().includes(query) || false;
    const categoryMatch = product.category?.toLowerCase().includes(query) || false;
    const conversionMatch = product.conversion?.toLowerCase().includes(query) || false;
    
    const matches = nameMatch || codeMatch || descriptionMatch || brandMatch || categoryMatch || conversionMatch;
    
    return matches;
  });

  // Produto selecionado
  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Foco no input de pesquisa quando o popover abre
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Limpar a seleção
  const clearSelection = () => {
    onProductSelect(null);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !selectedProduct && "text-muted-foreground"
          )}
        >
          {selectedProduct ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col items-start">
                <span className="font-medium">{selectedProduct.name}</span>
                <span className="text-xs text-muted-foreground">
                  {selectedProduct.code && `Código: ${selectedProduct.code}`}
                  {selectedProduct.price && ` • Preço: ${formatCurrency(Number(selectedProduct.price))}`}
                </span>
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelection();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ) : (
            <span>Selecione ou pesquise um produto</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[350px]">
        <div className="flex flex-col">
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              placeholder="Buscar por nome, código, marca ou referência do cliente..."
              className="flex h-9 w-full rounded-md bg-transparent py-2 px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="max-h-[300px] overflow-auto py-1">
            {filteredProducts.length === 0 ? (
              <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado. Tente outros termos de busca.
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="px-2 py-2 hover:bg-accent cursor-pointer flex items-center"
                  onClick={() => {
                    console.log("Clique no produto:", product.id, product.name);
                    onProductSelect(product.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedProductId === product.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {product.code && `Cód: ${product.code}`}
                      {product.price && ` • ${formatCurrency(Number(product.price))}`}
                      {product.brand && ` • ${product.brand}`}
                      {product.conversion && (
                        <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Ref: {product.conversion}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}