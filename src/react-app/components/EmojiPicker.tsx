import { useState, useRef, useEffect } from "react";
import { X, Smile, Gift, Hash, Sparkles, Clock } from "lucide-react";

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string) => void;
  placeholder?: string;
}

// Lightweight curated emoji set
const EMOJI_CATEGORIES = {
  "Recently Used": [] as string[], // Will be populated from localStorage
  "Smileys": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔"],
  "Objects & Gifts": ["🎁", "🎀", "🎊", "🎉", "🎈", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "👑", "💎", "💍", "🎯", "🎲", "🎰", "🎮", "🕹️", "🎪", "🎨", "🎭", "🎬", "🎤", "🎧", "🎸", "🎹", "🎺", "🎻", "🥁"],
  "Symbols": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "⭐", "🌟", "✨", "💫", "⚡", "🔥", "💥", "💯", "✅", "❌", "⚠️", "💢"],
  "Misc": ["💰", "💵", "💴", "💶", "💷", "💳", "💸", "🪙", "💲", "🛍️", "🛒", "🍕", "🍔", "🍟", "🌭", "🍿", "🧋", "☕", "🍰", "🎂", "🍪", "🍩", "🧁", "🍦", "⚽", "🏀", "🎾", "🏐", "🏈", "⚾"],
};

const CATEGORY_ICONS = {
  "Recently Used": Clock,
  "Smileys": Smile,
  "Objects & Gifts": Gift,
  "Symbols": Hash,
  "Misc": Sparkles,
};

const RECENT_EMOJIS_KEY = "promoguage_recent_emojis";
const MAX_RECENT_EMOJIS = 24;

export default function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Smileys");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [pasteInput, setPasteInput] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pasteInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 480); // Smaller breakpoint for bottom sheet
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load recent emojis from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentEmojis(Array.isArray(parsed) ? parsed : []);
      } catch {
        setRecentEmojis([]);
      }
    }
  }, []);

  // Update categories with recent emojis
  const categoriesWithRecent = {
    ...EMOJI_CATEGORIES,
    "Recently Used": recentEmojis,
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (isOpen && pickerRef.current) {
      const focusableElements = pickerRef.current.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key === "Tab") {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener("keydown", handleTab);
      return () => document.removeEventListener("keydown", handleTab);
    }
  }, [isOpen]);

  const addToRecent = (emoji: string) => {
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, MAX_RECENT_EMOJIS);
    setRecentEmojis(updated);
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated));
  };

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji);
    addToRecent(emoji);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const handlePasteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setPasteInput(input);

    // Extract first emoji from pasted content
    const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\u200D]+/gu;
    const match = input.match(emojiRegex);
    
    if (match && match[0]) {
      // Get first emoji character (handle multi-codepoint emojis)
      const firstEmoji = [...match[0]][0];
      handleEmojiSelect(firstEmoji);
      setPasteInput("");
    }
  };

  const handlePasteInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    
    // Extract first emoji
    const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\u200D]+/gu;
    const match = pastedText.match(emojiRegex);
    
    if (match && match[0]) {
      const firstEmoji = [...match[0]][0];
      handleEmojiSelect(firstEmoji);
      setPasteInput("");
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 sm:w-16 px-2 sm:px-3 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center flex-shrink-0 hover:bg-gray-50 transition-colors relative group"
        aria-label={value ? `Selected emoji: ${value}` : "Select emoji"}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {value ? (
          <>
            <span className="text-xl sm:text-2xl" role="img" aria-label={value}>{value}</span>
            <button
              onClick={handleClear}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Clear emoji"
              aria-label="Clear emoji"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mx-auto" />
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          {isMobile && (
            <div 
              className="fixed inset-0 bg-black/50 z-[9998]"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Emoji Picker */}
          <div
            ref={pickerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Emoji picker"
            className={`
              bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden
              ${isMobile 
                ? "fixed bottom-0 left-0 right-0 z-[9999] max-h-[75vh] rounded-b-none" 
                : "absolute top-full left-0 mt-2 z-50 w-[280px] xs:w-[320px] sm:w-96 max-w-[min(95vw,400px)]"
              }
            `}
            style={!isMobile ? {
              maxHeight: "calc(100vh - 120px)",
            } : undefined}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Select Emoji</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Close emoji picker"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </button>
            </div>

            {/* Paste Input */}
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-indigo-50 border-b border-indigo-100">
              <label htmlFor="emoji-paste" className="block text-xs font-medium text-indigo-900 mb-1.5">
                Paste emoji here
              </label>
              <input
                ref={pasteInputRef}
                id="emoji-paste"
                type="text"
                value={pasteInput}
                onChange={handlePasteInputChange}
                onPaste={handlePasteInputPaste}
                placeholder="Paste from keyboard..."
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                aria-label="Paste emoji input"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {Object.keys(categoriesWithRecent).map((category) => {
                const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
                const hasEmojis = categoriesWithRecent[category as keyof typeof categoriesWithRecent].length > 0;
                
                // Skip Recently Used if empty
                if (category === "Recently Used" && !hasEmojis) return null;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`px-2 xs:px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 flex items-center justify-center space-x-1 xs:space-x-1.5 ${
                      activeCategory === category
                        ? "text-indigo-600 border-b-2 border-indigo-600 bg-white"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                    aria-label={`${category} category`}
                    aria-current={activeCategory === category ? "true" : "false"}
                  >
                    {Icon && <Icon className="w-3 xs:w-3.5 h-3 xs:h-3.5" />}
                    <span className="hidden xs:inline text-[10px] xs:text-xs">{category}</span>
                  </button>
                );
              })}
            </div>

            {/* Emoji Grid */}
            <div className="p-3 sm:p-4 overflow-y-auto" style={{ maxHeight: isMobile ? "45vh" : "300px" }}>
              {categoriesWithRecent[activeCategory as keyof typeof categoriesWithRecent].length > 0 ? (
                <div className="grid grid-cols-7 xs:grid-cols-8 sm:grid-cols-9 gap-1 sm:gap-1.5">
                  {categoriesWithRecent[activeCategory as keyof typeof categoriesWithRecent].map((emoji, index) => (
                    <button
                      key={`${emoji}-${index}`}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xl sm:text-2xl hover:bg-indigo-50 active:bg-indigo-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      title={emoji}
                      aria-label={`Select emoji ${emoji}`}
                    >
                      <span role="img" aria-label={emoji}>{emoji}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No emojis in this category yet
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 flex items-center justify-between">
              <p className="text-[10px] xs:text-xs text-gray-500">
                {categoriesWithRecent[activeCategory as keyof typeof categoriesWithRecent].length} emojis
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
