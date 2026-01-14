import { useState } from "react";
import { appModel } from "../../domain/app";
import { Lock } from "lucide-react";

export const UnlockScreen = () => {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  const handleUnlock = async () => {
    try {
      await appModel.unlock(passcode);
    } catch (e) {
      setError("Invalid passcode");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Unlock Vault
        </h2>

        <input
          type="password"
          placeholder="Enter Passcode"
          className="w-full p-3 border rounded-lg mb-4"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
          autoFocus
        />

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}

        <button
          onClick={handleUnlock}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Unlock
        </button>
      </div>
    </div>
  );
};
