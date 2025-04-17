import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

// Calculate discounted price based on discount percentage
export function calculateDiscountedPrice(price: number, discountPercentage: number): number {
  return Number((price * (1 - discountPercentage / 100)).toFixed(2));
}

// Format CNPJ with mask
export function formatCnpj(cnpj: string): string {
  // Remove non-numeric characters
  const numericCnpj = cnpj.replace(/\D/g, '');
  
  // Apply mask
  return numericCnpj
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

// Validate CNPJ
export function isValidCnpj(cnpj: string): boolean {
  const numericCnpj = cnpj.replace(/\D/g, '');
  
  if (numericCnpj.length !== 14) return false;
  
  // Check for repeated digits
  if (/^(\d)\1+$/.test(numericCnpj)) return false;
  
  // Validation algorithm for CNPJ
  let sum = 0;
  let position = 5;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numericCnpj.charAt(i)) * position;
    position = position === 2 ? 9 : position - 1;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(numericCnpj.charAt(12))) return false;
  
  sum = 0;
  position = 6;
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numericCnpj.charAt(i)) * position;
    position = position === 2 ? 9 : position - 1;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(numericCnpj.charAt(13));
}

// Parse CSV string to array of objects
export function parseCSV(csvString: string, headers: string[]): Record<string, string>[] {
  const rows = csvString.split('\n');
  const result: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;
    
    const values = rows[i].split(',');
    const obj: Record<string, string> = {};
    
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[j] ? values[j].trim() : '';
    }
    
    result.push(obj);
  }
  
  return result;
}

// Get initials from name
export function getInitials(name: string): string {
  if (!name) return '';
  
  const names = name.split(' ');
  if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
  
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

/**
 * Calcula os totais do pedido com base nos itens
 */
export function calculateTotals(items: any[]) {
  const subtotal = items.reduce((total, item) => total + item.subtotal, 0);
  
  // Calcular a comissão total (se aplicável)
  const totalCommission = items.reduce((total, item) => {
    if (item.commission) {
      return total + (item.subtotal * item.commission / 100);
    }
    return total;
  }, 0);
  
  return {
    subtotal,
    totalCommission,
    // Outros totais podem ser adicionados aqui conforme necessário
  };
}
