import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="relative flex w-full max-w-xs sm:max-w-sm animate-pulse gap-2 p-4 mx-auto">
      <div className="h-12 w-12 rounded-full bg-emerald-200" />
      <div className="flex-1">
        <div className="mb-1 h-5 w-3/5 rounded-lg bg-emerald-200 text-lg" />
        <div className="h-5 w-[90%] rounded-lg bg-emerald-200 text-sm" />
      </div>
      <div className="absolute bottom-5 right-0 h-4 w-4 rounded-full bg-emerald-200" />
    </div>
  );
};

export default Loader;