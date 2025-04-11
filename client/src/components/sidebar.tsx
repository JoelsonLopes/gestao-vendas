import { useState, useEffect } from "react";
import { MainNav } from "./main-nav";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [open, setOpen] = useState(true);
  const isMobile = useMobile();

  // Close sidebar on mobile by default
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [isMobile]);

  return (
    <>
      {/* Mobile overlay */}
      {open && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-40"
          onClick={() => setOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          "lg:flex lg:flex-shrink-0 transition-all duration-300 ease-in-out z-50",
          open ? "block fixed lg:relative left-0 h-full" : "hidden",
          className
        )}
      >
        <div className="w-64 border-r border-gray-700 dark:border-blue-900 bg-gray-900 dark:bg-black flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-blue-900 dark:border-purple-900 bg-gradient-to-r from-blue-900 to-black">
            <Logo />
            
            {/* Close button (mobile only) */}
            {isMobile && (
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-md inline-flex items-center justify-center text-blue-300 hover:text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 dark:text-purple-300 dark:hover:text-white dark:hover:bg-purple-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <MainNav />
          </div>
        </div>
      </div>
      
      {/* Mobile menu toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="lg:hidden fixed top-20 left-4 z-40 p-3 rounded-full bg-gradient-to-r from-blue-700 to-purple-700 text-white shadow-lg focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
    </>
  );
}
