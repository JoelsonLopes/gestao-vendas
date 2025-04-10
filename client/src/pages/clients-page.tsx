import { useState } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DataTable } from "@/components/data-table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, PlusCircle, Import, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Client, InsertClient } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { ImportModal } from "@/components/import-modal";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCnpj } from "@/lib/utils";

type Region = {
  id: number;
  name: string;
};

type Representative = {
  id: number;
  name: string;
};

export default function ClientsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Fetch clients
  const { data: clients, isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch regions (for admin users)
  const { data: regions = [], isLoading: isLoadingRegions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
    enabled: user?.role === "admin",
  });
  

  // Fetch representatives (for admin users)
  const { data: representatives = [], isLoading: isLoadingRepresentatives } = useQuery<Representative[]>({
    queryKey: ["/api/representatives"],
    enabled: user?.role === "admin",
  });

  // Client form validation schema
  const clientFormSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    cnpj: z.string().min(14, "CNPJ inválido"),
    code: z.string().min(1, "Código é obrigatório"),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    representativeId: z.number().optional(),
    regionId: z.number().optional(),
    active: z.boolean().default(true),
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (client: z.infer<typeof clientFormSchema>) => {
      const response = await apiRequest("POST", "/api/clients", client);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setClientModalOpen(false);
      toast({
        title: "Cliente criado",
        description: "Cliente foi criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao criar cliente: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertClient> }) => {
      const response = await apiRequest("PUT", `/api/clients/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setClientModalOpen(false);
      setEditingClient(null);
      toast({
        title: "Cliente atualizado",
        description: "Cliente foi atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar cliente: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Import clients mutation
  const importClientsMutation = useMutation({
    mutationFn: async (clients: any[]) => {
      // Process one by one to ensure proper validation
      const successfulImports = [];
      const errors = [];
      
      for (const client of clients) {
        try {
          // Mapear os campos da estrutura importada para a estrutura esperada pela API
          console.log("Processando cliente:", client);
          
          const clientData = {
            // Dados obrigatórios com valores padrão
            name: client.name || "",
            code: client.code || "",
            cnpj: client.cnpj || "",
            city: client.city || "",
            phone: client.phone || "",
            // Campos opcionais mas úteis
            address: client.address || "",
            state: client.state || "",
            email: client.email || "",
            // Para representantes, usar o ID do usuário logado
            representativeId: client.representativeId 
              ? parseInt(client.representativeId) 
              : (user?.role === "representative" ? user.id : undefined),
            regionId: client.regionId ? parseInt(client.regionId) : undefined,
            active: true
          };
          
          // Verificar campos obrigatórios
          if (!clientData.name) {
            throw new Error(`Nome do cliente não informado`);
          }
          
          if (!clientData.code) {
            // Gerar código baseado no nome se estiver vazio
            clientData.code = `CL${Date.now().toString().substring(5)}`;
          }
          
          // CNPJ é obrigatório para clientes brasileiros
          if (!clientData.cnpj) {
            throw new Error(`CNPJ não informado para o cliente: ${clientData.name}`);
          }
          
          // Formatação do CNPJ (remover caracteres não numéricos)
          clientData.cnpj = clientData.cnpj.toString().replace(/\D/g, "");
          
          // Validação mínima de CNPJ (pelo menos 14 dígitos)
          if (clientData.cnpj.length < 14) {
            clientData.cnpj = clientData.cnpj.padStart(14, '0');
          }
          
          console.log("Dados do cliente formatados:", clientData);
          
          const response = await apiRequest("POST", "/api/clients", clientData);
          const responseData = await response.json();
          successfulImports.push(responseData);
        } catch (error: any) {
          // Capturar erro específico ou mensagem genérica se for objeto vazio
          let errorMessage = "Erro desconhecido";
          
          if (error instanceof Error) {
            errorMessage = error.message || "Erro na importação";
          } else if (typeof error === 'string') {
            errorMessage = error;
          } else if (error && Object.keys(error).length === 0) {
            errorMessage = "Erro de formato ou validação de dados";
          }
          
          errors.push({ 
            name: client.name || "Cliente sem nome", 
            error: errorMessage
          });
          
          console.error("Erro ao importar cliente:", client, error);
        }
      }

      // Retornar informações de sucesso e erros
      return {
        successCount: successfulImports.length,
        errors
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setImportModalOpen(false);
      
      if (result.errors.length > 0) {
        toast({
          title: "Importação parcial",
          description: `${result.successCount} clientes importados com sucesso. ${result.errors.length} falhas.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Clientes importados",
          description: `${result.successCount} clientes foram importados com sucesso`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao importar clientes: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<z.infer<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      cnpj: "",
      code: "",
      address: "",
      city: "",
      state: "",
      phone: "",
      email: "",
      active: true,
      // For representatives, always use their own ID
      representativeId: user?.role === "representative" ? user.id : undefined,
    },
  });

  const openNewClientModal = () => {
    form.reset({
      name: "",
      cnpj: "",
      code: "",
      address: "",
      city: "",
      state: "",
      phone: "",
      email: "",
      active: true,
      representativeId: user?.role === "representative" ? user.id : undefined,
    });
    setEditingClient(null);
    setClientModalOpen(true);
  };

  const openEditClientModal = (client: Client) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      cnpj: client.cnpj,
      code: client.code,
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      phone: client.phone || "",
      email: client.email || "",
      representativeId: client.representativeId ?? undefined,
      regionId: client.regionId ?? undefined,
      active: client.active ?? undefined,
    });
    setClientModalOpen(true);
  };

  const onSubmit = (data: z.infer<typeof clientFormSchema>) => {
    if (editingClient) {
      updateClientMutation.mutate({ id: editingClient.id, data });
    } else {
      createClientMutation.mutate(data);
    }
  };

  const handleImport = (data: any[]) => {
    if (data.length > 0) {
      importClientsMutation.mutate(data);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Clientes</h1>
          <div className="flex gap-2">
            {user?.role === "admin" && (
              <>
                <Button onClick={() => setImportModalOpen(true)} variant="outline">
                  <Import className="mr-2 h-4 w-4" />
                  Importar
                </Button>
                <Button onClick={openNewClientModal}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo Cliente
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Clients Table */}
        {isLoadingClients ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <DataTable
            columns={[
              {
                header: "Código",
                accessorKey: "code",
                sortable: true,
              },
              {
                header: "Nome",
                accessorKey: "name",
                sortable: true,
                cell: (client) => (
                  <div className="flex items-center">
                    <UserCircle className="h-5 w-5 mr-2 text-gray-400" />
                    <span>{client.name}</span>
                  </div>
                ),
              },
              {
                header: "CNPJ",
                accessorKey: "cnpj",
                cell: (client) => formatCnpj(client.cnpj),
              },
              {
                header: "Cidade",
                accessorKey: "city",
              },
              {
                header: "Estado",
                accessorKey: "state",
              },
              {
                header: "Status",
                accessorKey: "active",
                cell: (client) => (
                  <Badge variant={client.active ? "success" : "secondary"}>
                    {client.active ? "Ativo" : "Inativo"}
                  </Badge>
                ),
              },
            ]}
            data={clients || []}
            keyField="id"
            searchable
            searchPlaceholder="Buscar clientes por nome, CNPJ ou código..."
            onRowClick={user?.role === "admin" ? openEditClientModal : undefined}
          />
        )}

        {/* Client Form Dialog */}
        <Dialog open={clientModalOpen} onOpenChange={setClientModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              <DialogDescription>
                {editingClient
                  ? "Edite as informações do cliente abaixo."
                  : "Preencha os detalhes para criar um novo cliente."}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do cliente" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="00.000.000/0000-00"
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              field.onChange(value);
                            }}
                            value={formatCnpj(field.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Código do cliente" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Status</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Endereço" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Cidade" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Estado" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Telefone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Email" type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {user?.role === "admin" && (
                    <>
                      <FormField
                        control={form.control}
                        name="regionId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Região</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma região" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {regions?.map((region: Region) => (
                                  <SelectItem key={region.id} value={region.id.toString()}>
                                    {region.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="representativeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Representante</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um representante" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {representatives?.map((rep) => (
                                  <SelectItem key={rep.id} value={rep.id.toString()}>
                                    {rep.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={
                      createClientMutation.isPending || updateClientMutation.isPending
                    }
                  >
                    {(createClientMutation.isPending || updateClientMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingClient ? "Atualizar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Import Modal */}
        <ImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImport={handleImport}
          title="Importar Clientes"
          description="Importe sua lista de clientes a partir de arquivo CSV ou Excel. O sistema reconhecerá os campos: Código do Cliente, Nome do Cliente, Cidade, CNPJ e WhatsApp. Você pode opcionalmente selecionar um representante para associar a todos os clientes importados."
          templateFields={["code", "name", "city", "cnpj", "phone"]}
          loading={importClientsMutation.isPending}
          showRepresentativeSelect={user?.role === "admin"}
          representatives={representatives?.map(rep => ({ id: rep.id, name: rep.name })) || []}
          regions={regions || []}
        />
      </div>
    </DashboardLayout>
  );
}
