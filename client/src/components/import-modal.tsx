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

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => void;
  title: string;
  description: string;
  templateFields: string[];
  loading?: boolean;
}

export function ImportModal({
  isOpen,
  onClose,
  onImport,
  title,
  description,
  templateFields,
  loading = false
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<boolean>(false);

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
        if (normalizedHeader.includes('cod') || normalizedHeader.includes('código')) {
          return 'code';
        } else if (normalizedHeader.includes('nome')) {
          return 'name';
        } else if (normalizedHeader.includes('cidade')) {
          return 'city';
        } else if (normalizedHeader.includes('cnpj')) {
          return 'cnpj';
        } else if (normalizedHeader.includes('whatsapp') || normalizedHeader.includes('telefone') || normalizedHeader.includes('fone')) {
          return 'phone';
        } else if (normalizedHeader.includes('endereço') || normalizedHeader.includes('endereco')) {
          return 'address';
        } else if (normalizedHeader.includes('estado') || normalizedHeader.includes('uf')) {
          return 'state';
        } else if (normalizedHeader.includes('email') || normalizedHeader.includes('e-mail')) {
          return 'email';
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
        
        // Verificar se temos pelo menos nome e/ou código para identificar o cliente
        const hasRequiredFields = firstRow.hasOwnProperty('name') || firstRow.hasOwnProperty('code');
        
        if (!hasRequiredFields) {
          setError("O arquivo deve conter pelo menos o nome ou código do cliente.");
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
      onImport(parsedData);
    }
  };

  const resetModal = () => {
    setFile(null);
    setParsedData([]);
    setError(null);
    setPreview(false);
    onClose();
  };

  const downloadTemplate = () => {
    // Usar nomes de cabeçalho mais descritivos para o modelo
    const headers = [];
    templateFields.forEach(field => {
      switch(field) {
        case 'code':
          headers.push('Código do Cliente');
          break;
        case 'name':
          headers.push('Nome do Cliente');
          break;
        case 'city':
          headers.push('Cidade');
          break;
        case 'cnpj':
          headers.push('CNPJ');
          break;
        case 'phone':
          headers.push('WhatsApp');
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
    link.setAttribute("download", "modelo-importacao-clientes.csv");
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
            <div className="grid gap-4 py-4">
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
              
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                      Campos aceitos:
                    </Label>
                    <ul className="text-xs text-gray-500 dark:text-gray-400 list-disc pl-4">
                      <li>Código do Cliente / Cod. do Cliente / CODIGO / code</li>
                      <li>Nome do Cliente / NOME / name</li>
                      <li>Cidade / CIDADE / city</li>
                      <li>CNPJ / cnpj</li>
                      <li>WhatsApp / Whatsapp / WHATSAPP / phone</li>
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
