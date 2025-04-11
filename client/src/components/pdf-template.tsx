"use client"

import { useRef, useEffect } from "react"
import { jsPDF } from "jspdf"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FileDown, Printer } from "lucide-react"
import { PrintOrderTemplate } from "./print-order-template"

// Interfaces bem definidas para melhor tipagem
interface PdfItem {
  id: number
  name: string
  code: string
  clientRef?: string | null
  quantity: number
  unitPrice: number
  discount: number
  subtotal: number
  brand?: string | null
  discountName?: string | null
  commission?: number
}

interface PdfOrder {
  id: number
  clientId?: number
  clientName: string
  clientCnpj: string
  date: string
  status: string
  paymentTerms: string
  subtotal: number
  discount: number
  taxes: number
  total: number
  representative: string
  totalCommission?: number
  notes?: string
}

interface PdfTemplateProps {
  order: PdfOrder
  items: PdfItem[]
  onClose?: () => void
}

export function PdfTemplate({ order, items, onClose }: PdfTemplateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Adicionar estilos para impressão limpa
  useEffect(() => {
    const style = document.createElement("style")
    style.innerHTML = `
    @media print {
      .print-clean * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .print-clean {
        overflow: hidden !important;
        position: relative !important;
        border: none !important;
        box-shadow: none !important;
      }
      
      /* Remover TODAS as linhas verticais indesejadas */
      .print-clean::before,
      .print-clean::after,
      .print-clean *::before,
      .print-clean *::after,
      body::before,
      body::after,
      html::before,
      html::after {
        display: none !important;
        content: none !important;
        border: none !important;
        width: 0 !important;
        height: 0 !important;
        background: none !important;
      }
      
      /* Garantir que não haja quebras de página indesejadas */
      .print-document {
        page-break-inside: avoid;
      }
      
      /* Remover todas as bordas verticais */
      table, tr, td, th {
        border-left: none !important;
        border-right: none !important;
      }
      
      /* Remover qualquer linha vertical no documento */
      * {
        box-shadow: none !important;
      }
    }
  `
    document.head.appendChild(style)

    // Adicionar uma classe ao body para controle adicional
    document.body.classList.add("printing-document")

    return () => {
      document.head.removeChild(style)
      document.body.classList.remove("printing-document")
    }
  }, [])

  // Funções auxiliares para cálculos
  const converterParaNumero = (valor: string | number | undefined): number => {
    if (valor === undefined) return 0
    return typeof valor === "string" ? Number(valor) : valor
  }

  const calcularTotalComissao = (): number => {
    if (order.totalCommission !== undefined) return order.totalCommission

    if (order.status !== "confirmado") return 0

    return items.reduce((total, item) => {
      const quantidade = converterParaNumero(item.quantity)
      const precoUnitario = converterParaNumero(item.unitPrice)
      const desconto = converterParaNumero(item.discount)
      const comissao = converterParaNumero(item.commission)

      const precoComDesconto = precoUnitario * (1 - desconto / 100)
      return total + (quantidade * precoComDesconto * comissao) / 100
    }, 0)
  }

  // Valor calculado da comissão total
  const totalComissao = calcularTotalComissao()

  // Registrar dados para depuração (mantido conforme solicitado)
  useEffect(() => {
    console.log("PdfTemplate recebeu order:", order)
    console.log("PdfTemplate recebeu items:", items)
    console.log("PdfTemplate totalCommission do order:", order.totalCommission)
  }, [order, items])

  // Função para criar um documento PDF com design moderno
  const criarDocumentoPdf = (): jsPDF => {
    const doc = new jsPDF()

    // Configurações de página
    const larguraPagina = doc.internal.pageSize.getWidth()
    const alturaPagina = doc.internal.pageSize.getHeight()

    // Definição de cores
    const cores = {
      primaria: "#3b82f6", // azul
      secundaria: "#f0f9ff", // azul claro
      verde: "#10b981", // verde para status confirmado
      ambar: "#f59e0b", // amarelo para cotação
      cinzaEscuro: "#374151", // texto principal
      cinzaClaro: "#f3f4f6", // fundo de seções
      azulClaro: "#e0f2fe", // fundo para observações
    }

    // Renderizar cabeçalho
    renderizarCabecalho(doc, larguraPagina, cores)

    // Renderizar informações do documento
    renderizarInfoDocumento(doc, larguraPagina, cores)

    // Renderizar seções de cliente, data, representante e pagamento
    renderizarSecoesPrincipais(doc, larguraPagina, cores)

    // Renderizar observações (se houver)
    const alturaAposObservacoes = renderizarObservacoes(doc, larguraPagina, cores)

    // Renderizar tabela de itens
    const alturaAposTabela = renderizarTabelaItens(doc, alturaAposObservacoes, larguraPagina, alturaPagina, cores)

    // Renderizar resumos financeiros e de peças
    const alturaAposResumos = renderizarResumos(doc, alturaAposTabela, larguraPagina, cores)

    // Renderizar área para assinaturas (apenas para pedidos confirmados)
    if (order.status === "confirmado") {
      renderizarAssinaturas(doc, alturaAposResumos, larguraPagina, cores)
    }

    // Renderizar rodapé
    renderizarRodape(doc, alturaPagina, larguraPagina, cores)

    return doc
  }

  // Funções de renderização do PDF
  const renderizarCabecalho = (doc: jsPDF, larguraPagina: number, cores: any): void => {
    // Cabeçalho superior
    doc.setFillColor(cores.primaria)
    doc.rect(0, 0, larguraPagina, 18, "F")

    // Logotipo e nome da empresa
    doc.setTextColor(255, 255, 255)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(15, 5, 8, 8, 1, 1, "F")

    doc.setFillColor(cores.primaria)
    doc.setTextColor(cores.primaria)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("JL", 16, 11)

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.text("Joelson Lopes", 30, 10)
    doc.setFontSize(8)
    doc.text("Representações Comerciais", 30, 14)
  }

  const renderizarInfoDocumento = (doc: jsPDF, larguraPagina: number, cores: any): void => {
    // Informações do documento
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(larguraPagina - 80, 22, 65, 35, 3, 3, "F")
    doc.setTextColor(cores.primaria)
    doc.setFontSize(12)
    doc.text(`PEDIDO #${order.id}`, larguraPagina - 45, 30, { align: "center" })

    // Badge de status moderno
    if (order.status === "confirmado") {
      doc.setFillColor(cores.verde)
    } else {
      doc.setFillColor(cores.ambar)
    }

    const statusText = order.status === "confirmado" ? "PEDIDO CONFIRMADO" : "COTAÇÃO"
    doc.roundedRect(larguraPagina - 68, 35, 40, 8, 2, 2, "F")

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text(statusText, larguraPagina - 48, 40, { align: "center" })

    // Data do pedido
    doc.setTextColor(cores.cinzaEscuro)
    doc.setFontSize(9)
    doc.text(`Data: ${formatDate(order.date)}`, larguraPagina - 48, 50, { align: "center" })
  }

  const renderizarSecoesPrincipais = (doc: jsPDF, larguraPagina: number, cores: any): void => {
    // Seção Cliente e Data (na mesma linha)
    renderizarSecao(doc, "CLIENTE", 15, 35, 15, 37, 50, 37, cores)
    renderizarSecao(doc, "DATA", 115, 35, 115, 37, 150, 37, cores)

    // Caixas para Cliente e Data
    doc.setFillColor(cores.cinzaClaro)
    doc.roundedRect(15, 40, 85, 25, 2, 2, "F")
    doc.roundedRect(115, 40, 80, 25, 2, 2, "F")

    // Conteúdo do Cliente
    doc.setTextColor(cores.cinzaEscuro)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text(`${order.clientName} (Cód: ${order.clientId})`, 20, 48)

    doc.setFont("helvetica", "normal")
    doc.text("CNPJ:", 20, 55)
    doc.setFont("helvetica", "bold")
    doc.text(order.clientCnpj, 45, 55)

    // Conteúdo da Data
    doc.setTextColor(cores.cinzaEscuro)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text(formatDate(order.date), 120, 48)

    // Representante e Pagamento (na mesma linha)
    renderizarSecao(doc, "REPRESENTANTE", 15, 75, 15, 77, 85, 77, cores)
    renderizarSecao(doc, "PAGAMENTO", 115, 75, 115, 77, 170, 77, cores)

    // Caixas para Representante e Pagamento
    doc.setFillColor(cores.cinzaClaro)
    doc.roundedRect(15, 80, 85, 15, 2, 2, "F")
    doc.roundedRect(115, 80, 80, 15, 2, 2, "F")

    // Conteúdo do Representante
    doc.setTextColor(cores.cinzaEscuro)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(order.representative, 20, 90)

    // Conteúdo do Pagamento
    doc.setTextColor(cores.cinzaEscuro)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(order.paymentTerms, 120, 90)
  }

  const renderizarSecao = (
    doc: jsPDF,
    titulo: string,
    x: number,
    y: number,
    linhaX1: number,
    linhaY: number,
    linhaX2: number,
    linhaY2: number,
    cores: any,
  ): void => {
    doc.setTextColor(cores.primaria)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text(titulo, x, y)

    doc.setDrawColor(cores.primaria)
    doc.setLineWidth(0.5)
    doc.line(linhaX1, linhaY, linhaX2, linhaY2)
  }

  const renderizarObservacoes = (doc: jsPDF, larguraPagina: number, cores: any): number => {
    if (!order.notes) return 110

    doc.setTextColor(cores.primaria)
    doc.setFontSize(10)
    doc.text("OBSERVAÇÕES", 15, 105)

    doc.setDrawColor(cores.primaria)
    doc.line(15, 107, 70, 107)

    doc.setFillColor(cores.azulClaro)
    doc.roundedRect(15, 110, 180, 15, 2, 2, "F")

    doc.setTextColor(cores.cinzaEscuro)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(order.notes, 20, 120)

    return 135
  }

  const renderizarTabelaItens = (
    doc: jsPDF,
    alturaInicial: number,
    larguraPagina: number,
    alturaPagina: number,
    cores: any,
  ): number => {
    // Importante: preservar a ordem original dos itens sem qualquer ordenação adicional
    const tabelaY = alturaInicial
    const tabelaX = 15

    doc.setTextColor(cores.primaria)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("ITENS DO PEDIDO", 15, tabelaY - 5)

    doc.setDrawColor(cores.primaria)
    doc.line(15, tabelaY - 3, 70, tabelaY - 3)

    // Fundo do cabeçalho da tabela
    doc.setFillColor(cores.primaria)
    doc.rect(tabelaX, tabelaY, 180, 8, "F")

    // Textos do cabeçalho
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text("Ref. Cliente", tabelaX + 5, tabelaY + 5)
    doc.text("Produto", tabelaX + 35, tabelaY + 5)
    doc.text("Qtd", tabelaX + 100, tabelaY + 5)
    doc.text("Desconto", tabelaX + 120, tabelaY + 5)
    doc.text("Preço c/ Desc.", tabelaX + 145, tabelaY + 5)
    doc.text("Total", tabelaX + 175, tabelaY + 5)

    // Linhas da tabela
    let alturaAtual = tabelaY + 8
    doc.setFontSize(8)

    // Importante: preservar a ordem original dos itens sem qualquer ordenação adicional
    items.forEach((item, index) => {
      // Nova página se necessário
      if (alturaAtual > alturaPagina - 60) {
        doc.addPage()
        alturaAtual = 20

        // Adicionar cabeçalho na nova página
        doc.setFillColor(cores.primaria)
        doc.rect(tabelaX, alturaAtual, 180, 8, "F")

        doc.setTextColor(255, 255, 255)
        doc.text("Ref. Cliente", tabelaX + 5, alturaAtual + 5)
        doc.text("Produto", tabelaX + 35, alturaAtual + 5)
        doc.text("Qtd", tabelaX + 100, alturaAtual + 5)
        doc.text("Desconto", tabelaX + 120, alturaAtual + 5)
        doc.text("Preço c/ Desc.", tabelaX + 145, alturaAtual + 5)
        doc.text("Total", tabelaX + 175, alturaAtual + 5)

        alturaAtual += 8
      }

      // Zebra striping para melhor legibilidade
      if (index % 2 === 0) {
        doc.setFillColor(cores.cinzaClaro)
        doc.rect(tabelaX, alturaAtual, 180, 8, "F")
      }

      // Reset de cores
      doc.setTextColor(cores.cinzaEscuro)
      doc.setFont("helvetica", "normal")

      // Conversão de valores para números
      const desconto = converterParaNumero(item.discount)
      const precoUnitario = converterParaNumero(item.unitPrice)
      const quantidade = converterParaNumero(item.quantity)
      const precoComDesconto = desconto > 0 ? precoUnitario * (1 - desconto / 100) : precoUnitario

      // Destaque para referência do cliente
      if (item.clientRef) {
        doc.setFillColor(cores.primaria)
        doc.setTextColor(255, 255, 255)
        doc.roundedRect(tabelaX + 3, alturaAtual + 1.5, 22, 5, 1, 1, "F")
        doc.text(item.clientRef, tabelaX + 5, alturaAtual + 5)
      } else {
        doc.setTextColor(cores.cinzaEscuro)
        doc.text("-", tabelaX + 5, alturaAtual + 5)
      }

      // Dados do item
      doc.setTextColor(cores.cinzaEscuro)
      const nomeExibido = item.name.length > 40 ? item.name.substring(0, 40) + "..." : item.name
      doc.text(nomeExibido, tabelaX + 35, alturaAtual + 5)
      doc.text(quantidade.toString(), tabelaX + 100, alturaAtual + 5)

      // Exibir nome do desconto para pedidos confirmados, ou apenas a porcentagem para cotações
      if (desconto > 0) {
        if (order.status === "confirmado" && item.discountName) {
          // Destacar o nome do desconto para pedidos confirmados
          doc.setFillColor(204, 229, 255) // Azul claro
          doc.roundedRect(tabelaX + 115, alturaAtual + 1.5, 15, 5, 1, 1, "F")
          doc.setTextColor(0, 51, 153) // Azul escuro
          doc.text(item.discountName, tabelaX + 120, alturaAtual + 5)
        } else {
          doc.setTextColor(cores.cinzaEscuro)
          doc.text(`${desconto}%`, tabelaX + 120, alturaAtual + 5)
        }
      } else {
        doc.text("-", tabelaX + 120, alturaAtual + 5)
      }

      // Preço com desconto e subtotal
      doc.setTextColor(cores.cinzaEscuro)
      doc.text(formatCurrency(precoComDesconto), tabelaX + 145, alturaAtual + 5)
      doc.setFont("helvetica", "bold")
      doc.text(formatCurrency(item.subtotal), tabelaX + 175, alturaAtual + 5)

      alturaAtual += 8
    })

    return alturaAtual + 15
  }

  const renderizarResumos = (doc: jsPDF, alturaInicial: number, larguraPagina: number, cores: any): number => {
    const resumoY = alturaInicial

    // Total peças e itens
    const totalPecas = items.reduce((total, item) => {
      const quantidade = converterParaNumero(item.quantity)
      return total + quantidade
    }, 0)

    // Grid para resumo de peças - lado esquerdo
    doc.setFillColor("#f8fafc") // Cinza claro
    doc.roundedRect(15, resumoY, 85, 40, 3, 3, "F")

    doc.setTextColor(cores.primaria)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text("RESUMO DE PEÇAS", 57.5, resumoY + 8, { align: "center" })

    // Card para total de peças
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(25, resumoY + 15, 30, 18, 2, 2, "F")

    doc.setTextColor(cores.cinzaEscuro)
    doc.setFontSize(8)
    doc.text("Total de Peças", 40, resumoY + 20, { align: "center" })

    doc.setTextColor(cores.primaria)
    doc.setFontSize(14)
    doc.text(totalPecas.toString(), 40, resumoY + 28, { align: "center" })

    // Card para quantidade de itens
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(60, resumoY + 15, 30, 18, 2, 2, "F")

    doc.setTextColor(cores.cinzaEscuro)
    doc.setFontSize(8)
    doc.text("Qtd. Itens", 75, resumoY + 20, { align: "center" })

    doc.setTextColor(cores.primaria)
    doc.setFontSize(14)
    doc.text(items.length.toString(), 75, resumoY + 28, { align: "center" })

    // Resumo financeiro - lado direito
    doc.setFillColor("#f8fafc")
    doc.roundedRect(110, resumoY, 85, 45, 3, 3, "F")

    doc.setTextColor(cores.primaria)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text("RESUMO FINANCEIRO", 152.5, resumoY + 8, { align: "center" })

    doc.setTextColor(cores.cinzaEscuro)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")

    // Valores financeiros
    doc.text("Subtotal:", 120, resumoY + 18)
    doc.setFont("helvetica", "bold")
    doc.text(formatCurrency(order.subtotal), 185, resumoY + 18, { align: "right" })

    doc.setFont("helvetica", "normal")
    doc.text("Taxa de Frete:", 120, resumoY + 25)
    doc.setFont("helvetica", "bold")
    doc.text(formatCurrency(order.taxes), 185, resumoY + 25, { align: "right" })

    // Linha separadora
    doc.setDrawColor(cores.primaria)
    doc.line(120, resumoY + 30, 185, resumoY + 30)

    // Total em destaque
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("Total:", 120, resumoY + 37)
    doc.setTextColor(cores.primaria)
    doc.setFontSize(12)
    doc.text(formatCurrency(order.total), 185, resumoY + 37, { align: "right" })

    // Mostrar comissão se o pedido estiver confirmado
    if (order.status === "confirmado") {
      doc.setFillColor("#dbeafe") // Azul bem claro
      doc.roundedRect(120, resumoY + 40, 65, 10, 2, 2, "F")

      doc.setTextColor(cores.primaria)
      doc.setFontSize(8)
      doc.text("Total Comissão:", 125, resumoY + 46)
      doc.setFont("helvetica", "bold")
      doc.text(formatCurrency(totalComissao), 180, resumoY + 46, { align: "right" })
    }

    return resumoY + 60
  }

  const renderizarAssinaturas = (doc: jsPDF, alturaInicial: number, larguraPagina: number, cores: any): void => {
    const assinaturaY = alturaInicial

    doc.setDrawColor(cores.cinzaEscuro)
    doc.setLineWidth(0.2)

    // Assinatura cliente
    doc.line(25, assinaturaY, 85, assinaturaY)
    doc.setTextColor(cores.cinzaEscuro)
    doc.setFontSize(7)
    doc.text("Assinatura do Cliente", 55, assinaturaY + 5, { align: "center" })

    // Assinatura representante
    doc.line(125, assinaturaY, 185, assinaturaY)
    doc.text("Assinatura do Representante", 155, assinaturaY + 5, { align: "center" })
  }

  const renderizarRodape = (doc: jsPDF, alturaPagina: number, larguraPagina: number, cores: any): void => {
    const rodapeY = alturaPagina - 10

    doc.setDrawColor(cores.cinzaEscuro)
    doc.setLineWidth(0.2)
    doc.line(15, rodapeY - 8, larguraPagina - 15, rodapeY - 8)

    doc.setTextColor(cores.cinzaEscuro)
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")

    doc.text("Este documento não possui valor fiscal.", larguraPagina / 2, rodapeY - 5, { align: "center" })
    doc.text(
      `Gerado em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`,
      larguraPagina / 2,
      rodapeY,
      { align: "center" },
    )
  }

  // Função para baixar o PDF
  const baixarPdf = (): void => {
    const doc = criarDocumentoPdf()
    doc.save(`pedido_${order.id}.pdf`)
  }

  // Função para imprimir usando a API nativa do navegador
  const imprimirPdf = (): void => {
    // Adicionar uma classe temporária ao body para controle adicional durante a impressão
    document.body.classList.add("printing-active")

    // Criar e adicionar um estilo específico para remover linhas verticais
    const styleTemp = document.createElement("style")
    styleTemp.innerHTML = `
    @media print {
      /* Remover qualquer elemento que possa estar causando a linha vertical */
      body.printing-active::before,
      body.printing-active::after,
      body.printing-active *::before,
      body.printing-active *::after {
        display: none !important;
        content: none !important;
        border: none !important;
        background: none !important;
        position: static !important;
        width: 0 !important;
        height: 0 !important;
      }
      
      /* Forçar o conteúdo a ser estático */
      .print-document {
        position: static !important;
        left: auto !important;
        top: auto !important;
        margin: 0 !important;
        padding: 15mm !important;
        width: auto !important;
        max-width: none !important;
      }
      
      /* Remover qualquer elemento posicionado fixo ou absoluto */
      body.printing-active * {
        position: static !important;
      }
    }
  `
    document.head.appendChild(styleTemp)

    // Chamar a impressão
    window.print()

    // Limpar após a impressão
    setTimeout(() => {
      document.head.removeChild(styleTemp)
      document.body.classList.remove("printing-active")
    }, 1000)
  }

  // Renderizar preview no canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    renderizarPreviewCanvas(ctx, canvas)
  }, [order, items])

  // Função para renderizar o preview no canvas
  const renderizarPreviewCanvas = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void => {
    // Limpar canvas
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Cabeçalho
    ctx.fillStyle = "#3b82f6"
    ctx.fillRect(0, 0, canvas.width, 40)

    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 16px Arial"
    ctx.fillText(`PEDIDO #${order.id}`, 20, 25)

    // Informações principais
    ctx.fillStyle = "#000000"
    ctx.font = "14px Arial"
    ctx.fillText("Cliente: " + order.clientName, 20, 70)
    ctx.fillText("CNPJ: " + order.clientCnpj, 20, 90)
    ctx.fillText("Data: " + formatDate(order.date), 20, 110)
    ctx.fillText("Status: " + order.status.toUpperCase(), 20, 130)

    // Separador
    ctx.fillStyle = "#3b82f6"
    ctx.fillRect(20, 150, canvas.width - 40, 2)

    // Resumo de itens
    ctx.fillStyle = "#000000"
    ctx.font = "bold 14px Arial"
    ctx.fillText("Itens: " + items.length, 20, 180)

    // Mini tabela de itens
    ctx.font = "12px Arial"
    let y = 210
    items.slice(0, 4).forEach((item) => {
      ctx.fillText(`${item.name} (${item.quantity}x) - ${formatCurrency(item.subtotal)}`, 30, y)
      y += 25
    })

    if (items.length > 4) {
      ctx.fillText("...", 30, y)
    }

    // Total
    ctx.font = "bold 14px Arial"
    ctx.fillText("Total: " + formatCurrency(order.total), canvas.width - 150, y + 40)
  }

  return (
    <div className="flex flex-col space-y-6 p-6 print-clean">
      <div>
        <h2 className="text-2xl font-bold mb-4">Visualizar Pedido #{order.id}</h2>
        <p className="text-gray-500 mb-2">Utilize os botões abaixo para baixar o PDF ou imprimir o pedido.</p>

        {/* Preview canvas - visível apenas na tela */}
        <canvas ref={canvasRef} width={600} height={520} className="mx-auto border"></canvas>

        {/* Conteúdo otimizado para impressão - só aparece na impressão */}
        <div className="hidden print:block print-document">
          <PrintOrderTemplate order={{ ...order, totalCommission: totalComissao }} items={items} />
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex justify-end space-x-4 print:hidden">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        )}
        <Button variant="outline" onClick={baixarPdf}>
          <FileDown className="mr-2 h-4 w-4" />
          Baixar PDF
        </Button>
        <Button onClick={imprimirPdf}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>
    </div>
  )
}
