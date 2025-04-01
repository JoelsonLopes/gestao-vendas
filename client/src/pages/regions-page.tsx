import { useState } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DataTable } from "@/components/data-table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, PlusCircle, MapPin, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Region } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function RegionsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [regionToDelete, setRegionToDelete] = useState<Region | null>(null);

  // Ensure admin access only
  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Acesso restrito
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Apenas administradores podem acessar esta página.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Fetch regions
  const { data: regions, isLoading } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  // Representatives for each region
  const { data: representatives } = useQuery({
    queryKey: ["/api/representatives"],
  });

  // Region form validation schema
  const regionFormSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  });

  // Create region mutation
  const createRegionMutation = useMutation({
    mutationFn: async (regionData: z.infer<typeof regionFormSchema>) => {
      const response = await apiRequest("POST", "/api/regions", regionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
      setRegionModalOpen(false);
      toast({
        title: "Região criada",
        description: "Região foi criada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao criar região: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update region mutation
  const updateRegionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof regionFormSchema> }) => {
      const response = await apiRequest("PUT", `/api/regions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
      setRegionModalOpen(false);
      setEditingRegion(null);
      toast({
        title: "Região atualizada",
        description: "Região foi atualizada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar região: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete region mutation
  const deleteRegionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/regions/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
      setDeleteDialogOpen(false);
      setRegionToDelete(null);
      toast({
        title: "Região removida",
        description: "Região foi removida com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao remover região: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<z.infer<typeof regionFormSchema>>({
    resolver: zodResolver(regionFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const openNewRegionModal = () => {
    form.reset({
      name: "",
    });
    setEditingRegion(null);
    setRegionModalOpen(true);
  };

  const openEditRegionModal = (region: Region) => {
    setEditingRegion(region);
    form.reset({
      name: region.name,
    });
    setRegionModalOpen(true);
  };

  const confirmDelete = (region: Region) => {
    setRegionToDelete(region);
    setDeleteDialogOpen(true);
  };

  const onSubmit = (data: z.infer<typeof regionFormSchema>) => {
    if (editingRegion) {
      updateRegionMutation.mutate({ id: editingRegion.id, data });
    } else {
      createRegionMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (regionToDelete) {
      deleteRegionMutation.mutate(regionToDelete.id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Regiões</h1>
          <Button onClick={openNewRegionModal}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Região
          </Button>
        </div>

        {/* Regions Table */}
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <DataTable
            columns={[
              {
                header: "Nome",
                accessorKey: "name",
                sortable: true,
                cell: (region) => (
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                    <span>{region.name}</span>
                  </div>
                ),
              },
              {
                header: "Representantes",
                accessorKey: "id",
                cell: (region) => {
                  const repsInRegion = representatives?.filter((rep) => rep.regionId === region.id) || [];
                  return repsInRegion.length > 0 
                    ? repsInRegion.map(rep => rep.name).join(", ") 
                    : "Nenhum representante";
                },
              },
              {
                header: "Criada em",
                accessorKey: "createdAt",
                cell: (region) => new Date(region.createdAt).toLocaleDateString(),
              },
              {
                header: "Ações",
                accessorKey: "actions",
                cell: (region) => (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(region);
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-100"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                ),
              },
            ]}
            data={regions || []}
            keyField="id"
            searchable
            searchPlaceholder="Buscar regiões por nome..."
            onRowClick={openEditRegionModal}
          />
        )}

        {/* Region Form Dialog */}
        <Dialog open={regionModalOpen} onOpenChange={setRegionModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingRegion ? "Editar Região" : "Nova Região"}</DialogTitle>
              <DialogDescription>
                {editingRegion
                  ? "Edite as informações da região abaixo."
                  : "Preencha os detalhes para criar uma nova região."}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome da região" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createRegionMutation.isPending || updateRegionMutation.isPending}
                  >
                    {(createRegionMutation.isPending || updateRegionMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingRegion ? "Atualizar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente a região 
                {regionToDelete && <span className="font-semibold"> {regionToDelete.name}</span>}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-500 hover:bg-red-600"
                onClick={handleDelete}
                disabled={deleteRegionMutation.isPending}
              >
                {deleteRegionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
