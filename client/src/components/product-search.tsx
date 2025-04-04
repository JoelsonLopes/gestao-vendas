import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Check, ChevronsUpDown, Search, X, Tag, Package, FileText, Bookmark } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Product } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface ProductSearchProps {
  products: Product[] | undefined;
  selectedProductId: number | null;
  onProductSelect: (productId: number | null) => void;
  onEnterKeyPressed?: () => void; // Nova propriedade para capturar a tecla Enter
  autoFocus?: boolean; // Para focar automaticamente ao abrir
  disabled?: boolean;
}

export function ProductSearch({ 
  products = [],
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
    const numResults = filteredProducts.length;
    
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
        const product = filteredProducts[highlightedIndex];
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
            className="h-9"
            autoFocus={autoFocus}
          />
          <CommandList className="max-h-[350px] overflow-auto">
            <CommandEmpty className="py-6 text-center text-sm">
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
                <p>Nenhum produto encontrado</p>
                <p className="text-xs text-muted-foreground">Tente outros termos de busca</p>
              </div>
            </CommandEmpty>
            <CommandGroup heading="Produtos">
              {filteredProducts.map((product, index) => (
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
                        {product.name}
                        {selectedProductId === product.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-1 mt-1">
                        <div className="flex items-center">
                          <Tag className="h-3 w-3 mr-1" />
                          <span>{product.code}</span>
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
                            <span>Ref: {product.conversion}</span>
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {searchQuery && filteredProducts.length > 20 && (
              <div className="py-2 px-2 text-xs text-center text-muted-foreground border-t">
                Mostrando os primeiros 20 resultados de {filteredProducts.length}. 
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