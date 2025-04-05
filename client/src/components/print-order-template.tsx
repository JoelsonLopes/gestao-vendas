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

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Cabeçalho */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-blue-600 text-xl font-bold">GestãoPedidos</h1>
          <h2 className="text-xl font-bold mt-2">PEDIDO #{order.id}</h2>
          <p className="text-sm text-gray-500">Data: {formatDate(order.date)}</p>
        </div>
        
        <div className="text-right">
          <div className={`border px-3 py-1 ${order.status === 'confirmado' ? 'border-green-600' : 'border-amber-500'}`}>
            <span className="text-sm font-bold">{order.status === 'confirmado' ? 'PEDIDO CONFIRMADO' : 'COTAÇÃO'}</span>
          </div>
        </div>
      </div>
      
      {/* Separador */}
      <div className="border-b border-gray-300 my-4"></div>
      
      {/* Cliente e Data */}
      <div className="grid grid-cols-2 gap-6 mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase mb-1">CLIENTE</h3>
          <p className="mb-1">{order.clientName} (Cód:{order.clientId})</p>
          <p className="text-sm">CNPJ: {order.clientCnpj}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-bold uppercase mb-1">DATA</h3>
          <p>{formatDate(order.date)}</p>
        </div>
      </div>
      
      {/* Representante e Pagamento */}
      <div className="grid grid-cols-2 gap-6 mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase mb-1">REPRESENTANTE</h3>
          <p>{order.representative}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-bold uppercase mb-1">PAGAMENTO</h3>
          <p>{order.paymentTerms}</p>
        </div>
      </div>
      
      {/* Observações */}
      <div className="mb-6">
        <h3 className="text-sm font-bold uppercase mb-1">OBSERVAÇÕES</h3>
        <div className="border border-gray-300 p-3">
          <p className="text-sm">{order.notes ? order.notes : "Nenhuma observação."}</p>
        </div>
      </div>
      
      {/* Itens do Pedido */}
      <div className="mb-6">
        <h3 className="text-sm font-bold uppercase mb-2">ITENS DO PEDIDO</h3>
        
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Ref. Cliente</th>
              <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
              <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
              <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Desconto</th>
              <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Preço c/ Desconto</th>
              <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
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
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3 align-middle text-sm">
                    {item.clientRef || '-'}
                  </td>
                  <td className="py-3 align-middle text-sm">{item.name}</td>
                  <td className="py-3 align-middle text-sm text-right">{item.quantity}</td>
                  <td className="py-3 align-middle text-sm text-right">
                    {itemDiscount > 0 ? (
                      order.status === 'confirmado' && item.discountName 
                        ? <span>{item.discountName}</span>
                        : `${itemDiscount}%`
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
      
      {/* Resumo Financeiro */}
      <div className="flex justify-between items-start">
        {/* Resumo de Quantidades */}
        <div className="w-56 bg-gray-50 p-3 rounded-md border border-gray-200">
          <div className="flex justify-between items-center py-1 border-b border-gray-200 mb-1">
            <span className="text-sm font-bold text-gray-700">RESUMO DE PEÇAS</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-sm font-medium text-gray-600">Total de Peças:</span>
            <span className="text-sm font-bold">{items.reduce((total, item) => total + Number(item.quantity), 0)}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-sm font-medium text-gray-600">Quantidade de Itens:</span>
            <span className="text-sm font-medium">{items.length}</span>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="w-56">
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-gray-600">Subtotal:</span>
            <span className="text-sm font-medium">{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-gray-600">Taxa de Frete:</span>
            <span className="text-sm font-medium">{formatCurrency(order.taxes)}</span>
          </div>
          <div className="flex justify-between items-center py-1 font-bold">
            <span className="text-base">Total:</span>
            <span className="text-base">{formatCurrency(order.total)}</span>
          </div>
          
          {order.status === 'confirmado' && (
            <div className="flex justify-between items-center py-1 mt-2 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-600">Total Comissão:</span>
              <span className="text-sm font-medium">{formatCurrency(totalCommission)}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Rodapé */}
      <div className="mt-10 pt-2 border-t border-gray-300 text-center text-xs text-gray-500">
        <p>Este documento não possui valor fiscal.</p>
        <p>Impresso em {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}