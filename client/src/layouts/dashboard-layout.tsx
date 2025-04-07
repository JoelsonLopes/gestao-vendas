import { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/notification-toast";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Home } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [_, navigate] = useLocation();
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="bg-gray-900 dark:bg-black border-b border-blue-900 shadow z-10 relative">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left section - only visible on mobile */}
            <div className="flex px-2 lg:px-0 lg:hidden">
              <div className="flex-shrink-0 flex items-center">
                <Logo />
              </div>
            </div>
            
            {/* Home Button + Search */}
            <div className="flex-1 flex items-center justify-center px-2 lg:ml-6 lg:justify-end">
              {/* Home Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="mr-4 text-blue-400 hover:text-blue-300"
                onClick={() => navigate('/')}
                title="Voltar para página inicial"
              >
                <Home className="h-5 w-5" />
              </Button>
              
              <div className="max-w-lg w-full">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    className="block w-full pl-10 pr-3 py-2 border border-blue-900 rounded-md leading-5 bg-gray-800 dark:bg-gray-900 dark:border-blue-700 dark:text-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-1 focus:ring-purple-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Buscar clientes, produtos ou pedidos"
                    type="search"
                  />
                </div>
              </div>
            </div>
            
            {/* Right section */}
            <div className="hidden lg:ml-4 lg:flex lg:items-center">
              {/* Dark mode toggle */}
              <ThemeToggle />
              
              {/* Notification button */}
              <div className="ml-4 relative">
                <NotificationBell />
              </div>
              
              {/* User menu */}
              <div className="ml-4 relative flex-shrink-0">
                <UserNav />
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content Area */}
      <div className="flex-grow flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-gray-100 dark:bg-gray-900 bg-gradient-to-br from-gray-100 to-blue-50 dark:from-gray-900 dark:to-gray-800">
          {children}
        </div>
      </div>
    </div>
  );
}
