import { useRef, useEffect } from "react";
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
  brand?: string | null;
  discountName?: string | null;
  commission?: number;
}

interface PdfTemplateProps {
  order: {
    id: number;
    clientId?: number;
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
    totalCommission?: number;
  };
  items: PdfItem[];
  onClose?: () => void;
}

export function PdfTemplate({ order, items, onClose }: PdfTemplateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Calcular o total de comissão para incluir no PDF quando for um pedido confirmado
  const totalCommission = order.status === 'confirmado' 
    ? items.reduce((total, item) => total + (item.quantity * item.unitPrice * (item.commission || 0) / 100), 0)
    : 0;

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
      // Exibir nome do desconto para pedidos confirmados, ou apenas a porcentagem para cotações
      if (item.discount > 0) {
        if (order.status === 'confirmado' && item.discountName) {
          // Destacar o nome do desconto para pedidos confirmados
          doc.setFillColor(51, 102, 204, 0.1); // Azul claro com transparência
          doc.roundedRect(tableX + 135, tableY + 1, 24, 5, 1, 1, "F");
          doc.setTextColor(0, 51, 153); // Azul escuro
          doc.text(`${item.discountName}`, tableX + 140, tableY + 4.5);
          doc.setTextColor(darkGray); // Voltar à cor padrão
        } else {
          doc.text(`${item.discount}%`, tableX + 140, tableY + 4.5);
        }
      } else {
        doc.text("-", tableX + 140, tableY + 4.5);
      }
      
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
    
    // Mostrar comissão se o pedido estiver confirmado
    if (order.status === 'confirmado' && order.totalCommission) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(darkGray);
      doc.text("Total Comissão:", pageWidth - 90, totalsY + 36);
      doc.text(formatCurrency(order.totalCommission), pageWidth - 20, totalsY + 36, { align: "right" });
    }
    
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
  
  // Função para imprimir usando a API nativa do navegador
  const printPdf = () => {
    // Imprimir diretamente usando a API nativa do navegador
    window.print();
  };

  // Preview content in canvas (simplified preview)
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Limpar canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Preview simplificado
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(0, 0, canvas.width, 40);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.fillText(`PEDIDO #${order.id}`, 20, 25);
    
    ctx.fillStyle = "#000000";
    ctx.font = "14px Arial";
    ctx.fillText("Cliente: " + order.clientName, 20, 70);
    ctx.fillText("CNPJ: " + order.clientCnpj, 20, 90);
    ctx.fillText("Data: " + formatDate(order.date), 20, 110);
    ctx.fillText("Status: " + order.status.toUpperCase(), 20, 130);
    
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(20, 150, canvas.width - 40, 2);
    
    ctx.fillStyle = "#000000";
    ctx.font = "bold 14px Arial";
    ctx.fillText("Itens: " + items.length, 20, 180);
    
    // Mini tabela
    ctx.font = "12px Arial";
    let y = 210;
    items.slice(0, 4).forEach((item) => {
      ctx.fillText(`${item.name} (${item.quantity}x) - ${formatCurrency(item.subtotal)}`, 30, y);
      y += 25;
    });
    
    if (items.length > 4) {
      ctx.fillText("...", 30, y);
    }
    
    ctx.font = "bold 14px Arial";
    ctx.fillText("Total: " + formatCurrency(order.total), canvas.width - 150, y + 40);
  }, [order, items]);

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Visualizar Pedido #{order.id}</h2>
        <p className="text-gray-500 mb-2">Utilize os botões abaixo para baixar o PDF ou imprimir o pedido.</p>
        
        {/* Preview canvas - visível apenas na tela */}
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={520} 
          className="mx-auto border"
        ></canvas>
        
        {/* Conteúdo otimizado para impressão - só aparece na impressão */}
        <div className="hidden print:block mt-4">
          <div className="print-header">
            {/* Cabeçalho moderno e profissional */}
            <div className="flex justify-between items-center border-b border-gray-300 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">PEDIDO #{order.id}</h1>
                <p className="text-sm text-gray-500">Gestão de Pedidos</p>
              </div>
              
              <div className="inline-flex items-center px-3 py-1 rounded">
                <span className="text-sm font-medium">{order.status === 'confirmado' ? 'CONFIRMADO' : 'COTAÇÃO'}</span>
              </div>
            </div>
            
            {/* Informações do cliente e pedido em layout clean */}
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
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref. Cliente</th>
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Preço Tabela</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Desconto</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Preço c/ Desc.</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
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
                      <td className="py-3 align-middle text-sm">
                        {item.clientRef || '-'}
                      </td>
                      <td className="py-3 align-middle text-sm font-medium">{item.code}</td>
                      <td className="py-3 align-middle text-sm">{item.name}</td>
                      <td className="py-3 align-middle text-sm text-right">{item.quantity}</td>
                      <td className="py-3 align-middle text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 align-middle text-sm text-right">
                        {item.discount > 0 ? (
                          order.status === 'confirmado' && item.discountName 
                            ? <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-800">{item.discountName}</span>
                            : `${item.discount}%`
                        ) : '-'}
                      </td>
                      <td className="py-3 align-middle text-sm text-right">{formatCurrency(priceWithDiscount)}</td>
                      <td className="py-3 align-middle text-sm text-right font-medium">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex justify-end print-footer">
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
                {order.status === 'confirmado' && order.totalCommission && (
                  <div className="flex justify-between py-1 mt-2">
                    <span className="text-sm text-gray-600">Total Comissão:</span>
                    <span className="text-sm text-gray-800">{formatCurrency(order.totalCommission)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Não precisamos mais do iframe com a nova abordagem de impressão */}
      
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