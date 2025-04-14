import { useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileDown, Printer } from "lucide-react";
import { PrintOrderTemplate } from "./print-order-template";

interface PdfItem {
  id: number;
  name: string;
  code: string;
  clientCode?: string;
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
    clientCode?: string;
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
    notes?: string;
  };
  items: PdfItem[];
  onClose?: () => void;
  showClientRefs?: boolean;
}

export function PdfTemplate({
  order,
  items,
  onClose,
  showClientRefs = true,
}: PdfTemplateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Adicionar log para depuração
  useEffect(() => {
    console.log("PdfTemplate recebeu order:", order);
    console.log("PdfTemplate recebeu items:", items);
    console.log("PdfTemplate totalCommission do order:", order.totalCommission);
  }, [order, items]);

  // Usar o valor de comissão que já foi calculado pela página que chamou este componente
  // Mas se não for fornecido, calcular aqui
  const totalCommission =
    order.totalCommission ??
    (order.status === "confirmado"
      ? items.reduce((total, item) => {
          // Converter strings para números para garantir que a operação é feita corretamente
          const quantity =
            typeof item.quantity === "string"
              ? Number(item.quantity)
              : item.quantity || 0;
          const unitPrice =
            typeof item.unitPrice === "string"
              ? Number(item.unitPrice)
              : item.unitPrice || 0;
          const discount =
            typeof item.discount === "string"
              ? Number(item.discount)
              : item.discount || 0;
          const commission =
            typeof item.commission === "string"
              ? Number(item.commission)
              : item.commission || 0;

          // Calcular preço com desconto
          const discountedPrice = unitPrice * (1 - discount / 100);

          // Calcular comissão sobre o preço COM desconto
          return total + (quantity * discountedPrice * commission) / 100;
        }, 0)
      : 0);

  // Função para criar um documento PDF com design moderno
  const createPdfDocument = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Cores para um design mais moderno
    const primaryColor = "#3b82f6"; // azul
    const secondaryColor = "#f0f9ff"; // azul claro
    const accentGreen = "#10b981"; // verde
    const accentAmber = "#f59e0b"; // amarelo
    const darkGray = "#374151";
    const lightGray = "#f3f4f6";

    // Cabeçalho superior
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, pageWidth, 18, "F");

    // Logotipo e nome da empresa
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, 5, 8, 8, 1, 1, "F");

    doc.setFillColor(primaryColor);
    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("JL", 16, 11);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Joelson Lopes", 30, 10);
    doc.setFontSize(8);
    doc.text("Representações Comerciais", 30, 14);

    // Informações do documento
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - 80, 22, 65, 35, 3, 3, "F");
    doc.setTextColor(primaryColor);
    doc.setFontSize(12);
    doc.text(`PEDIDO #${order.id}`, pageWidth - 45, 30, { align: "center" });

    // Badge de status moderno - redesenhado para maior destaque
    if (order.status === "confirmado") {
      doc.setFillColor(0, 128, 0); // Verde mais escuro para melhor contraste na impressão
    } else {
      doc.setFillColor(184, 83, 11); // Laranja mais escuro para melhor contraste na impressão
    }

    // Textos mais curtos para caber melhor no espaço
    const statusText =
      order.status === "confirmado" ? "CONFIRMADO" : "COTAÇÃO";
      
    // Retângulo de status muito maior e mais visível
    doc.roundedRect(pageWidth - 75, 35, 55, 15, 3, 3, "F");
    
    // Borda mais grossa para o retângulo de status
    if (order.status === "confirmado") {
      doc.setDrawColor(0, 100, 0);
    } else {
      doc.setDrawColor(184, 83, 11);
    }
    doc.setLineWidth(0.7);
    doc.roundedRect(pageWidth - 75, 35, 55, 15, 3, 3, "S");

    // Texto do status em branco e maior
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11); // Fonte maior
    doc.text(statusText, pageWidth - 48, 44, { align: "center" }); // Ajustado para centralizar verticalmente

    // Data do pedido
    doc.setTextColor(darkGray);
    doc.setFontSize(9);
    doc.text(`Data: ${formatDate(order.date)}`, pageWidth - 48, 50, {
      align: "center",
    });

    // Seção Cliente e Data (na mesma linha)
    // Cliente
    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("CLIENTE", 15, 35);

    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, 37, 50, 37);

    // Data (na mesma linha que Cliente)
    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DATA", 115, 35);

    doc.setDrawColor(primaryColor);
    doc.line(115, 37, 150, 37);

    // Caixas para Cliente e Data (na mesma linha)
    doc.setFillColor(lightGray);
    doc.roundedRect(15, 40, 85, 25, 2, 2, "F");
    doc.roundedRect(115, 40, 80, 25, 2, 2, "F");

    // Conteúdo do Cliente
    doc.setTextColor(darkGray);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${order.clientName} (Cód: ${order.clientCode})`, 20, 48);

    doc.setFont("helvetica", "normal");
    doc.text("CNPJ:", 20, 55);
    doc.setFont("helvetica", "bold");
    doc.text(order.clientCnpj, 45, 55);

    // Conteúdo da Data
    doc.setTextColor(darkGray);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DATA", 120, 48, { align: "left" });
    doc.text("STATUS", 170, 48, { align: "left" });
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(order.date), 120, 55, { align: "left" });
    doc.text(`(${order.status.toUpperCase()})`, 170, 55, { align: "left" });

    // Representante e Pagamento (na mesma linha)
    // Representante
    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("REPRESENTANTE", 15, 75);

    doc.setDrawColor(primaryColor);
    doc.line(15, 77, 85, 77);

    // Condições de pagamento (na mesma linha que Representante)
    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("PAGAMENTO", 115, 75);

    doc.setDrawColor(primaryColor);
    doc.line(115, 77, 170, 77);

    // Caixas para Representante e Pagamento (na mesma linha)
    doc.setFillColor(lightGray);
    doc.roundedRect(15, 80, 85, 15, 2, 2, "F");
    doc.roundedRect(115, 80, 80, 15, 2, 2, "F");

    // Conteúdo do Representante
    doc.setTextColor(darkGray);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(order.representative, 20, 90);

    // Conteúdo do Pagamento
    doc.setTextColor(darkGray);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(order.paymentTerms, 120, 90);

    // Observações (se houver)
    if (order.notes) {
      doc.setTextColor(primaryColor);
      doc.setFontSize(10);
      doc.text("OBSERVAÇÕES", 15, 105);

      doc.setDrawColor(primaryColor);
      doc.line(15, 107, 70, 107);

      doc.setFillColor("#e0f2fe"); // Azul bem claro
      doc.roundedRect(15, 110, 180, 15, 2, 2, "F");

      doc.setTextColor(darkGray);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(order.notes, 20, 120);
    }

    // Cabeçalho da tabela de itens
    const tableY = order.notes ? 135 : 110;

    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("ITENS DO PEDIDO", 15, tableY - 5);

    doc.setDrawColor(primaryColor);
    doc.line(15, tableY - 3, 70, tableY - 3);

    // Fundo do cabeçalho da tabela
    const tableX = 15;
    doc.setFillColor(primaryColor);
    doc.rect(tableX, tableY, 180, 8, "F");

    // Textos do cabeçalho
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);

    // Mostra a coluna de referência do cliente apenas se showClientRefs for true
    if (showClientRefs) {
      doc.text("Ref. Cliente", tableX + 5, tableY + 5);
      doc.text("Produto", tableX + 35, tableY + 5);
    } else {
      // Se não mostrar referências, ajusta posicionamento das colunas
      doc.text("Produto", tableX + 5, tableY + 5);
    }
    doc.text("Qtd", tableX + 100, tableY + 5);
    doc.text("Desconto", tableX + 120, tableY + 5);
    doc.text("Preço c/ Desc.", tableX + 145, tableY + 5);
    doc.text("Total", tableX + 175, tableY + 5);

    // Linhas da tabela
    let currentY = tableY + 8;
    doc.setFontSize(8);

    items.forEach((item, index) => {
      // Nova página se necessário
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 20;

        // Adicionar cabeçalho na nova página
        doc.setFillColor(primaryColor);
        doc.rect(tableX, currentY, 180, 8, "F");

        doc.setTextColor(255, 255, 255);

        // Mostra a coluna de referência do cliente apenas se showClientRefs for true (também na nova página)
        if (showClientRefs) {
          doc.text("Ref. Cliente", tableX + 5, currentY + 5);
          doc.text("Produto", tableX + 35, currentY + 5);
        } else {
          // Se não mostrar referências, ajusta posicionamento das colunas
          doc.text("Produto", tableX + 5, currentY + 5);
        }
        doc.text("Qtd", tableX + 100, currentY + 5);
        doc.text("Desconto", tableX + 120, currentY + 5);
        doc.text("Preço c/ Desc.", tableX + 145, currentY + 5);
        doc.text("Total", tableX + 175, currentY + 5);

        currentY += 8;
      }

      // Zebra striping para melhor legibilidade
      if (index % 2 === 0) {
        doc.setFillColor(lightGray);
        doc.rect(tableX, currentY, 180, 8, "F");
      }

      // Reset de cores
      doc.setTextColor(darkGray);
      doc.setFont("helvetica", "normal");

      // Conversão de valores para números
      const discount =
        typeof item.discount === "string"
          ? Number(item.discount)
          : item.discount || 0;
      const unitPrice =
        typeof item.unitPrice === "string"
          ? Number(item.unitPrice)
          : item.unitPrice || 0;
      const quantity =
        typeof item.quantity === "string"
          ? Number(item.quantity)
          : item.quantity || 0;
      const priceWithDiscount =
        discount > 0 ? unitPrice * (1 - discount / 100) : unitPrice;

      // Destaque para referência do cliente (só exibe se showClientRefs for true)
      if (showClientRefs) {
        if (item.clientRef) {
          doc.setFillColor(primaryColor);
          doc.setTextColor(255, 255, 255);
          doc.roundedRect(tableX + 3, currentY + 1.5, 22, 5, 1, 1, "F");
          doc.text(item.clientRef, tableX + 5, currentY + 5);
        } else {
          doc.setTextColor(darkGray);
          doc.text("-", tableX + 5, currentY + 5);
        }
      } else {
        // Se não mostrar referências, coloca um espaço vazio
        doc.setTextColor(darkGray);
        doc.text("", tableX + 5, currentY + 5);
      }

      // Dados do item
      doc.setTextColor(darkGray);
      const displayName =
        item.name.length > 40 ? item.name.substring(0, 40) + "..." : item.name;
      // Ajusta posicionamento do nome do produto baseado na exibição de referências
      if (showClientRefs) {
        doc.text(displayName, tableX + 35, currentY + 5);
      } else {
        doc.text(displayName, tableX + 5, currentY + 5);
      }
      doc.text(quantity.toString(), tableX + 100, currentY + 5);

      // Exibir nome do desconto para pedidos confirmados, ou apenas a porcentagem para cotações
      if (discount > 0) {
        if (order.status === "confirmado" && item.discountName) {
          // Destacar o nome do desconto para pedidos confirmados
          doc.setFillColor(204, 229, 255); // Azul claro
          doc.roundedRect(tableX + 115, currentY + 1.5, 15, 5, 1, 1, "F");
          doc.setTextColor(0, 51, 153); // Azul escuro
          doc.text(item.discountName, tableX + 120, currentY + 5);
        } else {
          doc.setTextColor(darkGray);
          doc.text(`${discount}%`, tableX + 120, currentY + 5);
        }
      } else {
        doc.text("-", tableX + 120, currentY + 5);
      }

      // Preço com desconto e subtotal
      doc.setTextColor(darkGray);
      doc.text(formatCurrency(priceWithDiscount), tableX + 145, currentY + 5);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(item.subtotal), tableX + 175, currentY + 5);

      currentY += 8;
    });

    // Resumo financeiro com layout moderno
    const summaryY = currentY + 15;

    // Total peças e itens
    const totalPieces = items.reduce((total, item) => {
      const quantity =
        typeof item.quantity === "string"
          ? Number(item.quantity)
          : item.quantity || 0;
      return total + quantity;
    }, 0);

    // Grid para resumo de peças - lado esquerdo
    doc.setFillColor("#f8fafc"); // Cinza claro
    doc.roundedRect(15, summaryY, 85, 40, 3, 3, "F");

    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("RESUMO DE PEÇAS", 57.5, summaryY + 8, { align: "center" });

    // Card para total de peças
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(25, summaryY + 15, 30, 18, 2, 2, "F");

    doc.setTextColor(darkGray);
    doc.setFontSize(8);
    doc.text("Total de Peças", 40, summaryY + 20, { align: "center" });

    doc.setTextColor(primaryColor);
    doc.setFontSize(14);
    doc.text(totalPieces.toString(), 40, summaryY + 28, { align: "center" });

    // Card para quantidade de itens
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(60, summaryY + 15, 30, 18, 2, 2, "F");

    doc.setTextColor(darkGray);
    doc.setFontSize(8);
    doc.text("Qtd. Itens", 75, summaryY + 20, { align: "center" });

    doc.setTextColor(primaryColor);
    doc.setFontSize(14);
    doc.text(items.length.toString(), 75, summaryY + 28, { align: "center" });

    // Resumo financeiro - lado direito
    doc.setFillColor("#f8fafc");
    doc.roundedRect(110, summaryY, 85, 45, 3, 3, "F");

    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("RESUMO FINANCEIRO", 152.5, summaryY + 8, { align: "center" });

    doc.setTextColor(darkGray);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    // Valores financeiros
    doc.text("Subtotal:", 120, summaryY + 18);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(order.subtotal), 185, summaryY + 18, {
      align: "right",
    });

    doc.setFont("helvetica", "normal");
    doc.text("Taxa de Frete:", 120, summaryY + 25);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(order.taxes), 185, summaryY + 25, {
      align: "right",
    });

    // Linha separadora
    doc.setDrawColor(primaryColor);
    doc.line(120, summaryY + 30, 185, summaryY + 30);

    // Total em destaque
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Total:", 120, summaryY + 37);
    doc.setTextColor(primaryColor);
    doc.setFontSize(12);
    doc.text(formatCurrency(order.total), 185, summaryY + 37, {
      align: "right",
    });

    // Mostrar comissão se o pedido estiver confirmado
    if (order.status === "confirmado") {
      doc.setFillColor("#dbeafe"); // Azul bem claro
      doc.roundedRect(120, summaryY + 40, 65, 10, 2, 2, "F");

      doc.setTextColor(primaryColor);
      doc.setFontSize(8);
      doc.text("Total Comissão:", 125, summaryY + 46);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(totalCommission), 180, summaryY + 46, {
        align: "right",
      });
    }

    // Área para assinaturas (apenas para pedidos confirmados)
    if (order.status === "confirmado") {
      const signatureY = summaryY + 60;

      doc.setDrawColor(darkGray);
      doc.setLineWidth(0.2);

      // Assinatura cliente
      doc.line(25, signatureY, 85, signatureY);
      doc.setTextColor(darkGray);
      doc.setFontSize(7);
      doc.text("Assinatura do Cliente", 55, signatureY + 5, {
        align: "center",
      });

      // Assinatura representante
      doc.line(125, signatureY, 185, signatureY);
      doc.text("Assinatura do Representante", 155, signatureY + 5, {
        align: "center",
      });
    }

    // Rodapé
    const footerY = pageHeight - 10;

    doc.setDrawColor(darkGray);
    doc.setLineWidth(0.2);
    doc.line(15, footerY - 8, pageWidth - 15, footerY - 8);

    doc.setTextColor(darkGray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");

    doc.text(
      "Este documento não possui valor fiscal.",
      pageWidth / 2,
      footerY - 5,
      { align: "center" },
    );
    doc.text(
      `Gerado em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`,
      pageWidth / 2,
      footerY,
      { align: "center" },
    );

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
    const ctx = canvas.getContext("2d");
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
      ctx.fillText(
        `${item.name} (${item.quantity}x) - ${formatCurrency(item.subtotal)}`,
        30,
        y,
      );
      y += 25;
    });

    if (items.length > 4) {
      ctx.fillText("...", 30, y);
    }

    ctx.font = "bold 14px Arial";
    ctx.fillText(
      "Total: " + formatCurrency(order.total),
      canvas.width - 150,
      y + 40,
    );
  }, [order, items]);

  // Adicionar estilos para impressão limpa
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }

        .print-document, .print-document * {
          visibility: visible;
          color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .print-status {
          border: 3px solid !important;
          color: white !important;
          font-weight: bold !important;
          background-color: #000000 !important;
          padding: 10px 16px !important;
          font-size: 16px !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .print-document .print-status {
          display: inline-block !important;
          visibility: visible !important;
        }

        .print-document {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }

        .sidebar, .bottom-nav {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">
          Visualizar Pedido #{order.id}
        </h2>
        <p className="text-gray-500 mb-2">
          Utilize os botões abaixo para baixar o PDF ou imprimir o pedido.
        </p>

        {/* Preview canvas - visível apenas na tela */}
        <canvas
          ref={canvasRef}
          width={600}
          height={520}
          className="mx-auto border"
        ></canvas>

        {/* Conteúdo otimizado para impressão - só aparece na impressão */}
        <div className="hidden print:block print-document">
          <PrintOrderTemplate
            order={{ ...order, totalCommission }}
            items={items}
            showClientRefs={showClientRefs}
          />
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
