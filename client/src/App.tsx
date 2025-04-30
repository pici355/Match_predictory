import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import AdminPage from "@/pages/AdminPage";

function Navigation() {
  const [location, navigate] = useLocation();
  
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
          <button 
            onClick={() => navigate("/admin")} 
            className={`font-medium hover:underline ${location === "/admin" ? "underline" : ""}`}
          >
            Admin
          </button>
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
        <Route path="/admin" component={AdminPage} />
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
