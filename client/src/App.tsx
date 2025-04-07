import { Toaster } from "@/components/ui/toaster";
import { AppRoutes } from "./routes";
import { AuthProvider } from "./hooks/use-auth";
import { WebSocketNotificationProvider, NotificationListener } from "@/components/notification-toast";

function App() {
  return (
    <>
      <Toaster />
      <AuthProvider>
        <WebSocketNotificationProvider>
          <NotificationListener />
          <AppRoutes />
        </WebSocketNotificationProvider>
      </AuthProvider>
    </>
  );
}

export default App;
