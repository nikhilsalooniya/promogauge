import { Share2, Facebook, Twitter, Linkedin, MessageCircle } from "lucide-react";
import { useState } from "react";

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
}

export default function SocialShare({ url, title, description }: SocialShareProps) {
  const [showMenu, setShowMenu] = useState(false);

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} - ${description || 'Spin the wheel and win amazing prizes!'}\n\n${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  };

  const socialButtons = [
    { name: "WhatsApp", icon: MessageCircle, url: shareLinks.whatsapp, color: "bg-green-600" },
    { name: "Facebook", icon: Facebook, url: shareLinks.facebook, color: "bg-blue-600" },
    { name: "Twitter", icon: Twitter, url: shareLinks.twitter, color: "bg-sky-500" },
    { name: "LinkedIn", icon: Linkedin, url: shareLinks.linkedin, color: "bg-blue-700" },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center justify-center space-x-2"
      >
        <Share2 className="w-5 h-5" />
        <span>Share Campaign</span>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-20">
            <div className="grid grid-cols-2 gap-2">
              {socialButtons.map((button) => {
                const Icon = button.icon;
                return (
                  <a
                    key={button.name}
                    href={button.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMenu(false)}
                    className={`flex flex-col items-center justify-center space-y-2 px-4 py-4 ${button.color} text-white rounded-lg hover:opacity-90 transition-opacity`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="font-medium text-sm">{button.name}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
