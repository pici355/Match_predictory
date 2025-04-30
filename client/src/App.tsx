import { useState, useEffect } from "react";
import { Switch, Route, useLocation, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import AdminPage from "@/pages/AdminPage";
import LoginPage from "@/pages/LoginPage";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Auth context and types
type User = {
  id: number;
  username: string;
  isAdmin: boolean;
};

// Check if user is authenticated
function useAuth() {
  const { data: user } = useQuery<User | null>({
    queryKey: ['/api/me'],
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  return {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin || false,
  };
}

// Protected route for admin only
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const [isMatch] = useRoute("/admin");

  useEffect(() => {
    if (isMatch) {
      if (!isAuthenticated) {
        navigate("/login");
      } else if (!isAdmin) {
        navigate("/");
      }
    }
  }, [isMatch, isAuthenticated, isAdmin, navigate]);

  return isAuthenticated && isAdmin ? <Component /> : null;
}

function Navigation() {
  const [location, navigate] = useLocation();
  const { isAuthenticated, isAdmin, user } = useAuth();
  const { toast } = useToast();
  
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      toast({
        title: "Logout successful",
        description: "You have been logged out.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <nav className="bg-primary text-white py-2 px-4">
      <div className="max-w-7xl mx-auto flex justify-between">
        <div className="flex space-x-4">
          <button 
            onClick={() => navigate("/")} 
            className={`font-medium hover:underline ${location === "/" ? "underline" : ""}`}
          >
            Home
          </button>
          {isAdmin && (
            <button 
              onClick={() => navigate("/admin")} 
              className={`font-medium hover:underline ${location === "/admin" ? "underline" : ""}`}
            >
              Admin
            </button>
          )}
        </div>
        
        <div>
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm">{user?.username}</span>
              <Button size="sm" variant="secondary" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => navigate("/login")}>
              Login
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/admin">
          {(params) => <AdminRoute component={AdminPage} />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
