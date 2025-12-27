import { X, Disc3, Sparkles } from "lucide-react";

interface CampaignTypeSelectorProps {
  onClose: () => void;
  onSelectType: (type: "spinwheel" | "scratch") => void;
}

export default function CampaignTypeSelector({ onClose, onSelectType }: CampaignTypeSelectorProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Choose Campaign Type</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Spin the Wheel */}
          <button
            onClick={() => onSelectType("spinwheel")}
            className="group relative p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-lg transition-all duration-200 text-left"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Disc3 className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Spin the Wheel</h3>
                <p className="text-sm text-gray-600">
                  Create an interactive spinning wheel campaign with multiple prize segments
                </p>
              </div>
              <div className="w-full pt-4 border-t border-gray-100">
                <span className="text-sm font-medium text-indigo-600 group-hover:underline">
                  Continue →
                </span>
              </div>
            </div>
          </button>

          {/* Scratch & Win */}
          <button
            onClick={() => onSelectType("scratch")}
            className="group relative p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all duration-200 text-left"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Scratch & Win</h3>
                <p className="text-sm text-gray-600">
                  Create a scratch card campaign with surprise prizes revealed by scratching
                </p>
              </div>
              <div className="w-full pt-4 border-t border-gray-100">
                <span className="text-sm font-medium text-purple-600 group-hover:underline">
                  Continue →
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
