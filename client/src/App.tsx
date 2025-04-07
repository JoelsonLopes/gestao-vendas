import { Toaster } from "@/components/ui/toaster";
import { AppRoutes } from "./routes";
import { AuthProvider } from "./hooks/use-auth";
import { NotificationListener } from "@/components/notification-toast";

function App() {
  return (
    <>
      <Toaster />
      <AuthProvider>
        <NotificationListener />
        <AppRoutes />
      </AuthProvider>
    </>
  );
}

export default App;
