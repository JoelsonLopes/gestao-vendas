import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import * as Papa from "papaparse";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => void;
  title: string;
  description: string;
  templateFields: string[];
  loading?: boolean;
  showRepresentativeSelect?: boolean;
  representatives?: Array<{ id: number, name: string }>;
  regions?: Array<{ id: number, name: string }>;
}

export function ImportModal({
  isOpen,
  onClose,
  onImport,
  title,
  description,
  templateFields,
  loading = false,
  showRepresentativeSelect = false,
  representatives = [],
  regions = []
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<boolean>(false);
  
  // Formulário para representante (que será vinculado à região automaticamente)
  const importFormSchema = z.object({
    representativeId: z.string().min(1, "Representante é obrigatório"),
  });
  
  const form = useForm<z.infer<typeof importFormSchema>>({
    resolver: zodResolver(importFormSchema),
    defaultValues: {
      representativeId: representatives && representatives.length > 0 ? representatives[0].id.toString() : "0",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: function(header) {
        // Normalizar cabeçalhos para evitar duplicatas
        const normalizedHeader = header.trim().toLowerCase();
        
        // Mapeamento de cabeçalhos comuns para nomes padronizados
        if (normalizedHeader.includes('idproduto') || normalizedHeader.includes('cod') || normalizedHeader.includes('código')) {
          return 'code';
        } else if (normalizedHeader.includes('nome') || normalizedHeader === 'produto' || normalizedHeader === 'cliente') {
          return 'name';
        } else if (normalizedHeader.includes('preço') || normalizedHeader === 'preco' || normalizedHeader === 'valor') {
          return 'price';
        } else if (normalizedHeader === 'marca') {
          return 'brand';
        } else if (normalizedHeader === 'conversao' || normalizedHeader === 'conversão') {
          return 'conversion';
        } else if (normalizedHeader === 'marcaconversao' || normalizedHeader.includes('marca conversão')) {
          return 'conversionBrand';
        } else if (normalizedHeader.includes('descrição') || normalizedHeader.includes('descricao')) {
          return 'description';
        } else if (normalizedHeader.includes('categoria') || normalizedHeader === 'category') {
          return 'category';
        } else if (normalizedHeader.includes('estoque') || normalizedHeader.includes('quantidade')) {
          return 'stockQuantity';
        } else if (normalizedHeader.includes('barras') || normalizedHeader === 'ean' || normalizedHeader === 'barcode') {
          return 'barcode';
        } else if (normalizedHeader.includes('ativo') || normalizedHeader === 'status' || normalizedHeader === 'active') {
          return 'active';
        } else if (normalizedHeader.includes('cnpj') || normalizedHeader.includes('cpf')) {
          return 'cnpj';
        } else if (normalizedHeader.includes('cidade')) {
          return 'city';
        } else if (normalizedHeader.includes('estado') || normalizedHeader === 'uf') {
          return 'state';
        } else if (normalizedHeader.includes('telefone') || normalizedHeader.includes('contato') || normalizedHeader.includes('whatsapp')) {
          return 'phone';
        } else if (normalizedHeader.includes('email') || normalizedHeader.includes('e-mail')) {
          return 'email';
        } else if (normalizedHeader.includes('endereco') || normalizedHeader.includes('endereço')) {
          return 'address';
        }
        
        // Se não tiver um mapeamento específico, manter o cabeçalho original
        return header;
      },
      complete: (results: any) => {
        const { data, errors, meta } = results;
        
        if (errors.length > 0) {
          console.warn("Erros durante o parse:", errors);
          setError(`Erro ao processar o arquivo: ${errors[0].message || "Formato inválido"}`);
          return;
        }
        
        // Log para debug
        console.log("Meta info:", meta);
        console.log("Primeiras linhas:", data.slice(0, 2));
        
        if (data.length === 0) {
          setError("Arquivo vazio ou sem dados válidos.");
          return;
        }
        
        // Verificar se temos pelo menos os campos mínimos necessários
        const firstRow = data[0];
        if (!firstRow) {
          setError("Não foi possível ler os dados do arquivo.");
          return;
        }
        
        // Verificar se temos pelo menos nome e/ou código para identificar o produto
        const hasRequiredFields = firstRow.hasOwnProperty('name') || firstRow.hasOwnProperty('code');
        
        if (!hasRequiredFields) {
          setError("O arquivo deve conter pelo menos o nome ou código do produto.");
          return;
        }
        
        setParsedData(data);
        setPreview(true);
      },
      error: (error) => {
        console.error("Erro no parse:", error);
        setError(`Erro ao processar o arquivo: ${error.message || "Formato inválido"}`);
      }
    });
  };

  const handleImport = () => {
    if (parsedData.length > 0) {
      console.log(`Enviando ${parsedData.length} registros para importação`);
      
      // Se estiver selecionado representante ou região, adiciona aos dados
      const formValues = form.getValues();
      // Verificar se o valor é "0" (quando nenhum é selecionado) ou um representante válido
      const representativeId = formValues.representativeId && formValues.representativeId !== "0" 
                              ? formValues.representativeId 
                              : undefined;
      
      // Obtém representante correspondente para encontrar a região associada
      const selectedRepresentative = representatives.find(rep => rep.id.toString() === representativeId);
      // Utiliza o mesmo ID para representante e região (quando disponível)
      const regionId = selectedRepresentative ? selectedRepresentative.id.toString() : undefined;
      
      // Adiciona representante e região a todos os registros quando selecionado
      let dataToImport = [...parsedData];
      if (representativeId) {
        dataToImport = parsedData.map(item => ({
          ...item,
          representativeId: representativeId,
          // Associa a região ao mesmo ID do representante
          regionId: regionId
        }));
      }
      
      // Log para debugging
      console.log("Dados com representante/região:", dataToImport.slice(0, 2));
      
      onImport(dataToImport);
      // Não fechamos o modal aqui para que a UI mostre o estado de carregamento
      // O modal será fechado pelo callback de sucesso da mutação
    }
  };

  const resetModal = () => {
    setFile(null);
    setParsedData([]);
    setError(null);
    setPreview(false);
    form.reset();
    onClose();
  };

  const downloadTemplate = () => {
    // Usar nomes de cabeçalho mais descritivos para o modelo
    const headers = [];
    templateFields.forEach(field => {
      switch(field) {
        case 'code':
          headers.push('IdProduto');
          break;
        case 'name':
          headers.push('Nome');
          break;
        case 'price':
          headers.push('Preco');
          break;
        case 'brand':
          headers.push('Marca');
          break;
        case 'conversion':
          headers.push('Conversao');
          break;
        case 'conversionBrand':
          headers.push('MarcaConversao');
          break;
        case 'description':
          headers.push('Descricao');
          break;
        case 'category':
          headers.push('Categoria');
          break;
        case 'stockQuantity':
          headers.push('Estoque');
          break;
        case 'barcode':
          headers.push('CodigoBarras');
          break;
        case 'active':
          headers.push('Ativo');
          break;
        case 'cnpj':
          headers.push('CNPJ');
          break;
        case 'city':
          headers.push('Cidade');
          break;
        case 'phone':
          headers.push('Telefone');
          break;
        case 'email':
          headers.push('Email');
          break;
        case 'address':
          headers.push('Endereco');
          break;
        case 'state':
          headers.push('Estado');
          break;
        default:
          headers.push(field);
      }
    });
    
    const csvContent = headers.join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    // Determinar o tipo de template com base nos campos
    const isProductTemplate = templateFields.includes('price') || 
                             templateFields.includes('brand') || 
                             templateFields.includes('stockQuantity');
    const isClientTemplate = templateFields.includes('cnpj') || 
                            templateFields.includes('phone') || 
                            templateFields.includes('address');
    
    let fileName = "modelo-importacao";
    if (isProductTemplate) {
      fileName += "-produtos.csv";
    } else if (isClientTemplate) {
      fileName += "-clientes.csv";
    } else {
      fileName += ".csv";
    }
    
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetModal}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        {!preview ? (
          <>
            <Form {...form}>
              <div className="grid gap-4 py-4">
                {/* Dropzone para o arquivo */}
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-10">
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Arraste e solte seu arquivo CSV ou Excel, ou clique para selecionar
                  </p>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Label
                    htmlFor="file"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer"
                  >
                    Selecionar Arquivo
                  </Label>
                  {file && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Arquivo selecionado: {file.name}
                    </p>
                  )}
                  {error && (
                    <p className="mt-2 text-sm text-red-500">
                      {error}
                    </p>
                  )}
                </div>

                {/* Formulário apenas para representante */}
                {showRepresentativeSelect && (
                  <div className="grid gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="representativeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Representante</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o representante" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {representatives.length > 0 ? (
                                representatives.map((rep) => (
                                  <SelectItem key={rep.id} value={rep.id.toString()}>
                                    {rep.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="0">Nenhum representante disponível</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground mt-1">
                            Todos os clientes importados serão associados a este representante.
                          </p>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {/* Campos aceitos e botão de download do modelo */}
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                        Campos aceitos:
                      </Label>
                      <ul className="text-xs text-gray-500 dark:text-gray-400 list-disc pl-4">
                        {templateFields.includes('code') && <li>Código / IdProduto / Cod / CODIGO</li>}
                        {templateFields.includes('name') && <li>Nome / Produto / NOME / cliente</li>}
                        {templateFields.includes('price') && <li>Preço / Preco / PRECO / valor</li>}
                        {templateFields.includes('brand') && <li>Marca / MARCA</li>}
                        {templateFields.includes('conversion') && <li>Conversao / Conversão</li>}
                        {templateFields.includes('conversionBrand') && <li>MarcaConversao / Marca Conversão</li>}
                        {templateFields.includes('description') && <li>Descrição / Description / DESCRICAO</li>}
                        {templateFields.includes('category') && <li>Categoria / Category / CATEGORIA</li>}
                        {templateFields.includes('stockQuantity') && <li>Estoque / Quantidade</li>}
                        {templateFields.includes('barcode') && <li>Código de Barras / EAN / barcode</li>}
                        {templateFields.includes('active') && <li>Ativo / Status / active</li>}
                        {templateFields.includes('cnpj') && <li>CNPJ / CPF / Documento</li>}
                        {templateFields.includes('city') && <li>Cidade / city</li>}
                        {templateFields.includes('state') && <li>Estado / UF / state</li>}
                        {templateFields.includes('phone') && <li>Telefone / Contato / WhatsApp</li>}
                        {templateFields.includes('email') && <li>Email / E-mail</li>}
                        {templateFields.includes('address') && <li>Endereço / Logradouro</li>}
                      </ul>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadTemplate}
                      className="text-primary-600"
                    >
                      Baixar Modelo
                    </Button>
                  </div>
                </div>
              </div>
            </Form>
          </>
        ) : (
          <div className="grid gap-4 py-4">
            <h3 className="text-md font-medium">Prévia dos dados ({parsedData.length} registros)</h3>
            <div className="overflow-auto max-h-[300px] border rounded-md">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {Object.keys(parsedData[0] || {}).map((header) => (
                      <th 
                        key={header}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {parsedData.slice(0, 5).map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value: any, i) => (
                        <td 
                          key={i}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {parsedData.length > 5 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando 5 de {parsedData.length} registros.
              </p>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={resetModal}>
            Cancelar
          </Button>
          {preview && (
            <Button 
              type="submit" 
              onClick={handleImport}
              disabled={parsedData.length === 0 || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                `Importar ${parsedData.length} ${parsedData.length === 1 ? 'registro' : 'registros'}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
