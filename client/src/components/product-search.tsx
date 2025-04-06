import { useState, useRef, useEffect, KeyboardEvent, useCallback } from "react";
import { Check, ChevronsUpDown, Search, X, Tag, Package, FileText, Bookmark, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Product } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

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
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Função para buscar produtos diretamente
  const fetchProducts = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 1) {
      setLocalProducts([]);
      return;
    }
    
    try {
      setIsSearching(true);
      console.log("Buscando produtos para: ", query);
      const response = await fetch(`/api/products/search/${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar produtos');
      }
      const data = await response.json();
      console.log("Produtos encontrados:", data.length);
      setLocalProducts(data || []);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      setLocalProducts([]);
    } finally {
      setIsSearching(false);
    }
  }, []);
  
  // Controlar o timeout do debounce
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  // Função de debounce
  const debouncedFetch = useCallback((query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      fetchProducts(query);
    }, 500); // Aumentamos o tempo de debounce para 500ms para evitar requisições excessivas
  }, [fetchProducts]);

  // Buscar produto selecionado pelo ID
  const { data: selectedProduct } = useQuery<Product>({
    queryKey: ["/api/products", selectedProductId],
    enabled: !!selectedProductId,
    placeholderData: undefined
  });

  // Efeito para chamar a busca quando o termo muda
  useEffect(() => {
    if (open && searchQuery.trim().length > 0) {
      debouncedFetch(searchQuery);
    }
  }, [searchQuery, open, debouncedFetch]);

  // Resetar o índice destacado quando muda a busca ou abre o componente
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, open]);

  // Foco no input de pesquisa quando o popover abre
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300); // Aumentado para 300ms para dar mais tempo ao componente
    }
  }, [open]);

  // Abrir automaticamente o popover quando autoFocus é true
  useEffect(() => {
    if (autoFocus && !open && !disabled) {
      setTimeout(() => {
        setOpen(true);
      }, 100);
    }
  }, [autoFocus, disabled]);

  // Evitamos a abertura automática que estava causando travamento
  // devido à grande quantidade de produtos (5.814)

  // Limpar a seleção
  const clearSelection = () => {
    onProductSelect(null);
    setSearchQuery("");
  };

  // Lidar com a navegação por teclado
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Limite para os resultados visíveis
    const numResults = localProducts.length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < numResults - 1 ? prev + 1 : prev));
    } 
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } 
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (numResults > 0) {
        const product = localProducts[highlightedIndex];
        onProductSelect(product.id);
        setOpen(false);
        
        // Se a função de callback para o Enter existir, chamar
        if (onEnterKeyPressed) {
          onEnterKeyPressed();
        }
      }
    } 
    else if (e.key === 'Escape') {
      setOpen(false);
    }
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
                    clearSelection();
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
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[400px] max-h-[500px]" side="bottom" align="start">
        <Command className="rounded-lg border shadow-md">
          <CommandInput 
            placeholder="Buscar por nome, código, marca ou referência..." 
            onKeyDown={handleKeyDown}
            value={searchQuery}
            onValueChange={setSearchQuery}
            ref={inputRef}
            className="h-9"
            autoFocus={autoFocus}
          />
          <CommandList className="max-h-[350px] overflow-auto">
            {!isSearching && searchQuery.trim().length >= 1 && localProducts.length === 0 && (
              <CommandEmpty className="py-6 text-center text-sm">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
                  <p>Nenhum produto encontrado</p>
                  <p className="text-xs text-muted-foreground">Tente outros termos de busca</p>
                </div>
              </CommandEmpty>
            )}
            
            {(!searchQuery.trim()) && !isSearching && (
              <div className="py-6 text-center text-sm">
                <div className="flex flex-col items-center gap-2">
                  <Search className="h-10 w-10 text-muted-foreground opacity-50" />
                  <p>Digite o código ou referência do produto</p>
                  <p className="text-xs text-muted-foreground">Os resultados aparecerão enquanto você digita</p>
                </div>
              </div>
            )}
            <CommandGroup heading="Produtos">
              {isSearching ? (
                <div className="py-6 text-center text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p>Buscando produtos...</p>
                  </div>
                </div>
              ) : (
                localProducts.map((product: Product, index: number) => (
                  <CommandItem
                    key={product.id}
                    value={product.id.toString()}
                    onSelect={() => {
                      onProductSelect(product.id);
                      setOpen(false);
                      if (onEnterKeyPressed) {
                        onEnterKeyPressed();
                      }
                    }}
                    className={cn(
                      "flex flex-col items-start py-3",
                      index === highlightedIndex && "bg-accent"
                    )}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="flex w-full gap-2 items-start">
                      <div className="bg-primary/10 p-1 rounded-md flex-shrink-0">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="font-medium flex items-center gap-2">
                          <span className="bg-primary/10 px-2 py-0.5 rounded-md text-primary font-bold">{product.name}</span>
                          {selectedProductId === product.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-1 mt-1">
                          <div className="flex items-center">
                            <Tag className="h-3 w-3 mr-1" />
                            <span className="font-semibold text-sm">{product.code}</span>
                          </div>
                          {product.price && (
                            <div className="flex items-center ml-2">
                              <span>{formatCurrency(Number(product.price))}</span>
                            </div>
                          )}
                          {product.brand && (
                            <Badge variant="outline" className="text-xs h-5 ml-1">
                              {product.brand}
                            </Badge>
                          )}
                        </div>
                        {product.conversion && (
                          <div className="mt-1">
                            <Badge variant="secondary" className="text-xs h-5 flex items-center gap-1">
                              <Bookmark className="h-3 w-3" />
                              <span>Ref: <span className="font-semibold">{product.conversion}</span> (já usado antes)</span>
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
            {searchQuery && localProducts.length > 20 && (
              <div className="py-2 px-2 text-xs text-center text-muted-foreground border-t">
                Mostrando os primeiros 20 resultados de {localProducts.length}. 
                Refine sua busca para resultados mais precisos.
              </div>
            )}
          </CommandList>
          <div className="border-t px-2 py-2 flex gap-1 text-xs text-muted-foreground">
            <div className="flex items-center">
              <span className="px-1 py-0.5 rounded bg-muted mr-1 text-[10px]">↑↓</span>
              <span>Navegar</span>
            </div>
            <div className="flex items-center ml-2">
              <span className="px-1 py-0.5 rounded bg-muted mr-1 text-[10px]">Enter</span>
              <span>Selecionar</span>
            </div>
            <div className="flex items-center ml-2">
              <span className="px-1 py-0.5 rounded bg-muted mr-1 text-[10px]">Esc</span>
              <span>Fechar</span>
            </div>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}