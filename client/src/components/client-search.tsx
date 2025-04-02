import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  // Filtrar clientes com base na query de pesquisa
  const filteredClients = clients.filter(client => {
    if (!searchQuery.trim()) return true; // Se não houver query, retorna todos os clientes
    
    const query = searchQuery.toLowerCase().trim();
    
    // Para debug: verificar a consulta por código específico
    if (query === "8028") {
      console.log("Buscando cliente com código 8028");
      console.log("Cliente encontrado:", client.code === "8028" ? "SIM" : "NÃO");
      if (client.code) {
        console.log(`Código do cliente: ${client.code}, tipo: ${typeof client.code}`);
      }
    }
    
    // Verifica cada propriedade do cliente, com tratamento para valores nulos ou undefined
    const matchName = client.name && client.name.toLowerCase().includes(query);
    const matchCode = client.code && (
      client.code === query || // Verificação exata de código
      client.code.toLowerCase() === query ||
      client.code.toLowerCase().includes(query)
    );
    const matchCNPJ = client.cnpj && client.cnpj.toLowerCase().includes(query);
    const matchPhone = client.phone && client.phone.toLowerCase().includes(query);
    const matchId = client.id.toString().includes(query);
    
    return matchName || matchCode || matchCNPJ || matchPhone || matchId;
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
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              ref={inputRef}
              placeholder="Buscar por nome, código, CNPJ ou telefone..."
              className="flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0"
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
          </div>
          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {filteredClients.map((client) => (
              <CommandItem
                key={client.id}
                value={client.id.toString()}
                onSelect={() => {
                  onClientSelect(client.id);
                  setOpen(false);
                }}
                className="flex flex-col items-start py-2"
              >
                <div className="flex items-center w-full">
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedClientId === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{client.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {client.cnpj && (
                        <Badge variant="outline" className="text-xs">
                          CNPJ: {client.cnpj}
                        </Badge>
                      )}
                      {client.code && (
                        <Badge variant="outline" className="text-xs">
                          Cód: {client.code}
                        </Badge>
                      )}
                      {client.phone && (
                        <Badge variant="outline" className="text-xs">
                          Telefone: {client.phone}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}