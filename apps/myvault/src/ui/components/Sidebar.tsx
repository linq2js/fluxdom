import { HardDrive, Clock, Star, Trash, Cloud, Download } from "lucide-react";
import { clsx } from "clsx";
import { useSelector } from "fluxdom/react";
import { appModel } from "../../domain/app";

export const Sidebar = () => {
  const { vaultMetadata, installPrompt } = useSelector(appModel);

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col hidden md:flex">
      <div className="p-4 flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <span className="font-bold text-xl text-gray-800">Stash</span>
      </div>

      <nav className="flex-1 px-2 space-y-1">
        <NavItem icon={<HardDrive size={20} />} label="My Files" active />
        <NavItem icon={<Clock size={20} />} label="Recent" />
        <NavItem icon={<Star size={20} />} label="Starred" />
        <NavItem icon={<Trash size={20} />} label="Trash" />
      </nav>

      <div className="p-4 border-t border-gray-200">
        {installPrompt && (
          <button
            onClick={() => appModel.installPwa()}
            className="w-full flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg mb-4 hover:bg-blue-200 transition"
          >
            <Download size={16} />
            <span className="text-sm font-medium">Install App</span>
          </button>
        )}

        <div className="flex items-center gap-2 text-gray-600 mb-2">
          <Cloud size={16} />
          <span className="text-sm font-medium">Storage</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div className="bg-blue-600 h-2 rounded-full w-[25%]" />
        </div>
        <p className="text-xs text-gray-500">2.5 GB used of 10 GB</p>
        {vaultMetadata && (
          <p className="text-xs text-gray-400 mt-1">
            Sec: {vaultMetadata.securityLevel}
          </p>
        )}
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active }: any) => (
  <div
    className={clsx(
      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
      active ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
    )}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </div>
);
