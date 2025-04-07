import { useState } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DataTable } from "@/components/data-table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, PlusCircle, UserCircle, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function UsersPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [toggleStatusDialogOpen, setToggleStatusDialogOpen] = useState(false);

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

  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch regions for assigning representatives
  const { data: regions } = useQuery({
    queryKey: ["/api/regions"],
  });

  // User form validation schema
  const userFormSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
    role: z.enum(["admin", "representative"]),
    regionId: z.number().optional().nullable(),
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: z.infer<typeof userFormSchema>) => {
      const response = await apiRequest("POST", "/api/register", userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserModalOpen(false);
      toast({
        title: "Usuário criado",
        description: "Usuário foi criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao criar usuário: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof userFormSchema>> }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserModalOpen(false);
      setEditingUser(null);
      toast({
        title: "Usuário atualizado",
        description: "Usuário foi atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar usuário: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Toggle user status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/toggle-status`, {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setToggleStatusDialogOpen(false);
      setUserToToggle(null);
      toast({
        title: data.active ? "Usuário ativado" : "Usuário desativado",
        description: `O usuário ${data.name} foi ${data.active ? "ativado" : "desativado"} com sucesso`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao alterar status do usuário: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "representative",
      regionId: null,
    },
  });

  const openNewUserModal = () => {
    form.reset({
      name: "",
      email: "",
      password: "",
      role: "representative",
      regionId: null,
    });
    setEditingUser(null);
    setUserModalOpen(true);
  };

  const openEditUserModal = (user: User) => {
    setEditingUser(user);
    form.reset({
      name: user.name,
      email: user.email,
      // Password field is empty when editing since we don't want to change it unless explicitly needed
      password: "",
      role: user.role as "admin" | "representative",
      regionId: user.regionId || null,
    });
    setUserModalOpen(true);
  };

  const onSubmit = (data: z.infer<typeof userFormSchema>) => {
    if (editingUser) {
      // If password is empty, remove it from the update data
      if (!data.password) {
        const { password, ...restData } = data;
        updateUserMutation.mutate({ id: editingUser.id, data: restData });
      } else {
        updateUserMutation.mutate({ id: editingUser.id, data });
      }
    } else {
      createUserMutation.mutate(data);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Usuários</h1>
          <Button onClick={openNewUserModal}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Users Table */}
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
                cell: (user) => (
                  <div className="flex items-center">
                    <UserCircle className="h-5 w-5 mr-2 text-gray-400" />
                    <span>{user.name}</span>
                  </div>
                ),
              },
              {
                header: "Email",
                accessorKey: "email",
                sortable: true,
              },
              {
                header: "Tipo",
                accessorKey: "role",
                cell: (user) => (
                  <Badge variant={user.role === "admin" ? "default" : "outline"}>
                    {user.role === "admin" ? "Administrador" : "Representante"}
                  </Badge>
                ),
              },
              {
                header: "Região",
                accessorKey: "regionId",
                cell: (user) => {
                  const region = regions?.find((r) => r.id === user.regionId);
                  return user.regionId && region ? region.name : "-";
                },
              },
              {
                header: "Status",
                accessorKey: "active",
                cell: (user) => (
                  <Badge variant={user.active !== false ? "success" : "destructive"}>
                    {user.active !== false ? "Ativo" : "Inativo"}
                  </Badge>
                ),
              },
              {
                header: "Criado em",
                accessorKey: "createdAt",
                cell: (user) => new Date(user.createdAt).toLocaleDateString(),
              },
              {
                header: "Ações",
                accessorKey: "id",
                cell: (user) => (
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={(e) => {
                      e.stopPropagation(); // Evita que o evento de clique abra o modal de edição
                      setUserToToggle(user);
                      setToggleStatusDialogOpen(true);
                    }}
                  >
                    <Power className={`h-4 w-4 ${user.active !== false ? "text-red-500" : "text-green-500"}`} />
                  </Button>
                ),
              },
            ]}
            data={users || []}
            keyField="id"
            searchable
            searchPlaceholder="Buscar usuários por nome ou email..."
            onRowClick={openEditUserModal}
          />
        )}

        {/* User Form Dialog */}
        <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Edite as informações do usuário abaixo."
                  : "Preencha os detalhes para criar um novo usuário."}
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
                        <Input {...field} placeholder="Nome completo" />
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
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="email@exemplo.com" type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{editingUser ? "Nova Senha (opcional)" : "Senha *"}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="******" type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Usuário *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="representative">Representante</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("role") === "representative" && (
                  <FormField
                    control={form.control}
                    name="regionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Região</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                          defaultValue={field.value?.toString() || ""}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a região" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma região</SelectItem>
                            {regions?.map((region) => (
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
                )}

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  >
                    {(createUserMutation.isPending || updateUserMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingUser ? "Atualizar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmação de ativação/desativação */}
        <AlertDialog open={toggleStatusDialogOpen} onOpenChange={setToggleStatusDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {userToToggle?.active !== false 
                  ? `Desativar usuário ${userToToggle?.name}?` 
                  : `Ativar usuário ${userToToggle?.name}?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {userToToggle?.active !== false
                  ? "Um usuário desativado não poderá fazer login no sistema até ser reativado."
                  : "Ao ativar este usuário, ele poderá fazer login novamente no sistema."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (userToToggle) {
                    toggleStatusMutation.mutate(userToToggle.id);
                  }
                }}
                disabled={toggleStatusMutation.isPending}
                className={userToToggle?.active !== false ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
              >
                {toggleStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {userToToggle?.active !== false ? "Desativar" : "Ativar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
