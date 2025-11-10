import React from 'react';
import { LogOut } from 'lucide-react';

const LogoutOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-auto p-6 rounded-xl bg-white/90 shadow-xl border border-gray-100">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <LogOut className="h-8 w-8 text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Cerrando sesión</h2>
          <p className="mt-2 text-sm text-gray-600">Hasta pronto, gracias por usar InnovaTube.</p>
          <div className="mt-6 w-full">
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-blue-600 animate-[progress_1.2s_ease-in-out_infinite] rounded-full" />
            </div>
          </div>
        </div>

        {/* Simple CSS keyframes for progress shimmer */}
        <style>
          {`
            @keyframes progress {
              0% { transform: translateX(-50%); }
              50% { transform: translateX(50%); }
              100% { transform: translateX(-50%); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default LogoutOverlay;