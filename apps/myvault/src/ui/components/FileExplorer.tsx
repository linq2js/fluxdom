import { useEffect, useRef } from "react";
import { useSelector } from "fluxdom/react";
import { filesModel } from "../../domain/files";
import {
  Folder,
  File,
  Grid,
  List as ListIcon,
  Search,
  Plus,
  Upload,
} from "lucide-react";
import { clsx } from "clsx";
import type { FileEntry } from "../../types";

export const FileExplorer = () => {
  const { items, isLoading, viewMode } = useSelector(filesModel);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    filesModel.loadFiles(null); // Load root
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        filesModel.addFile(file);
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Toolbar */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">My Files</h2>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center text-gray-500 text-sm">
            <span>Home</span>
            <span className="mx-2">/</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>

          <button
            onClick={() => filesModel.toggleViewMode()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {viewMode === "grid" ? <ListIcon size={20} /> : <Grid size={20} />}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            <span>Add New</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-10 text-gray-500">
            Loading files...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Upload size={48} className="mb-4 opacity-50" />
            <p>No files yet. Upload something!</p>
          </div>
        ) : (
          <div
            className={clsx(
              viewMode === "grid"
                ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                : "flex flex-col gap-1"
            )}
          >
            {items?.map((item) => (
              <FileItem key={item.id} item={item} view={viewMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FileItem = ({
  item,
  view,
}: {
  item: FileEntry;
  view: "list" | "grid";
}) => {
  const Icon = item.isFolder ? Folder : File; // TODO: Better icons based on type

  if (view === "list") {
    return (
      <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg group cursor-pointer border border-transparent hover:border-gray-200">
        <Icon
          className={clsx(
            "w-5 h-5",
            item.isFolder ? "text-yellow-500" : "text-blue-500"
          )}
        />
        <span className="flex-1 text-sm text-gray-700 truncate">
          {item.name}
        </span>
        <span className="text-xs text-gray-400 w-24">
          {(item.size / 1024).toFixed(1)} KB
        </span>
        <span className="text-xs text-gray-400 w-32">
          {new Date(item.modified).toLocaleDateString()}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 hover:bg-blue-50 rounded-xl cursor-pointer group border border-transparent hover:border-blue-100 transition-all">
      <div
        className={clsx(
          "w-16 h-16 mb-3 flex items-center justify-center rounded-xl",
          item.isFolder
            ? "bg-yellow-100 text-yellow-500"
            : "bg-blue-100 text-blue-500"
        )}
      >
        <Icon size={32} />
      </div>
      <span className="text-sm text-gray-700 font-medium text-center truncate w-full px-2">
        {item.name}
      </span>
      <span className="text-xs text-gray-400 mt-1">
        {(item.size / 1024).toFixed(1)} KB
      </span>
    </div>
  );
};
