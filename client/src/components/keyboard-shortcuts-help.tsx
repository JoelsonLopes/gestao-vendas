import { useState } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-4 right-4 rounded-full shadow-md"
              onClick={() => setIsOpen(true)}
            >
              <Keyboard className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Atalhos de teclado (Shift+?)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Atalhos de Teclado
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <div className="flex items-center justify-center">
                <kbd className="px-2 py-1 bg-primary/10 rounded text-primary font-mono">A</kbd>
              </div>
              <div>Adicionar novo produto</div>
            </div>
            
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <div className="flex items-center justify-center">
                <kbd className="px-2 py-1 bg-primary/10 rounded text-primary font-mono">S</kbd>
              </div>
              <div>Salvar pedido</div>
            </div>
            
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <div className="flex items-center justify-center">
                <kbd className="px-2 py-1 bg-primary/10 rounded text-primary font-mono">P</kbd>
              </div>
              <div>Visualizar pedido/Imprimir</div>
            </div>
            
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <div className="flex items-center justify-center">
                <kbd className="px-2 py-1 bg-primary/10 rounded text-primary font-mono">C</kbd>
              </div>
              <div>Abrir calculadora de preços</div>
            </div>
            
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <div className="flex items-center justify-center">
                <kbd className="px-2 py-1 bg-primary/10 rounded text-primary font-mono">Esc</kbd>
              </div>
              <div>Voltar para lista de pedidos / fechar modais</div>
            </div>
            
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <div className="flex items-center justify-center">
                <kbd className="px-2 py-1 bg-primary/10 rounded text-primary font-mono">
                  Shift+?
                </kbd>
              </div>
              <div>Mostrar/ocultar esta ajuda</div>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-muted-foreground">
            Nota: Os atalhos funcionam apenas quando nenhum campo de texto está selecionado.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}