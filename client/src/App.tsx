import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Home from "@/pages/Home";
import Signer from "@/pages/Signer";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/signer" component={Signer} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
