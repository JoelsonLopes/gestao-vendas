"use client"

import { formatCurrency, formatDate } from "@/lib/utils"

interface PrintItemProps {
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

interface PrintOrderTemplateProps {
  order: {
    id: number
    clientId?: number
    clientName: string
    clientCode?: string
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
  items: PrintItemProps[]
  showClientRefs?: boolean
}

export function PrintOrderTemplate({ order, items, showClientRefs = true }: PrintOrderTemplateProps) {
  // Calcular o total de comissão se não for fornecido
  const totalCommission =
    order.totalCommission ??
    (order.status === "confirmado"
      ? items.reduce((total, item) => {
          const quantity = typeof item.quantity === "string" ? Number(item.quantity) : item.quantity || 0
          const unitPrice = typeof item.unitPrice === "string" ? Number(item.unitPrice) : item.unitPrice || 0
          const discount = typeof item.discount === "string" ? Number(item.discount) : item.discount || 0
          const commission = typeof item.commission === "string" ? Number(item.commission) : item.commission || 0

          const discountedPrice = unitPrice * (1 - discount / 100)
          return total + (quantity * discountedPrice * commission) / 100
        }, 0)
      : 0)

  // Calcular o total de peças
  const totalPieces = items.reduce((total, item) => {
    const quantity = typeof item.quantity === "string" ? Number(item.quantity) : item.quantity || 0
    return total + quantity
  }, 0)

  return (
    <div className="max-w-[210mm] mx-auto print:mx-0 p-4 print:p-[10mm] bg-white print-document">
      <style
        dangerouslySetInnerHTML={{
          __html: `
    @media print {
      /* Permitir quebras de página naturais */
      .print-document {
        display: block;
      }
      
      /* Evitar quebras dentro de linhas da tabela */
      tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* Evitar quebras dentro do cabeçalho da tabela */
      thead {
        display: table-header-group;
      }
      
      /* Permitir quebras dentro da tabela */
      table {
        page-break-inside: auto;
        break-inside: auto;
      }
      
      /* Evitar quebras dentro do resumo financeiro */
      .summary-section {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* Garantir que o rodapé fique no final da página */
      .footer {
        position: relative;
        margin-top: 1rem;
      }
    }
  `,
        }}
      />
      {/* Cabeçalho Principal - Reduzido em altura */}
      <div className="w-full border-b border-blue-200 pb-2 mb-2 flex justify-between items-start">
        {/* Logo e Nome da Empresa */}
        <div className="flex items-center">
          <div className="bg-blue-600 text-white font-bold text-lg p-1.5 rounded-md mr-2">JP</div>
          <div>
            <h1 className="text-blue-600 text-lg font-bold">Joelson Lopes</h1>
            <p className="text-xs text-gray-500">Representações Comerciais</p>
          </div>
        </div>

        {/* Número do Pedido, Data e Status */}
        <div className="text-right">
          {/* Badge de Status - Tamanho reduzido */}
          <div
            className="inline-block print-status rounded-md text-center"
            style={{
              borderColor: order.status === "confirmado" ? "#16a34a" : "#f59e0b",
              backgroundColor: order.status === "confirmado" ? "#16a34a" : "#f59e0b",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "bold",
              padding: "4px 8px",
              borderWidth: "2px",
              borderStyle: "solid",
              minWidth: "120px",
            }}
          >
            {order.status === "confirmado" ? "PEDIDO CONFIRMADO" : "COTAÇÃO"}
          </div>
          <div className="flex items-center justify-end mt-1">
            <h2 className="text-base font-bold">PEDIDO #{order.id}</h2>
            <span className="text-xs ml-2 text-gray-600">({formatDate(order.date)})</span>
          </div>
        </div>
      </div>

      {/* Seção de Informações Principais - Layout compacto em grid */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {/* Cliente */}
        <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="text-xs font-bold uppercase text-blue-600 border-b border-gray-200 pb-0.5 mb-1">CLIENTE</h3>
          <p className="text-xs font-medium">
            {order.clientName} <span className=""> - Cod. {order.clientCode}</span>
          </p>
          <p className="text-xs">
            CNPJ: <span className="font-medium">{order.clientCnpj}</span>
          </p>
        </div>

        {/* Pagamento */}
        <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="text-xs font-bold uppercase text-blue-600 border-b border-gray-200 pb-0.5 mb-1">PAGAMENTO</h3>
          <p className="text-xs">{order.paymentTerms}</p>
        </div>

        {/* Representante */}
        <div className="p-2 bg-gray-50 rounded-md border border-gray-200 col-span-2">
          <h3 className="text-xs font-bold uppercase text-blue-600 border-b border-gray-200 pb-0.5 mb-1">
            REPRESENTANTE
          </h3>
          <p className="text-xs">{order.representative}</p>
        </div>
      </div>

      {/* Observações do Pedido - Compacto */}
      {order.notes && (
        <div className="mb-2">
          <div className="p-2 bg-blue-50 rounded-md border border-blue-200">
            <h3 className="text-xs font-bold uppercase text-blue-600 border-b border-blue-200 pb-0.5 mb-1">
              OBSERVAÇÕES
            </h3>
            <p className="text-xs">{order.notes}</p>
          </div>
        </div>
      )}

      {/* Tabela de Itens - Começa logo após as informações do cliente */}
      <div className="mb-2">
        <h3 className="text-xs font-bold uppercase text-blue-600 border-b border-blue-200 ml-1 pb-0.5 mb-1">
          ITENS DO PEDIDO
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {showClientRefs && (
                  <th className="p-1 text-left text-xs font-medium text-gray-600 uppercase border-b border-gray-200">
                    Ref.
                  </th>
                )}
                <th className="p-1 text-left text-xs font-medium text-gray-600 uppercase border-b border-gray-200">
                  Produto
                </th>
                <th className="p-1 text-right text-xs font-medium text-gray-600 uppercase border-b border-gray-200">
                  Qtd
                </th>
                <th className="p-1 text-right text-xs font-medium text-gray-600 uppercase border-b border-gray-200">
                  Desc.
                </th>
                <th className="p-1 text-right text-xs font-medium text-gray-600 uppercase border-b border-gray-200">
                  Preço
                </th>
                <th className="p-1 text-right text-xs font-medium text-gray-600 uppercase border-b border-gray-200">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                // Cálculo do preço com desconto
                const itemDiscount = typeof item.discount === "string" ? Number(item.discount) : item.discount || 0
                const itemUnitPrice = typeof item.unitPrice === "string" ? Number(item.unitPrice) : item.unitPrice || 0
                const priceWithDiscount = itemDiscount > 0 ? itemUnitPrice * (1 - itemDiscount / 100) : itemUnitPrice

                return (
                  <tr key={index} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-200`}>
                    {showClientRefs && (
                      <td className="p-0.5 align-middle text-xs">
                        {item.clientRef ? (
                          <span className="inline-block bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-xs">
                            {item.clientRef}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    )}

                    <td className="p-0.5 align-middle text-xs">
                      <span className="font-medium">{item.name}</span>
                      {item.brand && <span className="text-gray-500 ml-1 text-xs">({item.brand})</span>}
                    </td>
                    <td className="p-0.5 align-middle text-xs text-right font-medium">{item.quantity}</td>
                    <td className="p-0.5 align-middle text-xs text-right">
                      {itemDiscount > 0 ? (
                        item.discountName ? (
                          <span className="inline-block bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-xs">
                            {item.discountName}
                          </span>
                        ) : (
                          <span>{itemDiscount}%</span>
                        )
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="p-0.5 align-middle text-xs text-right font-medium">
                      {formatCurrency(priceWithDiscount)}
                    </td>
                    <td className="p-0.5 align-middle text-xs text-right font-bold">{formatCurrency(item.subtotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumos Financeiros e de Peças */}
      <div className="summary-section grid grid-cols-2 gap-2 mb-2">
        {/* Resumo de Peças */}
        <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="text-xs font-bold uppercase text-blue-600 border-b border-gray-200 pb-0.5 mb-1">
            RESUMO DE PEÇAS
          </h3>

          <div className="flex mb-1">
            <div className="flex-1 mr-1 p-1 bg-white rounded-md shadow-sm">
              <p className="text-xs text-gray-600">Total de Peças</p>
              <p className="text-sm font-bold text-blue-600">{totalPieces}</p>
            </div>

            <div className="flex-1 p-1 bg-white rounded-md shadow-sm">
              <p className="text-xs text-gray-600">Qtd. Itens</p>
              <p className="text-sm font-bold text-blue-600">{items.length}</p>
            </div>
          </div>

          {/* Produtos por marca (opcional) */}
          <div className="mt-1 pt-1 border-t border-gray-200">
            <p className="text-xs text-gray-600">Produtos por marca:</p>
            {Object.entries(
              items.reduce(
                (acc, item) => {
                  const brand = item.brand || "Sem marca"
                  acc[brand] = (acc[brand] || 0) + 1
                  return acc
                },
                {} as Record<string, number>,
              ),
            ).map(([brand, count], i) => (
              <div key={i} className="flex justify-between text-xs">
                <span>{brand}:</span>
                <span>{count} itens</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="text-xs font-bold uppercase text-blue-600 border-b border-gray-200 pb-0.5 mb-1">
            RESUMO FINANCEIRO
          </h3>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Subtotal:</span>
              <span className="text-xs font-medium">{formatCurrency(order.subtotal)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Taxa de Frete:</span>
              <span className="text-xs font-medium">{formatCurrency(order.taxes)}</span>
            </div>

            <div className="flex justify-between items-center pt-1 mt-1 border-t border-gray-200">
              <span className="text-xs font-bold">Total:</span>
              <span className="text-sm font-bold text-blue-600">{formatCurrency(order.total)}</span>
            </div>

            {order.status === "confirmado" && (
              <div className="flex justify-between items-center mt-1 bg-blue-50 p-1 rounded-md">
                <span className="text-xs font-medium text-blue-600">Total Comissão:</span>
                <span className="text-xs font-bold text-blue-600">{formatCurrency(totalCommission)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Condições Gerais - Movido para depois dos itens */}
      {order.status !== "confirmado" && (
        <div className="mb-2">
          <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-xs font-bold uppercase text-blue-600 border-b border-gray-200 pb-0.5 mb-1">
              CONDIÇÕES GERAIS DA COTAÇÃO
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <p className="text-xs">1. Validade da proposta: 15 dias corridos.</p>
              <p className="text-xs">4. Frete: Pedidos abaixo de R$ 600,00 será cobrado taxa de R$ 25,00.</p>                        
              <p className="text-xs">2. Prazo de entrega: A combinar.</p>
              <p className="text-xs">5. Suporte: Em caso de dúvidas, entre em contato com nossa equipe.</p>
              <p className="text-xs">3. Condições de pagamento: A combinar.</p>
              
            </div>
          </div>
        </div>
      )}

      {/* Área para Assinaturas */}
      <div className="footer mt-2">
        <div className="w-[50%] mx-auto">
          <div className="border-t border-gray-300 pt-1">
            <p className="text-xs text-center text-gray-500">Sistema Gestão de Vendas</p>
            <p className="text-xs text-center text-gray-500">Desenvolvido por Joelson Lopes Developer</p>
          </div>
        </div>
      </div>
    </div>
  )
}
