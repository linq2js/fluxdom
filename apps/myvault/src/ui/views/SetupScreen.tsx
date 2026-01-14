import { useState } from "react";
import { appModel } from "../../domain/app";
import { Shield, Lock, FileKey } from "lucide-react";
import { clsx } from "clsx";
import type { SecurityLevel } from "../../types";

export const SetupScreen = () => {
  const [selected, setSelected] = useState<SecurityLevel>("passcode");
  const [passcode, setPasscode] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSetup = () => {
    if (selected !== "basic") {
      if (passcode.length < 6)
        return alert("Passcode must be at least 6 characters");
      if (passcode !== confirm) return alert("Passcodes do not match");
    }
    appModel.setupVault(selected, passcode);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to MyVault
        </h1>
        <p className="text-gray-500 mb-8">
          Choose your security level to get started.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <SecurityOption
            title="Basic"
            desc="No passcode. Files unencrypted."
            icon={<Shield className="w-8 h-8" />}
            active={selected === "basic"}
            onClick={() => setSelected("basic")}
          />
          <SecurityOption
            title="Secure UI"
            desc="Passcode required. Files unencrypted. (Recommended)"
            icon={<Lock className="w-8 h-8" />}
            active={selected === "passcode"}
            onClick={() => setSelected("passcode")}
          />
          <SecurityOption
            title="Encrypted"
            desc="Passcode + AES Encryption. High Security."
            icon={<FileKey className="w-8 h-8" />}
            active={selected === "encrypted"}
            onClick={() => setSelected("encrypted")}
          />
        </div>

        {selected !== "basic" && (
          <div className="space-y-4 mb-8">
            <input
              type="password"
              placeholder="Create Passcode"
              className="w-full p-3 border rounded-lg"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm Passcode"
              className="w-full p-3 border rounded-lg"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        )}

        <button
          onClick={handleSetup}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Initialize Vault
        </button>
      </div>
    </div>
  );
};

const SecurityOption = ({ title, desc, icon, active, onClick }: any) => (
  <div
    onClick={onClick}
    className={clsx(
      "cursor-pointer p-6 rounded-lg border-2 transition-all",
      active
        ? "border-blue-600 bg-blue-50"
        : "border-gray-200 hover:border-blue-200"
    )}
  >
    <div className={clsx("mb-4", active ? "text-blue-600" : "text-gray-400")}>
      {icon}
    </div>
    <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
    <p className="text-sm text-gray-500">{desc}</p>
  </div>
);
