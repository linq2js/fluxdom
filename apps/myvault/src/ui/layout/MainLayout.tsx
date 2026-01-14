import { Sidebar } from "../components/Sidebar";
import { FileExplorer } from "../components/FileExplorer";

export const MainLayout = () => {
  return (
    <div className="h-screen w-screen flex bg-white dark:bg-gray-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <FileExplorer />
      </div>
    </div>
  );
};
