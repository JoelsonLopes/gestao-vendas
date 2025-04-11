"use client"

import type React from "react"

import { useEffect } from "react"
import { formatCurrency, formatDate } from "@/lib/utils"

// Interfaces bem definidas para melhor tipagem
interface ItemProps {
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

interface OrderProps {
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

interface PrintOrderTemplateProps {
  order: OrderProps
  items: ItemProps[]
}

export function PrintOrderTemplate({ order, items }: PrintOrderTemplateProps) {
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
        overflow: visible !important;
        position: static !important;
        border: none !important;
        box-shadow: none !important;
      }
      
      /* Remover TODAS as linhas verticais indesejadas */
      body::after,
      body::before,
      html::after,
      html::before,
      div::after,
      div::before,
      *::after,
      *::before {
        content: none !important;
        display: none !important;
        border: none !important;
        background: none !important;
        position: static !important;
        width: 0 !important;
        height: 0 !important;
        box-shadow: none !important;
      }
      
      /* Garantir que não haja elementos posicionados absolutamente */
      .print-document {
        position: static !important;
        left: auto !important;
        top: auto !important;
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

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Funções auxiliares para cálculos
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

  const calcularTotalPecas = (): number => {
    return items.reduce((total, item) => {
      return total + converterParaNumero(item.quantity)
    }, 0)
  }

  const converterParaNumero = (valor: string | number | undefined): number => {
    if (valor === undefined) return 0
    return typeof valor === "string" ? Number(valor) : valor
  }

  const calcularPrecoComDesconto = (precoUnitario: number, desconto: number): number => {
    return desconto > 0 ? precoUnitario * (1 - desconto / 100) : precoUnitario
  }

  // Valores calculados
  const totalComissao = calcularTotalComissao()
  const totalPecas = calcularTotalPecas()

  // Agrupamento de produtos por marca
  const produtosPorMarca = items.reduce(
    (acc, item) => {
      const marca = item.brand || "Sem marca"
      acc[marca] = (acc[marca] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  // Importante: os itens são renderizados na ordem original em que foram recebidos
  // Não há ordenação adicional para preservar a sequência do pedido
  return (
    <div
      className="max-w-[210mm] mx-auto print:mx-0 p-8 print:p-[15mm] bg-white print-clean"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Cabeçalho */}
      <header className="w-full border-b border-blue-200 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="bg-blue-600 text-white font-bold text-xl p-2 rounded-md mr-3">JP</div>
            <div>
              <h1 className="text-blue-600 text-xl font-bold">Joelson Lopes</h1>
              <p className="text-sm text-gray-500">Representações Comerciais</p>
            </div>
          </div>

          <div className="text-right">
            <div
              className={`inline-block border-2 px-4 py-1 rounded-md font-medium text-sm ${
                order.status === "confirmado"
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-amber-500 bg-amber-50 text-amber-700"
              }`}
            >
              {order.status === "confirmado" ? "PEDIDO CONFIRMADO" : "COTAÇÃO"}
            </div>
            <h2 className="text-xl font-bold mt-2">PEDIDO #{order.id}</h2>
          </div>
        </div>
      </header>

      {/* Informações Principais */}
      <section className="mb-6">
        {/* Cliente e Data */}
        <div className="flex w-full mb-4">
          <InfoCard
            titulo="CLIENTE"
            className="flex-1 mr-4"
            conteudo={
              <>
                <p className="text-base font-medium">
                  {order.clientName} <span className="text-gray-500 text-sm">#{order.clientId}</span>
                </p>
                <p className="text-sm mt-1">
                  CNPJ: <span className="font-medium">{order.clientCnpj}</span>
                </p>
              </>
            }
          />

          <InfoCard titulo="DATA" className="flex-1" conteudo={<p className="text-base">{formatDate(order.date)}</p>} />
        </div>

        {/* Representante e Pagamento */}
        <div className="flex w-full">
          <InfoCard
            titulo="REPRESENTANTE"
            className="flex-1 mr-4"
            conteudo={<p className="text-base">{order.representative}</p>}
          />

          <InfoCard
            titulo="PAGAMENTO"
            className="flex-1"
            conteudo={<p className="text-base">{order.paymentTerms}</p>}
          />
        </div>
      </section>

      {/* Observações do Pedido */}
      {order.notes && (
        <section className="mb-6">
          <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
            <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-blue-200 pb-1 mb-2">
              OBSERVAÇÕES
            </h3>
            <p className="text-sm">{order.notes}</p>
          </div>
        </section>
      )}

      {/* Tabela de Itens */}
      <section className="mb-6">
        <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-blue-200 pb-1 mb-3">
          ITENS DO PEDIDO
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">
                  Ref. Cliente
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">
                  Produto
                </th>
                <th className="p-2 text-right text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">
                  Qtd
                </th>
                <th className="p-2 text-right text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">
                  Desconto
                </th>
                <th className="p-2 text-right text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">
                  Preço c/ Desc.
                </th>
                <th className="p-2 text-right text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const itemDesconto = converterParaNumero(item.discount)
                const itemPrecoUnitario = converterParaNumero(item.unitPrice)
                const precoComDesconto = calcularPrecoComDesconto(itemPrecoUnitario, itemDesconto)

                return (
                  <tr key={index} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-200`}>
                    <td className="p-2 align-middle text-sm">
                      {item.clientRef ? (
                        <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-medium">
                          {item.clientRef}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-2 align-middle text-sm">
                      <span className="font-medium">{item.name}</span>
                      {item.brand && <span className="text-gray-500 ml-1">({item.brand})</span>}
                    </td>
                    <td className="p-2 align-middle text-sm text-right font-medium">{item.quantity}</td>
                    <td className="p-2 align-middle text-sm text-right">
                      {itemDesconto > 0 ? (
                        order.status === "confirmado" && item.discountName ? (
                          <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                            {item.discountName}
                          </span>
                        ) : (
                          <span>{itemDesconto}%</span>
                        )
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-2 align-middle text-sm text-right font-medium">
                      {formatCurrency(precoComDesconto)}
                    </td>
                    <td className="p-2 align-middle text-sm text-right font-bold">{formatCurrency(item.subtotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Resumos Financeiros e de Peças */}
      <section className="flex w-full mb-6">
        {/* Resumo de Peças */}
        <div className="flex-1 mr-4 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-gray-200 pb-1 mb-2">
            RESUMO DE PEÇAS
          </h3>

          <div className="flex mb-3">
            <ResumoCard titulo="Total de Peças" valor={totalPecas} className="flex-1 mr-2" />
            <ResumoCard titulo="Qtd. Itens" valor={items.length} className="flex-1" />
          </div>

          {/* Produtos por marca (apenas para pedidos confirmados) */}
          {order.status === "confirmado" && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Produtos por marca:</p>
              {Object.entries(produtosPorMarca).map(([marca, quantidade], i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>{marca}:</span>
                  <span>{quantidade} itens</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumo Financeiro */}
        <div className="flex-1 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-gray-200 pb-1 mb-2">
            RESUMO FINANCEIRO
          </h3>

          <div className="space-y-2">
            <ValorFinanceiro label="Subtotal:" valor={order.subtotal} />
            <ValorFinanceiro label="Taxa de Frete:" valor={order.taxes} />

            <div className="flex justify-between items-center py-2 mt-2 border-t border-gray-200">
              <span className="text-base font-bold">Total:</span>
              <span className="text-lg font-bold text-blue-600">{formatCurrency(order.total)}</span>
            </div>

            {order.status === "confirmado" && (
              <div className="flex justify-between items-center py-1 mt-2 bg-blue-50 p-2 rounded-md">
                <span className="text-sm font-medium text-blue-600">Total Comissão:</span>
                <span className="text-sm font-bold text-blue-600">{formatCurrency(totalComissao)}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Área para Assinaturas (apenas para pedidos confirmados) */}
      {order.status === "confirmado" && (
        <section className="flex justify-between mt-8 mb-6">
          <div className="w-[45%]">
            <div className="border-t border-gray-300 pt-2">
              <p className="text-xs text-center text-gray-500">Assinatura do Cliente</p>
            </div>
          </div>

          <div className="w-[45%]">
            <div className="border-t border-gray-300 pt-2">
              <p className="text-xs text-center text-gray-500">Assinatura do Representante</p>
            </div>
          </div>
        </section>
      )}

      {/* Rodapé */}
      <footer className="mt-10 pt-3 border-t border-gray-300 text-center">
        <p className="text-xs text-gray-500 mb-1">Este documento não possui valor fiscal.</p>
        <p className="text-xs text-gray-500">
          Impresso em {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}
        </p>
        <p className="text-xs font-medium text-blue-600 mt-1">Joelson Lopes Representações</p>
      </footer>
    </div>
  )
}

// Componentes auxiliares para melhorar a reutilização e legibilidade
interface InfoCardProps {
  titulo: string
  conteudo: React.ReactNode
  className?: string
}

function InfoCard({ titulo, conteudo, className = "" }: InfoCardProps) {
  return (
    <div className={`p-4 bg-gray-50 rounded-md border border-gray-200 ${className}`}>
      <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-gray-200 pb-1 mb-2">{titulo}</h3>
      {conteudo}
    </div>
  )
}

interface ResumoCardProps {
  titulo: string
  valor: number | string
  className?: string
}

function ResumoCard({ titulo, valor, className = "" }: ResumoCardProps) {
  return (
    <div className={`p-3 bg-white rounded-md shadow-sm ${className}`}>
      <p className="text-sm text-gray-600">{titulo}</p>
      <p className="text-xl font-bold text-blue-600">{valor}</p>
    </div>
  )
}

interface ValorFinanceiroProps {
  label: string
  valor: number
}

function ValorFinanceiro({ label, valor }: ValorFinanceiroProps) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium">{formatCurrency(valor)}</span>
    </div>
  )
}
