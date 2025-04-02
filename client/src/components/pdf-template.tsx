import { useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

interface PdfItem {
  id: number;
  name: string;
  code: string;
  clientRef?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

interface PdfTemplateProps {
  order: {
    id: number;
    clientName: string;
    clientCnpj: string;
    date: string;
    status: string;
    paymentTerms: string;
    subtotal: number;
    discount: number;
    taxes: number;
    total: number;
    representative: string;
  };
  items: PdfItem[];
  onClose?: () => void;
}

export function PdfTemplate({ order, items, onClose }: PdfTemplateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  console.log("Items recebidos no PdfTemplate:", items);

  // Generate PDF document
  const generatePdf = () => {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(18);
    doc.text("PEDIDO #" + order.id, 105, 20, { align: "center" });
    
    // Add company information
    doc.setFontSize(12);
    doc.text("GestãoPedidos", 15, 40);
    doc.text("CNPJ: 00.000.000/0000-00", 15, 45);
    doc.text("contato@gestaopedidos.com", 15, 50);
    
    // Add status badge
    if (order.status === 'confirmado') {
      doc.setFillColor(0, 128, 0);
    } else {
      doc.setFillColor(255, 165, 0);
    }
    doc.roundedRect(150, 35, 45, 10, 5, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(order.status.toUpperCase(), 172.5, 41.5, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    // Add customer information
    doc.setFontSize(11);
    doc.text("CLIENTE", 15, 65);
    doc.line(15, 66, 35, 66);
    doc.setFontSize(10);
    doc.text(`Nome: ${order.clientName}`, 15, 72);
    doc.text(`CNPJ: ${order.clientCnpj}`, 15, 77);
    
    // Add order information
    doc.setFontSize(11);
    doc.text("INFORMAÇÕES DO PEDIDO", 110, 65);
    doc.line(110, 66, 180, 66);
    doc.setFontSize(10);
    doc.text(`Data: ${formatDate(order.date)}`, 110, 72);
    doc.text(`Condição de Pagamento: ${order.paymentTerms}`, 110, 77);
    doc.text(`Representante: ${order.representative}`, 110, 82);
    
    // Add items table
    doc.setFontSize(11);
    doc.text("ITENS DO PEDIDO", 15, 95);
    doc.line(15, 96, 65, 96);
    
    // Table headers
    const tableX = 15;
    let tableY = 105;
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, tableY - 6, 180, 7, 'F');
    doc.setFontSize(9);
    doc.text("Ref. Cliente", tableX + 5, tableY - 1);
    doc.text("Código", tableX + 30, tableY - 1);
    doc.text("Descrição", tableX + 50, tableY - 1);
    doc.text("Qtd", tableX + 100, tableY - 1);
    doc.text("Preço Unit.", tableX + 115, tableY - 1);
    doc.text("Desconto", tableX + 140, tableY - 1);
    doc.text("Subtotal", tableX + 165, tableY - 1);
    
    // Add items
    doc.setFontSize(8);
    items.forEach((item, index) => {
      // Check if we need a new page
      if (tableY > 270) {
        doc.addPage();
        tableY = 20;
      }
      
      // Zebra striping for rows
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(tableX, tableY, 180, 6, 'F');
      }
      
      // Destaca a referência do cliente, caso exista
      if (item.clientRef) {
        // Fundo cinza claro para a célula de referência
        doc.setFillColor(240, 240, 240);
        doc.rect(tableX, tableY, 25, 6, 'F');
        doc.setFont("helvetica", "bold");
        doc.text(item.clientRef, tableX + 5, tableY + 4);
        doc.setFont("helvetica", "normal");
      } else {
        doc.text('-', tableX + 5, tableY + 4);
      }
      doc.text(item.code, tableX + 30, tableY + 4);
      doc.text(item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name, tableX + 50, tableY + 4);
      doc.text(item.quantity.toString(), tableX + 100, tableY + 4);
      doc.text(formatCurrency(item.unitPrice), tableX + 115, tableY + 4);
      doc.text(item.discount > 0 ? `${item.discount}%` : '-', tableX + 140, tableY + 4);
      doc.text(formatCurrency(item.subtotal), tableX + 165, tableY + 4);
      
      tableY += 7;
    });
    
    // Add totals
    const totalsY = tableY + 10;
    doc.line(tableX, totalsY - 5, 195, totalsY - 5);
    
    doc.setFontSize(9);
    doc.text("Subtotal:", 150, totalsY);
    doc.text(formatCurrency(order.subtotal), 180, totalsY);
    
    doc.text("Desconto:", 150, totalsY + 5);
    doc.text(formatCurrency(order.discount), 180, totalsY + 5);
    
    doc.text("Impostos:", 150, totalsY + 10);
    doc.text(formatCurrency(order.taxes), 180, totalsY + 10);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", 'bold');
    doc.text("Total:", 150, totalsY + 20);
    doc.text(formatCurrency(order.total), 180, totalsY + 20);
    doc.setFont("helvetica", 'normal');
    
    // Add footer
    const footerY = totalsY + 35;
    doc.setFontSize(8);
    doc.text("Este documento não possui valor fiscal.", 105, footerY, { align: "center" });
    doc.text(`Gerado em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 105, footerY + 5, { align: "center" });
    
    // Save the PDF
    doc.save(`pedido_${order.id}.pdf`);
  };

  // Preview content in canvas (simplified preview)
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw preview
    ctx.fillStyle = "#000000";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`PEDIDO #${order.id}`, canvas.width / 2, 30);
    
    ctx.font = "14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Cliente: ${order.clientName}`, 20, 60);
    ctx.fillText(`Data: ${formatDate(order.date)}`, 20, 80);
    ctx.fillText(`Total: ${formatCurrency(order.total)}`, 20, 100);
    
    // Draw status badge
    ctx.fillStyle = order.status === 'confirmado' ? "#22c55e" : "#f59e0b";
    ctx.fillRect(canvas.width - 100, 40, 80, 25);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(order.status.toUpperCase(), canvas.width - 60, 57);
    
    // Draw items table (simplified)
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.fillText("Itens do pedido:", 20, 140);
    
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(20, 150, canvas.width - 40, 25);
    
    ctx.fillStyle = "#000000";
    ctx.font = "12px Arial";
    ctx.fillText("Ref. Cliente", 30, 167);
    ctx.fillText("Descrição", 100, 167);
    ctx.fillText("Qtd", 280, 167);
    ctx.fillText("Subtotal", 330, 167);
    
    ctx.font = "12px Arial";
    let y = 190;
    items.slice(0, 5).forEach((item, index) => {
      ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#f9fafb";
      ctx.fillRect(20, y - 15, canvas.width - 40, 20);
      
      ctx.fillStyle = "#000000";
      
      // Mostra a referência do cliente (ou traço)
      if (item.clientRef) {
        ctx.fillStyle = "#f3f4f6";
        ctx.fillRect(25, y - 13, 65, 17);
        ctx.fillStyle = "#000000";
        ctx.font = "bold 12px Arial";
        ctx.fillText(item.clientRef, 30, y);
        ctx.font = "12px Arial";
      } else {
        ctx.fillText("-", 30, y);
      }
      
      // Mostra o nome do produto
      ctx.fillText(item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name, 100, y);
      ctx.fillText(item.quantity.toString(), 280, y);
      ctx.fillText(formatCurrency(item.subtotal), 330, y);
      
      y += 25;
    });
    
    if (items.length > 5) {
      ctx.fillText(`... e mais ${items.length - 5} itens`, 30, y);
    }
    
    // Draw totals
    y = Math.min(items.length, 5) * 25 + 210;
    ctx.font = "bold 14px Arial";
    ctx.fillText(`Total: ${formatCurrency(order.total)}`, canvas.width - 150, y);
  }, [order, items]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="border rounded-md p-4">
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={500} 
          className="mx-auto border"
        ></canvas>
      </div>
      
      <div className="flex justify-end space-x-4">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        )}
        <Button onClick={generatePdf}>
          <FileDown className="mr-2 h-4 w-4" />
          Baixar PDF
        </Button>
      </div>
    </div>
  );
}
