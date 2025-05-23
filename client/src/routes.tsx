import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ClientsPage from "@/pages/clients-page";
import ProductsPage from "@/pages/products-page";
import OrdersPage from "@/pages/orders-page";
import OrderFormPage from "@/pages/order-form-page";
import ReportsPage from "@/pages/reports-page";
import UsersPage from "@/pages/users-page";

import SettingsPage from "@/pages/settings-page";
import AccessibilityPage from "@/pages/accessibility-page";
import { ProtectedRoute } from "./lib/protected-route";
import { useAuth } from "./hooks/use-auth";

export function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/clients" component={ClientsPage} />
      <ProtectedRoute path="/products" component={ProductsPage} />
      <ProtectedRoute path="/orders" component={OrdersPage} />
      <ProtectedRoute path="/orders/new" component={OrderFormPage} />
      <ProtectedRoute path="/orders/:id" component={OrderFormPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/users" component={UsersPage} />

      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/accessibility" component={AccessibilityPage} />
      <Route path="*">{() => <NotFound />}</Route>
    </Switch>
  );
}