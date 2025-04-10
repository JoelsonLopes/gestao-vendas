import { Toaster } from "@/components/ui/toaster";
import { AppRoutes } from "./routes";
import { AuthProvider } from "./hooks/use-auth";
import { WebSocketNotificationProvider, NotificationListener } from "@/components/notification-toast";
import { PerformanceProvider } from "@/components/performance-provider";

function App() {
  return (
    <>
      <Toaster />
      <PerformanceProvider>
        <AuthProvider>
          <WebSocketNotificationProvider>
            <NotificationListener />
            <AppRoutes />
          </WebSocketNotificationProvider>
        </AuthProvider>
      </PerformanceProvider>
    </>
  );
}

export default App;
