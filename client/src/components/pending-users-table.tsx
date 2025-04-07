import { useState } from "react";
import { X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";

// Tipo de usuário pendente
interface PendingUser {
  id: number;
  name: string;
  email: string;
  role: 'representative' | 'admin';
  approved: boolean;
  createdAt: string;
}

export function PendingUsersTable() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  
  // Buscar usuários pendentes
  const { data: pendingUsers, isLoading, error } = useQuery<PendingUser[]>({
    queryKey: ['/api/pending-users'],
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });
  
  // Mutação para aprovar um usuário
  const approveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/users/${userId}/approve`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuário aprovado",
        description: "O usuário agora pode acessar o sistema",
      });
      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['/api/pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      // Enviar notificação sobre a aprovação do usuário
      apiRequest("POST", `/api/notify-user-approval`, {
        userId: selectedUser?.id,
        userName: selectedUser?.name
      }).catch(err => {
        console.error("Erro ao enviar notificação:", err);
      });
      
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao aprovar usuário",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    }
  });
  
  // Mutação para excluir um usuário
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao excluir usuário");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuário excluído",
        description: "O usuário foi removido do sistema",
      });
      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['/api/pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    }
  });
  
  // Se estiver carregando, mostra spinner
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );
  }
  
  // Se houver erro, mostra mensagem
  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Erro ao carregar usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{(error as Error).message || "Verifique sua conexão e tente novamente"}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/pending-users'] })}>
            Tentar novamente
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Se não houver usuários pendentes
  if (!pendingUsers || pendingUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aprovações Pendentes</CardTitle>
          <CardDescription>Não há novos usuários aguardando aprovação</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Renderiza a tabela de usuários pendentes
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aprovações Pendentes</CardTitle>
        <CardDescription>Usuários aguardando sua aprovação para acessar o sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Data de Registro</th>
                <th className="px-4 py-2 text-left">Função</th>
                <th className="px-4 py-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-2">{user.name}</td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                      {user.role === 'admin' ? 'Administrador' : 'Representante'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setSelectedUser(user);
                          approveMutation.mutate(user.id);
                        }}
                        disabled={approveMutation.isPending && selectedUser?.id === user.id}
                      >
                        {approveMutation.isPending && selectedUser?.id === user.id ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        <span className="ml-1 sm:inline hidden">Aprovar</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedUser(user);
                          deleteMutation.mutate(user.id);
                        }}
                        disabled={deleteMutation.isPending && selectedUser?.id === user.id}
                      >
                        {deleteMutation.isPending && selectedUser?.id === user.id ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        <span className="ml-1 sm:inline hidden">Recusar</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}