import { X } from "lucide-react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export default function TermsModal({ isOpen, onClose, title, content }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col transform animate-in zoom-in duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
              {content}
            </pre>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
