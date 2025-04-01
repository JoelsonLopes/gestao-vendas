import { Toaster } from "@/components/ui/toaster";
import { AppRoutes } from "./routes";
import { AuthProvider } from "./hooks/use-auth";

function App() {
  return (
    <>
      <Toaster />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </>
  );
}

export default App;
