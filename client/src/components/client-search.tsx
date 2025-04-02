import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Client } from "@shared/schema";

interface ClientSearchProps {
  clients: Client[] | undefined;
  selectedClientId: number | null;
  onClientSelect: (clientId: number | null) => void;
  disabled?: boolean;
}

export function ClientSearch({ 
  clients = [],
  selectedClientId,
  onClientSelect,
  disabled = false
}: ClientSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  // Debug dos clientes recebidos
  useEffect(() => {
    console.log("ClientSearch - Clientes recebidos:", clients.length);
  }, [clients]);

  // Filtrar clientes - implementação específica para os campos mais importantes
  const filteredClients = clients.filter(client => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    console.log("Buscando por:", query);
    
    // Verifica apenas nos campos específicos mais utilizados
    const nameMatch = client.name?.toLowerCase().includes(query) || false;
    const codeMatch = client.code?.toLowerCase().includes(query) || false;
    const cnpjMatch = client.cnpj?.toLowerCase().includes(query) || false;
    const cityMatch = client.city?.toLowerCase().includes(query) || false;
    const phoneMatch = client.phone?.toLowerCase().includes(query) || false;
    
    const matches = nameMatch || codeMatch || cnpjMatch || cityMatch || phoneMatch;
    if (matches) {
      console.log("Cliente encontrado na busca:", client.name);
    }
    
    return matches;
  });

  // Cliente selecionado
  const selectedClient = clients.find(c => c.id === selectedClientId);

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
    onClientSelect(null);
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
            !selectedClient && "text-muted-foreground"
          )}
        >
          {selectedClient ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col items-start">
                <span className="font-medium">{selectedClient.name}</span>
                <span className="text-xs text-muted-foreground">
                  {selectedClient.cnpj && `CNPJ: ${selectedClient.cnpj}`}
                  {selectedClient.code && ` • Código: ${selectedClient.code}`}
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
            <span>Selecione ou pesquise um cliente</span>
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
              placeholder="Buscar por nome, código, CNPJ ou telefone..."
              className="flex h-9 w-full rounded-md bg-transparent py-2 px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="max-h-[300px] overflow-auto py-1">
            {filteredClients.length === 0 ? (
              <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                Nenhum cliente encontrado. Tente outros termos de busca.
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="px-2 py-2 hover:bg-accent cursor-pointer flex items-center"
                  onClick={() => {
                    console.log("Clique no cliente:", client.id, client.name);
                    onClientSelect(client.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedClientId === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{client.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {client.cnpj && `CNPJ: ${client.cnpj}`}
                      {client.code && ` • Código: ${client.code}`}
                      {client.phone && ` • Tel: ${client.phone}`}
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