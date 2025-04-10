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
    <div className="max-w-[210mm] mx-auto print:mx-0 p-8 print:p-[15mm] bg-white">
      {/* Cabeçalho Principal */}
      <header className="w-full border-b border-blue-200 pb-4 mb-4">
        <div className="flex justify-between items-start">
          {/* Logo e Nome da Empresa */}
          <div className="flex items-center">
            <div className="bg-blue-600 text-white font-bold text-xl p-2 rounded-md mr-3">JP</div>
            <div>
              <h1 className="text-blue-600 text-xl font-bold">Joelson Lopes</h1>
              <p className="text-sm text-gray-500">Representações Comerciais</p>
            </div>
          </div>
          
          {/* Número do Pedido e Status */}
          <div className="text-right">
            {/* Badge de Status */}
            <div className={`inline-block border-2 px-4 py-1 rounded-md font-medium text-sm ${
              order.status === 'confirmado' 
                ? 'border-green-600 bg-green-50 text-green-700' 
                : 'border-amber-500 bg-amber-50 text-amber-700'
            }`}>
              {order.status === 'confirmado' ? 'PEDIDO CONFIRMADO' : 'COTAÇÃO'}
            </div>
            <h2 className="text-xl font-bold mt-2">PEDIDO #{order.id}</h2>
          </div>
        </div>
      </header>
      
      {/* Seção de Informações Principais - Cliente/Data e Representante/Pagamento */}
      <section className="mb-6">
        {/* Cliente e Data na mesma linha */}
        <div className="flex w-full mb-4">
          <div className="flex-1 mr-4 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-gray-200 pb-1 mb-2">CLIENTE</h3>
            <p className="text-base font-medium">{order.clientName} <span className="text-gray-500 text-sm">#{order.clientId}</span></p>
            <p className="text-sm mt-1">CNPJ: <span className="font-medium">{order.clientCnpj}</span></p>
          </div>
          
          <div className="flex-1 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-gray-200 pb-1 mb-2">DATA</h3>
            <p className="text-base">{formatDate(order.date)}</p>
          </div>
        </div>
        
        {/* Representante e Pagamento na mesma linha */}
        <div className="flex w-full">
          <div className="flex-1 mr-4 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-gray-200 pb-1 mb-2">REPRESENTANTE</h3>
            <p className="text-base">{order.representative}</p>
          </div>
          
          <div className="flex-1 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-gray-200 pb-1 mb-2">PAGAMENTO</h3>
            <p className="text-base">{order.paymentTerms}</p>
          </div>
        </div>
      </section>
      
      {/* Observações do Pedido */}
      {order.notes && (
        <section className="mb-6">
          <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
            <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-blue-200 pb-1 mb-2">OBSERVAÇÕES</h3>
            <p className="text-sm">{order.notes}</p>
          </div>
        </section>
      )}
      
      {/* Tabela de Itens */}
      <section className="mb-6">
        <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-blue-200 pb-1 mb-3">ITENS DO PEDIDO</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">Ref. Cliente</th>
                <th className="p-2 text-left text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">Produto</th>
                <th className="p-2 text-right text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">Qtd</th>
                <th className="p-2 text-right text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">Desconto</th>
                <th className="p-2 text-right text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">Preço c/ Desc.</th>
                <th className="p-2 text-right text-xs font-medium text-gray-600 uppercase border-b-2 border-gray-200">Total</th>
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
                  <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200`}>
                    <td className="p-2 align-middle text-sm">
                      {item.clientRef ? (
                        <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-medium">
                          {item.clientRef}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-2 align-middle text-sm">
                      <span className="font-medium">{item.name}</span>
                      {item.brand && <span className="text-gray-500 ml-1">({item.brand})</span>}
                    </td>
                    <td className="p-2 align-middle text-sm text-right font-medium">{item.quantity}</td>
                    <td className="p-2 align-middle text-sm text-right">
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
                    <td className="p-2 align-middle text-sm text-right font-medium">{formatCurrency(priceWithDiscount)}</td>
                    <td className="p-2 align-middle text-sm text-right font-bold">{formatCurrency(item.subtotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      
      {/* Resumos Financeiros e de Peças */}
      <section className="flex w-full mb-6">
        {/* Resumo de Peças */}
        <div className="flex-1 mr-4 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-gray-200 pb-1 mb-2">RESUMO DE PEÇAS</h3>
          
          <div className="flex mb-3">
            <div className="flex-1 mr-2 p-3 bg-white rounded-md shadow-sm">
              <p className="text-sm text-gray-600">Total de Peças</p>
              <p className="text-xl font-bold text-blue-600">{totalPieces}</p>
            </div>
            
            <div className="flex-1 p-3 bg-white rounded-md shadow-sm">
              <p className="text-sm text-gray-600">Qtd. Itens</p>
              <p className="text-xl font-bold text-blue-600">{items.length}</p>
            </div>
          </div>
          
          {/* Produtos por marca (opcional) */}
          {order.status === 'confirmado' && (
            <div className="mt-2 pt-2 border-t border-gray-200">
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
        <div className="flex-1 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-gray-200 pb-1 mb-2">RESUMO FINANCEIRO</h3>
          
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
      </section>
      
      {/* Área para Assinaturas */}
      {order.status === 'confirmado' && (
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
        <p className="text-xs text-gray-500">Impresso em {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}</p>
        <p className="text-xs font-medium text-blue-600 mt-1">Joelson Lopes Representações</p>
      </footer>
    </div>
  );
}