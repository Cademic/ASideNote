import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import { TutorialProvider } from "./context/TutorialContext";
import { AppRouter } from "./router";
import { useAuth } from "./context/AuthContext";

function AppWithPreferences() {
  const { isAuthenticated } = useAuth();
  return (
    <PreferencesProvider isAuthenticated={isAuthenticated}>
      <TutorialProvider>
        <AppRouter />
      </TutorialProvider>
    </PreferencesProvider>
  );
}

export function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppWithPreferences />
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}
