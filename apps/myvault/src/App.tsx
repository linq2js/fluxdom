import { useEffect } from "react";
import { useSelector } from "fluxdom/react";
import { appModel } from "./domain/app";
import { UnlockScreen } from "./ui/views/UnlockScreen";
import { MainLayout } from "./ui/layout/MainLayout";
import { SetupScreen } from "./ui/views/SetupScreen";

function App() {
  const { isUnlocked, securityLevel, isLoading } = useSelector(appModel);

  useEffect(() => {
    appModel.init();

    const handler = (e: any) => {
      e.preventDefault();
      appModel.setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        Loading...
      </div>
    );
  }

  // If no security level is set, go to setup
  if (securityLevel === null) {
    return <SetupScreen />;
  }

  // If locked, show unlock screen
  if (!isUnlocked) {
    return <UnlockScreen />;
  }

  return <MainLayout />;
}

export default App;
