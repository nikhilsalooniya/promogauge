import { X } from "lucide-react";

interface PublishConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: "publish" | "unpublish";
}

export default function PublishConfirmationModal({ isOpen, onClose, onConfirm, type }: PublishConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full transform animate-in zoom-in duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">
            {type === "publish" ? "Publish Campaign?" : "Unpublish Campaign?"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600">
            {type === "publish" 
              ? "Once published, your campaign can go live based on the scheduled dates. You can still pause or unpublish it later."
              : "This will immediately stop public access to your campaign. You can publish it again later."
            }
          </p>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              type === "publish"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/50"
                : "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg"
            }`}
          >
            {type === "publish" ? "Publish Campaign" : "Unpublish Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
