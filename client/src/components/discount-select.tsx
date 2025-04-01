import React, { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Discount } from "@shared/schema";
import { Label } from "@/components/ui/label";

interface DiscountSelectProps {
  value: number | null;
  onChange: (discountId: number | null, discountPercentage: number, commission: number) => void;
  label?: string;
  className?: string;
}

export function DiscountSelect({ value, onChange, label = "Desconto", className }: DiscountSelectProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(value ? String(value) : undefined);

  const { data: discounts, isLoading } = useQuery<Discount[]>({
    queryKey: ["/api/discounts"],
  });

  useEffect(() => {
    setSelectedId(value ? String(value) : undefined);
  }, [value]);

  const handleChange = (val: string) => {
    setSelectedId(val);
    
    if (val === "none") {
      onChange(null, 0, 0);
      return;
    }
    
    const discountId = parseInt(val);
    const selectedDiscount = discounts?.find(d => d.id === discountId);
    
    if (selectedDiscount) {
      onChange(
        discountId, 
        Number(selectedDiscount.percentage), 
        Number(selectedDiscount.commission)
      );
    }
  };

  return (
    <div className={className}>
      {label && <Label className="mb-1.5 block">{label}</Label>}
      <Select
        value={selectedId || "none"}
        onValueChange={handleChange}
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione um desconto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Nenhum</SelectItem>
          {discounts?.map((discount) => (
            <SelectItem key={discount.id} value={discount.id.toString()}>
              {discount.name} ({discount.percentage}% / {discount.commission}%)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
