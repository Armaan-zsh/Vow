'use client';

interface ShareModalProps {
  url: string;
  onClose: () => void;
}

export function ShareModal({ url, onClose }: ShareModalProps) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    alert('URL copied to clipboard!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md p-6">
        <h2 className="text-xl font-black font-mono mb-4">SHARE PROFILE</h2>
        <p className="mb-4 font-mono text-sm">{url}</p>
        <div className="flex gap-4">
          <button
            onClick={handleCopy}
            className="flex-1 p-3 border-2 border-black bg-[#FFD23F] hover:bg-[#FFD23F]/80 font-black font-mono"
          >
            COPY URL
          </button>
          <button
            onClick={onClose}
            className="flex-1 p-3 border-2 border-black bg-white hover:bg-gray-100 font-black font-mono"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
