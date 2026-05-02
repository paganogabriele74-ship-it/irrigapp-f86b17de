import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import DaysView from "./pages/DaysView";
import ProgramsList from "./pages/ProgramsList";
import ProgramForm from "./pages/ProgramForm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/giorni" element={<ProtectedRoute><DaysView /></ProtectedRoute>} />
            <Route path="/giorni/:day" element={<ProtectedRoute><DaysView /></ProtectedRoute>} />
            <Route path="/programmi" element={<ProtectedRoute><ProgramsList /></ProtectedRoute>} />
            <Route path="/programmi/nuovo" element={<ProtectedRoute><ProgramForm /></ProtectedRoute>} />
            <Route path="/programmi/:id" element={<ProtectedRoute><ProgramForm /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
