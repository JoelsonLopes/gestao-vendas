import { formatCurrency, formatDate } from "@/lib/utils";

interface PrintItemProps {
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

interface PrintOrderTemplateProps {
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
    notes?: string;
  };
  items: PrintItemProps[];
}

export function PrintOrderTemplate({ order, items }: PrintOrderTemplateProps) {
  // Calcular o total de comissão se não for fornecido
  const totalCommission = order.totalCommission ?? (
    order.status === 'confirmado' 
      ? items.reduce((total, item) => {
          const quantity = typeof item.quantity === 'string' ? Number(item.quantity) : (item.quantity || 0);
          const unitPrice = typeof item.unitPrice === 'string' ? Number(item.unitPrice) : (item.unitPrice || 0);
          const discount = typeof item.discount === 'string' ? Number(item.discount) : (item.discount || 0);
          const commission = typeof item.commission === 'string' ? Number(item.commission) : (item.commission || 0);
          
          const discountedPrice = unitPrice * (1 - discount / 100);
          return total + (quantity * discountedPrice * commission / 100);
        }, 0)
      : 0
  );
  
  // Calcular o total de peças
  const totalPieces = items.reduce((total, item) => {
    const quantity = typeof item.quantity === 'string' ? Number(item.quantity) : (item.quantity || 0);
    return total + quantity;
  }, 0);

  return (
    <div className="max-w-4xl mx-auto p-8 print:p-4">
      {/* Cabeçalho com Logotipo e Informações */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center">
            <div className="bg-blue-600 text-white p-2 rounded-md mr-3">
              <h1 className="text-xl font-bold">JP</h1>
            </div>
            <div>
              <h1 className="text-blue-600 text-xl font-bold">Joelson Lopes</h1>
              <p className="text-sm text-gray-500">Representações Comerciais</p>
            </div>
          </div>
          <h2 className="text-xl font-bold mt-3 text-gray-800">PEDIDO #{order.id}</h2>
        </div>
        
        <div className="text-right">
          <div className={`border-2 px-4 py-2 rounded-md ${
            order.status === 'confirmado' 
              ? 'border-green-600 bg-green-50 text-green-700' 
              : 'border-amber-500 bg-amber-50 text-amber-700'
          }`}>
            <span className="text-sm font-bold">{order.status === 'confirmado' ? 'PEDIDO CONFIRMADO' : 'COTAÇÃO'}</span>
          </div>
          <p className="text-sm mt-2">Data: <span className="font-medium">{formatDate(order.date)}</span></p>
        </div>
      </div>
      
      {/* Separador de Seções */}
      <div className="border-b-2 border-blue-200 my-4"></div>
      
      {/* Seção de Cliente e Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-blue-600 mb-2">CLIENTE</h3>
          <p className="text-base font-medium mb-1">{order.clientName} <span className="text-gray-500">(Cód: {order.clientId})</span></p>
          <p className="text-sm mb-1"><span className="font-medium">CNPJ:</span> {order.clientCnpj}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-blue-600 mb-2">DATA</h3>
          <p className="text-base">{formatDate(order.date)}</p>
        </div>
      </div>
      
      {/* Seção de Representante e Pagamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-blue-600 mb-2">REPRESENTANTE</h3>
          <p className="text-base">{order.representative}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-blue-600 mb-2">PAGAMENTO</h3>
          <p className="text-base">{order.paymentTerms}</p>
        </div>
      </div>
      
      {/* Observações do Pedido */}
      <div className="mb-6">
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
          <h3 className="text-sm font-bold uppercase text-blue-600 mb-2">OBSERVAÇÕES</h3>
          <p className="text-sm">{order.notes ? order.notes : "Nenhuma observação."}</p>
        </div>
      </div>
      
      {/* Tabela de Itens do Pedido - Melhorada com Design Responsivo */}
      <div className="mb-6">
        <h3 className="text-sm font-bold uppercase text-blue-600 mb-3 border-b border-blue-200 pb-1">ITENS DO PEDIDO</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">Ref. Cliente</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">Produto</th>
                <th className="py-2 px-3 text-right text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">Qtd</th>
                <th className="py-2 px-3 text-right text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">Desconto</th>
                <th className="py-2 px-3 text-right text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">Preço c/ Desconto</th>
                <th className="py-2 px-3 text-right text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                // Cálculo do preço com desconto
                const itemDiscount = typeof item.discount === 'string' ? Number(item.discount) : (item.discount || 0);
                const itemUnitPrice = typeof item.unitPrice === 'string' ? Number(item.unitPrice) : (item.unitPrice || 0);
                const priceWithDiscount = itemDiscount > 0 
                  ? itemUnitPrice * (1 - itemDiscount / 100) 
                  : itemUnitPrice;
                  
                return (
                  <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200 hover:bg-blue-50`}>
                    <td className="py-3 px-3 align-middle text-sm">
                      {item.clientRef ? (
                        <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-medium">
                          {item.clientRef}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-3 align-middle text-sm">
                      <span className="font-medium">{item.name}</span>
                      {item.brand && <span className="text-gray-500 ml-1">({item.brand})</span>}
                    </td>
                    <td className="py-3 px-3 align-middle text-sm text-right font-medium">{item.quantity}</td>
                    <td className="py-3 px-3 align-middle text-sm text-right">
                      {itemDiscount > 0 ? (
                        order.status === 'confirmado' && item.discountName ? (
                          <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                            {item.discountName}
                          </span>
                        ) : (
                          <span>{itemDiscount}%</span>
                        )
                      ) : '-'}
                    </td>
                    <td className="py-3 px-3 align-middle text-sm text-right font-medium">{formatCurrency(priceWithDiscount)}</td>
                    <td className="py-3 px-3 align-middle text-sm text-right font-bold">{formatCurrency(item.subtotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Cards com Resumo Financeiro e de Peças */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resumo de Quantidades */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-blue-600 mb-2 border-b border-gray-200 pb-1">RESUMO DE PEÇAS</h3>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-white rounded-md shadow-sm">
              <p className="text-sm text-gray-600">Total de Peças</p>
              <p className="text-xl font-bold text-blue-600">{totalPieces}</p>
            </div>
            
            <div className="p-3 bg-white rounded-md shadow-sm">
              <p className="text-sm text-gray-600">Qtd. Itens</p>
              <p className="text-xl font-bold text-blue-600">{items.length}</p>
            </div>
          </div>
          
          {/* Código por Marca (opcional) */}
          {order.status === 'confirmado' && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Produtos por marca:</p>
              {Object.entries(items.reduce((acc, item) => {
                const brand = item.brand || 'Sem marca';
                acc[brand] = (acc[brand] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)).map(([brand, count], i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>{brand}:</span>
                  <span>{count} itens</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumo Financeiro */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-blue-600 mb-3 border-b border-gray-200 pb-1">RESUMO FINANCEIRO</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-sm font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-600">Taxa de Frete:</span>
              <span className="text-sm font-medium">{formatCurrency(order.taxes)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 mt-2 border-t border-gray-200">
              <span className="text-base font-bold">Total:</span>
              <span className="text-lg font-bold text-blue-600">{formatCurrency(order.total)}</span>
            </div>
            
            {order.status === 'confirmado' && (
              <div className="flex justify-between items-center py-1 mt-2 bg-blue-50 p-2 rounded-md">
                <span className="text-sm font-medium text-blue-600">Total Comissão:</span>
                <span className="text-sm font-bold text-blue-600">{formatCurrency(totalCommission)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Área de Assinaturas */}
      {order.status === 'confirmado' && (
        <div className="mt-8 grid grid-cols-2 gap-12">
          <div className="border-t border-gray-300 pt-2 text-center">
            <p className="text-xs text-gray-500">Assinatura do Cliente</p>
          </div>
          <div className="border-t border-gray-300 pt-2 text-center">
            <p className="text-xs text-gray-500">Assinatura do Representante</p>
          </div>
        </div>
      )}
      
      {/* Rodapé Aprimorado */}
      <div className="mt-10 pt-3 border-t border-gray-300 text-center">
        <p className="text-xs text-gray-500 mb-1">Este documento não possui valor fiscal.</p>
        <p className="text-xs text-gray-500">Impresso em {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}</p>
        <p className="text-xs font-medium text-blue-600 mt-1">Joelson Lopes Representações</p>
      </div>
    </div>
  );
}