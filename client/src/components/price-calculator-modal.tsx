import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Product } from "@shared/schema";
import { DiscountSelect } from "./discount-select";
import { formatCurrency } from "@/lib/utils";
import { Calculator } from "lucide-react";

interface PriceCalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function PriceCalculatorModal({ open, onOpenChange, product }: PriceCalculatorModalProps) {
  const [discountId, setDiscountId] = useState<number | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [commission, setCommission] = useState(0);

  if (!product) return null;

  const basePrice = Number(product.price);
  const discountAmount = basePrice * (discountPercentage / 100);
  const priceWithDiscount = basePrice - discountAmount;
  const commissionAmount = priceWithDiscount * (commission / 100);

  const handleDiscountChange = (id: number | null, percentage: number, comm: number) => {
    setDiscountId(id);
    setDiscountPercentage(percentage);
    setCommission(comm);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora de Preço
          </DialogTitle>
          <DialogDescription>
            Calcule rapidamente o preço de um produto com descontos
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-3">
          <div className="flex flex-col gap-1.5 border-b pb-3">
            <div className="flex justify-between">
              <span className="font-medium">Produto:</span>
              <span>{product.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Código:</span>
              <span>{product.code}</span>
            </div>
            {product.brand && (
              <div className="flex justify-between">
                <span className="font-medium">Marca:</span>
                <span>{product.brand}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-medium">Preço de tabela:</span>
              <span className="font-semibold">{formatCurrency(basePrice)}</span>
            </div>
          </div>
          
          <DiscountSelect
            value={discountId}
            onChange={handleDiscountChange}
            label="Selecione o desconto"
          />
          
          <div className="rounded-md border p-4 space-y-2 bg-muted/30">
            <div className="flex justify-between">
              <span className="font-medium">Preço de tabela:</span>
              <span>{formatCurrency(basePrice)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Desconto ({discountPercentage}%):</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-bold text-primary">
              <span>Preço com desconto:</span>
              <span>{formatCurrency(priceWithDiscount)}</span>
            </div>
            {commission > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Comissão ({commission}%):</span>
                <span>{formatCurrency(commissionAmount)}</span>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}