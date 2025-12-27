import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Copy, Check } from "lucide-react";

interface QRCodeGeneratorProps {
  url: string;
  campaignName: string;
}

export default function QRCodeGenerator({ url, campaignName }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateQRCode();
  }, [url]);

  const generateQRCode = async () => {
    if (!canvasRef.current) return;

    try {
      await QRCode.toCanvas(canvasRef.current, url, {
        width: 300,
        margin: 2,
        color: {
          dark: "#1f2937",
          light: "#ffffff",
        },
      });
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  };

  const downloadQRCode = () => {
    if (!canvasRef.current) return;

    const link = document.createElement("a");
    link.download = `${campaignName.replace(/\s+/g, "-").toLowerCase()}-qr-code.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const copyToClipboard = async () => {
    if (!canvasRef.current) return;

    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current!.toBlob((blob) => resolve(blob!));
      });

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy QR code:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-xl border-2 border-gray-200 flex items-center justify-center">
        <canvas ref={canvasRef} />
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={downloadQRCode}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </button>
        <button
          onClick={copyToClipboard}
          className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
