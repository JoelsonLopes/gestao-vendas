import { Toaster } from "@/components/ui/toaster";
import { AppRoutes } from "./routes";
import { AuthProvider } from "./hooks/use-auth";
import { WebSocketNotificationProvider, NotificationListener } from "@/components/notification-toast";
import { PerformanceProvider } from "@/components/performance-provider";
import Footer from "./components/footer";

function App() {
  return (
    <div className="min-h-screen">
      <Toaster />
      <PerformanceProvider>
        <AuthProvider>
          <WebSocketNotificationProvider>
            <NotificationListener />
            <div className="pb-20"> {/* espaço pra não cobrir o conteúdo */}
              <AppRoutes />
            </div>
            <Footer />
          </WebSocketNotificationProvider>
        </AuthProvider>
      </PerformanceProvider>
    </div>
  );
}

export default App;
