import { useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileDown, Printer } from "lucide-react";

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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  console.log("Items recebidos no PdfTemplate:", items);

  // Função para criar um documento PDF com design moderno
  const createPdfDocument = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Cores para um design mais moderno
    const primaryColor = "#3b82f6"; // azul
    const secondaryColor = "#f0f9ff"; // azul claro
    const darkGray = "#374151";
    
    // Background header
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, pageWidth, 22, "F");
    
    // Título do documento
    doc.setTextColor(255, 255, 255); // branco
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`PEDIDO #${order.id}`, 15, 15);
    
    // Add status badge
    if (order.status === 'confirmado') {
      doc.setFillColor(34, 197, 94); // verde
    } else {
      doc.setFillColor(245, 158, 11); // amarelo
    }
    
    // Badge de status moderno
    const statusText = order.status.toUpperCase();
    const statusX = pageWidth - 40;
    const statusY = 15;
    doc.roundedRect(statusX - 20, statusY - 6, 40, 12, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(statusText, statusX, statusY);
    
    // Reset de cores
    doc.setTextColor(darkGray);
    
    // Informações da empresa
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("GestãoPedidos", 15, 35);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("CNPJ: 00.000.000/0000-00", 15, 40);
    doc.text("contato@gestaopedidos.com", 15, 45);
    
    // Card com informações do cliente
    doc.setFillColor(secondaryColor);
    doc.roundedRect(15, 55, 85, 30, 3, 3, "F");
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor);
    doc.text("CLIENTE", 20, 63);
    doc.setTextColor(darkGray);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Nome: ${order.clientName}`, 20, 70);
    doc.text(`CNPJ: ${order.clientCnpj}`, 20, 77);
    
    // Card com informações do pedido
    doc.setFillColor(secondaryColor);
    doc.roundedRect(110, 55, 85, 30, 3, 3, "F");
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor);
    doc.text("INFORMAÇÕES DO PEDIDO", 115, 63);
    doc.setTextColor(darkGray);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Data: ${formatDate(order.date)}`, 115, 70);
    doc.text(`Condição: ${order.paymentTerms}`, 115, 77);
    doc.text(`Representante: ${order.representative}`, 115, 84);
    
    // Título da tabela de itens
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ITENS DO PEDIDO", 15, 95);
    
    // Linha decorativa abaixo do título
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, 97, 70, 97);
    
    // Cabeçalho da tabela com design moderno
    const tableX = 15;
    let tableY = 105;
    
    // Fundo do cabeçalho da tabela
    doc.setFillColor(primaryColor);
    doc.rect(tableX, tableY - 7, 180, 8, "F");
    
    // Textos do cabeçalho
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    
    doc.text("Ref. Cliente", tableX + 5, tableY - 1);
    doc.text("Código", tableX + 30, tableY - 1);
    doc.text("Descrição", tableX + 50, tableY - 1);
    doc.text("Qtd", tableX + 95, tableY - 1);
    doc.text("Preço Tabela", tableX + 115, tableY - 1);
    doc.text("Desconto", tableX + 140, tableY - 1);
    doc.text("Preço c/ Desc.", tableX + 163, tableY - 1);
    doc.text("Subtotal", tableX + 190, tableY - 1);
    
    // Reset de cores
    doc.setTextColor(darkGray);
    
    // Linhas da tabela
    doc.setFontSize(8);
    items.forEach((item, index) => {
      // Nova página se necessário
      if (tableY > 270) {
        doc.addPage();
        tableY = 20;
      }
      
      // Zebra striping para melhor legibilidade
      if (index % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(tableX, tableY, 180, 7, "F");
      }
      
      // Destaque para referência do cliente
      if (item.clientRef) {
        doc.setFillColor(primaryColor);
        doc.setTextColor(255, 255, 255);
        doc.roundedRect(tableX + 2, tableY + 1, 22, 5, 1, 1, "F");
        doc.text(item.clientRef, tableX + 5, tableY + 4.5);
        doc.setTextColor(darkGray);
      } else {
        doc.text("-", tableX + 5, tableY + 4.5);
      }
      
      // Resto dos dados do item
      doc.text(item.code, tableX + 30, tableY + 4.5);
      const displayName = item.name.length > 25 ? item.name.substring(0, 25) + "..." : item.name;
      doc.text(displayName, tableX + 50, tableY + 4.5);
      doc.text(item.quantity.toString(), tableX + 95, tableY + 4.5);
      doc.text(formatCurrency(item.unitPrice), tableX + 115, tableY + 4.5);
      doc.text(item.discount > 0 ? `${item.discount}%` : "-", tableX + 140, tableY + 4.5);
      
      // Preço com desconto
      const priceWithDiscount = item.discount > 0 ? item.unitPrice * (1 - item.discount / 100) : item.unitPrice;
      doc.text(formatCurrency(priceWithDiscount), tableX + 163, tableY + 4.5);
      
      // Subtotal
      doc.text(formatCurrency(item.subtotal), tableX + 190, tableY + 4.5);
      
      tableY += 7;
    });
    
    // Resumo financeiro com layout moderno
    const totalsY = tableY + 15;
    
    // Card para os totais
    doc.setFillColor(secondaryColor);
    doc.roundedRect(pageWidth - 95, totalsY - 10, 80, 45, 3, 3, "F");
    
    // Informações de totais
    doc.setFontSize(9);
    doc.text("Subtotal:", pageWidth - 90, totalsY);
    doc.text(formatCurrency(order.subtotal), pageWidth - 20, totalsY, { align: "right" });
    
    doc.text("Desconto:", pageWidth - 90, totalsY + 8);
    doc.text(formatCurrency(order.discount), pageWidth - 20, totalsY + 8, { align: "right" });
    
    doc.text("Impostos:", pageWidth - 90, totalsY + 16);
    doc.text(formatCurrency(order.taxes), pageWidth - 20, totalsY + 16, { align: "right" });
    
    // Linha separadora antes do total
    doc.setDrawColor(primaryColor);
    doc.line(pageWidth - 90, totalsY + 20, pageWidth - 20, totalsY + 20);
    
    // Total em destaque
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor);
    doc.text("Total:", pageWidth - 90, totalsY + 28);
    doc.text(formatCurrency(order.total), pageWidth - 20, totalsY + 28, { align: "right" });
    
    // Rodapé
    const footerY = totalsY + 50;
    doc.setTextColor(darkGray);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    
    // Linha divisória do rodapé
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
    
    // Texto do rodapé
    doc.text("Este documento não possui valor fiscal.", pageWidth / 2, footerY, { align: "center" });
    doc.text(`Gerado em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, pageWidth / 2, footerY + 5, { align: "center" });
    
    return doc;
  };
  
  // Função para baixar o PDF
  const downloadPdf = () => {
    const doc = createPdfDocument();
    doc.save(`pedido_${order.id}.pdf`);
  };
  
  // Função para imprimir o PDF
  const printPdf = () => {
    const doc = createPdfDocument();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    
    if (iframeRef.current) {
      iframeRef.current.src = url;
      iframeRef.current.onload = () => {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.print();
        }
      };
    } else {
      // Fallback se o iframe não estiver disponível
      window.open(url, '_blank');
    }
  };

  // Preview content in canvas (simplified preview com design moderno)
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Cores para design moderno
    const primaryColor = "#3b82f6"; // azul
    const secondaryColor = "#f0f9ff"; // azul claro
    const darkGray = "#374151";
    
    // Limpar canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Cabeçalho moderno
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, canvas.width, 40);
    
    // Título do pedido
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`PEDIDO #${order.id}`, 20, 25);
    
    // Badge de status moderno
    if (order.status === 'confirmado') {
      ctx.fillStyle = "#22c55e"; // verde
    } else {
      ctx.fillStyle = "#f59e0b"; // amarelo
    }
    
    // Desenhar badge com cantos arredondados
    ctx.beginPath();
    // Implementação manual de retângulo com cantos arredondados
    const badgeX = canvas.width - 100;
    const badgeY = 10;
    const badgeWidth = 80;
    const badgeHeight = 25;
    const radius = 5;
    
    // Desenho do retângulo arredondado manualmente
    ctx.moveTo(badgeX + radius, badgeY);
    ctx.lineTo(badgeX + badgeWidth - radius, badgeY);
    ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + radius);
    ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - radius);
    ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - radius, badgeY + badgeHeight);
    ctx.lineTo(badgeX + radius, badgeY + badgeHeight);
    ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - radius);
    ctx.lineTo(badgeX, badgeY + radius);
    ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(order.status.toUpperCase(), canvas.width - 60, 27);
    
    // Cards de informações
    // Card da empresa
    ctx.fillStyle = darkGray;
    ctx.textAlign = "left";
    ctx.font = "bold 14px Arial";
    ctx.fillText("GestãoPedidos", 20, 55);
    
    ctx.font = "12px Arial";
    ctx.fillText("CNPJ: 00.000.000/0000-00", 20, 70);
    
    // Card do cliente
    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    // Implementação manual do retângulo arredondado
    const clientCardX = 20;
    const clientCardY = 85;
    const clientCardWidth = 200;
    const clientCardHeight = 80;
    const clientCardRadius = 5;
    
    // Desenho do retângulo arredondado
    ctx.moveTo(clientCardX + clientCardRadius, clientCardY);
    ctx.lineTo(clientCardX + clientCardWidth - clientCardRadius, clientCardY);
    ctx.quadraticCurveTo(clientCardX + clientCardWidth, clientCardY, clientCardX + clientCardWidth, clientCardY + clientCardRadius);
    ctx.lineTo(clientCardX + clientCardWidth, clientCardY + clientCardHeight - clientCardRadius);
    ctx.quadraticCurveTo(clientCardX + clientCardWidth, clientCardY + clientCardHeight, clientCardX + clientCardWidth - clientCardRadius, clientCardY + clientCardHeight);
    ctx.lineTo(clientCardX + clientCardRadius, clientCardY + clientCardHeight);
    ctx.quadraticCurveTo(clientCardX, clientCardY + clientCardHeight, clientCardX, clientCardY + clientCardHeight - clientCardRadius);
    ctx.lineTo(clientCardX, clientCardY + clientCardRadius);
    ctx.quadraticCurveTo(clientCardX, clientCardY, clientCardX + clientCardRadius, clientCardY);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = primaryColor;
    ctx.font = "bold 14px Arial";
    ctx.fillText("CLIENTE", 30, 105);
    
    ctx.fillStyle = darkGray;
    ctx.font = "13px Arial";
    ctx.fillText(`Nome: ${order.clientName}`, 30, 125);
    ctx.fillText(`CNPJ: ${order.clientCnpj}`, 30, 145);
    
    // Card de informações do pedido
    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    // Implementação manual do retângulo arredondado
    const infoCardX = 240;
    const infoCardY = 85;
    const infoCardWidth = 200;
    const infoCardHeight = 80;
    const infoCardRadius = 5;
    
    // Desenho do retângulo arredondado
    ctx.moveTo(infoCardX + infoCardRadius, infoCardY);
    ctx.lineTo(infoCardX + infoCardWidth - infoCardRadius, infoCardY);
    ctx.quadraticCurveTo(infoCardX + infoCardWidth, infoCardY, infoCardX + infoCardWidth, infoCardY + infoCardRadius);
    ctx.lineTo(infoCardX + infoCardWidth, infoCardY + infoCardHeight - infoCardRadius);
    ctx.quadraticCurveTo(infoCardX + infoCardWidth, infoCardY + infoCardHeight, infoCardX + infoCardWidth - infoCardRadius, infoCardY + infoCardHeight);
    ctx.lineTo(infoCardX + infoCardRadius, infoCardY + infoCardHeight);
    ctx.quadraticCurveTo(infoCardX, infoCardY + infoCardHeight, infoCardX, infoCardY + infoCardHeight - infoCardRadius);
    ctx.lineTo(infoCardX, infoCardY + infoCardRadius);
    ctx.quadraticCurveTo(infoCardX, infoCardY, infoCardX + infoCardRadius, infoCardY);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = primaryColor;
    ctx.font = "bold 14px Arial";
    ctx.fillText("INFORMAÇÕES", 250, 105);
    
    ctx.fillStyle = darkGray;
    ctx.font = "13px Arial";
    ctx.fillText(`Data: ${formatDate(order.date)}`, 250, 125);
    ctx.fillText(`Pagamento: ${order.paymentTerms}`, 250, 145);
    
    // Título da tabela de itens
    ctx.fillStyle = primaryColor;
    ctx.font = "bold 16px Arial";
    ctx.fillText("ITENS DO PEDIDO", 20, 190);
    
    // Linha decorativa
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 195);
    ctx.lineTo(180, 195);
    ctx.stroke();
    
    // Cabeçalho da tabela
    ctx.fillStyle = primaryColor;
    ctx.fillRect(20, 205, canvas.width - 40, 30);
    
    // Textos do cabeçalho
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Ref. Cliente", 30, 225);
    ctx.fillText("Produto", 110, 225);
    ctx.fillText("Preço", 250, 225);
    ctx.fillText("Preço c/ Desc.", 310, 225);
    ctx.fillText("Subtotal", 400, 225);
    
    // Linhas da tabela
    let y = 250;
    items.slice(0, 4).forEach((item, index) => {
      // Fundo zebrado
      ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#f9fafb";
      ctx.fillRect(20, y - 15, canvas.width - 40, 30);
      
      // Referência do cliente com destaque
      if (item.clientRef) {
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        // Implementação manual do retângulo arredondado
        const refX = 25;
        const refY = y - 10;
        const refWidth = 65;
        const refHeight = 20;
        const refRadius = 3;
        
        // Desenho do retângulo arredondado
        ctx.moveTo(refX + refRadius, refY);
        ctx.lineTo(refX + refWidth - refRadius, refY);
        ctx.quadraticCurveTo(refX + refWidth, refY, refX + refWidth, refY + refRadius);
        ctx.lineTo(refX + refWidth, refY + refHeight - refRadius);
        ctx.quadraticCurveTo(refX + refWidth, refY + refHeight, refX + refWidth - refRadius, refY + refHeight);
        ctx.lineTo(refX + refRadius, refY + refHeight);
        ctx.quadraticCurveTo(refX, refY + refHeight, refX, refY + refHeight - refRadius);
        ctx.lineTo(refX, refY + refRadius);
        ctx.quadraticCurveTo(refX, refY, refX + refRadius, refY);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "left";
        ctx.fillText(item.clientRef, 30, y + 3);
      } else {
        ctx.fillStyle = darkGray;
        ctx.fillText("-", 30, y + 3);
      }
      
      // Resto dos dados
      ctx.fillStyle = darkGray;
      ctx.font = "12px Arial";
      
      // Nome do produto com limitação
      const displayName = item.name.length > 20 ? item.name.substring(0, 20) + "..." : item.name;
      ctx.fillText(displayName, 110, y + 3);
      
      // Preços
      ctx.fillText(formatCurrency(item.unitPrice), 250, y + 3);
      
      // Preço com desconto
      const priceWithDiscount = item.discount > 0 ? item.unitPrice * (1 - item.discount / 100) : item.unitPrice;
      ctx.fillText(formatCurrency(priceWithDiscount), 310, y + 3);
      
      // Subtotal
      ctx.fillText(formatCurrency(item.subtotal), 400, y + 3);
      
      y += 30;
    });
    
    // Indicação de mais itens
    if (items.length > 4) {
      ctx.fillStyle = darkGray;
      ctx.font = "italic 12px Arial";
      ctx.fillText(`... e mais ${items.length - 4} itens`, 30, y + 5);
    }
    
    // Card de totais
    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    // Implementação manual do retângulo arredondado
    const totalsCardX = canvas.width - 180;
    const totalsCardY = y + 20;
    const totalsCardWidth = 160;
    const totalsCardHeight = 80;
    const totalsCardRadius = 5;
    
    // Desenho do retângulo arredondado
    ctx.moveTo(totalsCardX + totalsCardRadius, totalsCardY);
    ctx.lineTo(totalsCardX + totalsCardWidth - totalsCardRadius, totalsCardY);
    ctx.quadraticCurveTo(totalsCardX + totalsCardWidth, totalsCardY, totalsCardX + totalsCardWidth, totalsCardY + totalsCardRadius);
    ctx.lineTo(totalsCardX + totalsCardWidth, totalsCardY + totalsCardHeight - totalsCardRadius);
    ctx.quadraticCurveTo(totalsCardX + totalsCardWidth, totalsCardY + totalsCardHeight, totalsCardX + totalsCardWidth - totalsCardRadius, totalsCardY + totalsCardHeight);
    ctx.lineTo(totalsCardX + totalsCardRadius, totalsCardY + totalsCardHeight);
    ctx.quadraticCurveTo(totalsCardX, totalsCardY + totalsCardHeight, totalsCardX, totalsCardY + totalsCardHeight - totalsCardRadius);
    ctx.lineTo(totalsCardX, totalsCardY + totalsCardRadius);
    ctx.quadraticCurveTo(totalsCardX, totalsCardY, totalsCardX + totalsCardRadius, totalsCardY);
    ctx.closePath();
    ctx.fill();
    
    // Textos dos totais
    ctx.fillStyle = darkGray;
    ctx.font = "13px Arial";
    ctx.textAlign = "left";
    
    const totalsX = canvas.width - 170;
    const valuesX = canvas.width - 30;
    let totalsY = y + 45;
    
    ctx.fillText("Subtotal:", totalsX, totalsY);
    ctx.textAlign = "right";
    ctx.fillText(formatCurrency(order.subtotal), valuesX, totalsY);
    
    ctx.textAlign = "left";
    ctx.fillText("Desconto:", totalsX, totalsY + 20);
    ctx.textAlign = "right";
    ctx.fillText(formatCurrency(order.discount), valuesX, totalsY + 20);
    
    // Linha separadora
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(totalsX, totalsY + 30);
    ctx.lineTo(valuesX, totalsY + 30);
    ctx.stroke();
    
    // Total com destaque
    ctx.fillStyle = primaryColor;
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Total:", totalsX, totalsY + 50);
    ctx.textAlign = "right";
    ctx.fillText(formatCurrency(order.total), valuesX, totalsY + 50);
    
    // Rodapé
    ctx.fillStyle = "#cccccc";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Este documento não possui valor fiscal.", canvas.width / 2, canvas.height - 15);
  }, [order, items]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="border rounded-md p-4">
        {/* Preview em canvas */}
        <canvas 
          ref={canvasRef} 
          width={460} 
          height={520} 
          className="mx-auto border"
        ></canvas>
        
        {/* Conteúdo otimizado para impressão - só aparece na impressão */}
        <div className="hidden print:block mt-4">
          <div className="print-header">
            {/* Cabeçalho minimalista e profissional */}
            <div className="flex justify-between items-center border-b border-gray-300 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">PEDIDO #{order.id}</h1>
                <p className="text-sm text-gray-500">Gestão de Pedidos</p>
              </div>
              <div className={`inline-flex items-center px-3 py-1 rounded ${
                order.status === 'confirmado' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}>
                <span className="text-sm font-medium">{order.status === 'confirmado' ? 'CONFIRMADO' : 'COTAÇÃO'}</span>
              </div>
            </div>
            
            {/* Informações do cliente e pedido em layout com grid mais clean */}
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Cliente</h2>
                <div className="text-gray-800">
                  <p className="font-medium text-base">{order.clientName}</p>
                  <p className="text-sm text-gray-600">{order.clientCnpj}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Data</h2>
                  <p className="text-gray-800">{order.date}</p>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Pagamento</h2>
                  <p className="text-gray-800">{order.paymentTerms}</p>
                </div>
                <div className="col-span-2">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Representante</h2>
                  <p className="text-gray-800">{order.representative}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 print-items">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Itens do Pedido</h2>
            
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">Ref.</th>
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]">Código</th>
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[30%]">Descrição</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[6%]">Qtd</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[11%]">P. Tabela</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[9%]">Desc.</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">P. c/ Desc.</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  // Cálculo do preço com desconto
                  const priceWithDiscount = item.discount > 0 
                    ? item.unitPrice * (1 - item.discount / 100) 
                    : item.unitPrice;
                    
                  return (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-3 align-middle">
                        {item.clientRef ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                            {item.clientRef}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 align-middle text-sm font-medium">{item.code}</td>
                      <td className="py-3 align-middle text-sm">{item.name}</td>
                      <td className="py-3 align-middle text-sm text-right">{item.quantity}</td>
                      <td className="py-3 align-middle text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 align-middle text-sm text-right">
                        {item.discount > 0 ? `${item.discount}%` : '-'}
                      </td>
                      <td className="py-3 align-middle text-sm text-right font-medium">{formatCurrency(priceWithDiscount)}</td>
                      <td className="py-3 align-middle text-sm text-right font-medium">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex justify-between print-footer">
            <div className="w-1/2 pr-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Observações</h2>
              <p className="text-sm text-gray-600">
                {order.status === 'confirmado' 
                  ? 'Pedido confirmado. Os produtos serão enviados conforme as condições acordadas.'
                  : 'Esta é uma cotação. Os preços estão sujeitos a confirmação.'}
              </p>
            </div>
            
            <div className="w-1/3">
              <div className="border-t border-gray-300 pt-4">
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="text-sm text-gray-800">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">Desconto:</span>
                  <span className="text-sm text-gray-800">{formatCurrency(order.discount)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">Impostos:</span>
                  <span className="text-sm text-gray-800">{formatCurrency(order.taxes)}</span>
                </div>
                <div className="border-t border-gray-300 my-2"></div>
                <div className="flex justify-between py-1">
                  <span className="text-base font-medium text-gray-800">Total:</span>
                  <span className="text-base font-medium text-gray-800">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-12 border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center text-gray-500 text-xs">
              <div>
                <p className="font-medium">Gestão de Pedidos • Sistema Profissional</p>
                <p>CNPJ: 00.000.000/0000-00</p>
              </div>
              <div className="text-right">
                <p>Este documento não possui valor fiscal</p>
                <p>Gerado em {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Iframe oculto usado para impressão */}
      <iframe 
        ref={iframeRef} 
        style={{position: 'absolute', width: '0', height: '0', border: '0'}}
        title="PDF Print Frame"
      />
      
      <div className="flex justify-end space-x-4 print:hidden">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        )}
        <Button variant="outline" onClick={downloadPdf}>
          <FileDown className="mr-2 h-4 w-4" />
          Baixar PDF
        </Button>
        <Button onClick={printPdf}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>
    </div>
  );
}
