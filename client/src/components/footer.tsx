export default function Footer() {
    return (
      <footer className="fixed bottom-0 w-full  bg-gray-900 text-gray-300 py-4 z-50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center md:flex-row md:justify-between gap-2 text-center md:text-left">
          <p className="text-sm">
            © 2025 <span className="font-semibold text-purple-400">Gestão de Vendas</span>. Todos os direitos reservados.
          </p>
          <p className="text-sm">
            Desenvolvido por <span className="text-blue-400 font-semibold">Joelson Lopes</span> · Full Stack Developer
          </p>
        </div>
      </footer>
    );
  }
  