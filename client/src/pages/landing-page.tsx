import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { ChevronRight, Filter, Car, Shield, Award, Settings } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const [_, navigate] = useLocation();

  // Animação para entrar do lado esquerdo
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { x: -50, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Cabeçalho */}
      <header className="container mx-auto py-6 px-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Filter className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">JoelsonFiltros</h1>
        </div>
        <Button onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90">
          Entrar no Sistema
        </Button>
      </header>

      {/* Seção Principal Hero */}
      <section className="container mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center">
        <motion.div 
          className="md:w-1/2 space-y-6"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl font-bold tracking-tight">
            Gestão de Pedidos <span className="text-primary">Filtros Automotivos</span>
          </motion.h1>
          <motion.p variants={itemVariants} className="text-xl text-muted-foreground">
            Sistema completo para representantes e distribuidores de filtros automotivos.
            Gerencie clientes, pedidos e produtos em uma única plataforma.
          </motion.p>
          <motion.div variants={itemVariants}>
            <Button 
              onClick={() => navigate('/auth')} 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Acessar Plataforma 
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
        <div className="md:w-1/2 mt-12 md:mt-0 flex justify-center">
          <div className="relative w-full max-w-lg">
            {/* Círculos decorativos */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-secondary/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-accent/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            
            {/* Imagem de filtro automotivo estilizada */}
            <div className="relative bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
              <Filter className="h-24 w-24 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Filtros de Qualidade</h3>
              <p className="text-center text-muted-foreground">
                Representamos as melhores marcas do mercado para oferecer 
                qualidade e durabilidade para seus clientes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seção de Recursos/Benefícios */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Recursos Principais</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Card 1 */}
            <div className="bg-card rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-full w-fit mb-4">
                <Filter className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Catálogo Completo</h3>
              <p className="text-muted-foreground">
                Acesso a milhares de filtros de ar, óleo, combustível e cabine das principais marcas.
              </p>
            </div>
            
            {/* Card 2 */}
            <div className="bg-card rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-full w-fit mb-4">
                <Car className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Conversão de Referências</h3>
              <p className="text-muted-foreground">
                Sistema de conversão entre referências de diferentes marcas, facilitando a identificação de equivalentes.
              </p>
            </div>
            
            {/* Card 3 */}
            <div className="bg-card rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-full w-fit mb-4">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Gestão de Pedidos</h3>
              <p className="text-muted-foreground">
                Crie e acompanhe pedidos, aplique descontos personalizados e gerencie comissões.
              </p>
            </div>
            
            {/* Card 4 */}
            <div className="bg-card rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-full w-fit mb-4">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Relatórios Detalhados</h3>
              <p className="text-muted-foreground">
                Análise de vendas por marca, representante e região para otimizar seus resultados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seção "Por que escolher" */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 md:pr-12">
            <h2 className="text-3xl font-bold mb-6">Por que escolher nossa plataforma?</h2>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="mr-4 mt-1 bg-primary/10 p-1 rounded-full">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Catálogo Atualizado</h3>
                  <p className="text-muted-foreground">Nosso banco de dados é constantemente atualizado com os lançamentos do mercado de filtração automotiva.</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="mr-4 mt-1 bg-primary/10 p-1 rounded-full">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Conversão entre Marcas</h3>
                  <p className="text-muted-foreground">Sistema inteligente de conversão entre as principais marcas de filtros, facilitando substituições.</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="mr-4 mt-1 bg-primary/10 p-1 rounded-full">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Facilidade de Uso</h3>
                  <p className="text-muted-foreground">Interface intuitiva, projetada para agilizar o trabalho dos representantes em campo.</p>
                </div>
              </li>
            </ul>
            <Button 
              onClick={() => navigate('/auth')} 
              className="mt-8 bg-primary hover:bg-primary/90"
            >
              Começar Agora
            </Button>
          </div>
          <div className="md:w-1/2 mt-12 md:mt-0">
            <div className="rounded-lg overflow-hidden shadow-xl bg-gradient-to-br from-background to-muted p-6 border border-border">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background rounded-md p-4 shadow-inner">
                  <div className="flex justify-center mb-2">
                    <Filter className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="text-center font-medium">Filtros de Ar</h4>
                </div>
                <div className="bg-background rounded-md p-4 shadow-inner">
                  <div className="flex justify-center mb-2">
                    <Filter className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="text-center font-medium">Filtros de Óleo</h4>
                </div>
                <div className="bg-background rounded-md p-4 shadow-inner">
                  <div className="flex justify-center mb-2">
                    <Filter className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="text-center font-medium">Filtros de Combustível</h4>
                </div>
                <div className="bg-background rounded-md p-4 shadow-inner">
                  <div className="flex justify-center mb-2">
                    <Filter className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="text-center font-medium">Filtros de Cabine</h4>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="font-medium">Mais de 5.800 produtos cadastrados</p>
                <p className="text-sm text-muted-foreground">Para todas as marcas e modelos de veículos</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-primary/5 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para otimizar sua gestão de pedidos?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Acesse agora nossa plataforma e transforme a forma como você gerencia seus pedidos de filtros automotivos.
          </p>
          <Button 
            onClick={() => navigate('/auth')}
            size="lg"
            className="bg-primary hover:bg-primary/90"
          >
            Acessar Sistema
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="bg-muted py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Filter className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">JoelsonFiltros</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} JoelsonFiltros. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
      
      {/* Estilos adicionais para as animações */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}} />
    </div>
  );
}