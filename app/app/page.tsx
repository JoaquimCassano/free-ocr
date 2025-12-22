"use client";

import { useState, useRef } from "react";
import { Copy, CheckCircle2, ImageIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setExtractedText("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setExtractedText("");
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) return;

    setIsExtracting(true);
    setExtractedText("");

    // Mock OCR response - replace this with your actual OCR implementation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockText = `This is a mock OCR response.

Replace the handleExtract function with your actual OCR implementation.

You can use services like:
- Tesseract.js (client-side)
- Google Cloud Vision API
- AWS Textract
- Azure Computer Vision
- Or any other OCR service

The extracted text will appear here!`;

    setExtractedText(mockText);
    setIsExtracting(false);
  };

  const handleCopy = async () => {
    if (extractedText) {
      await navigator.clipboard.writeText(extractedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 sm:p-12">
      <main className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h1
            className="mb-4 text-6xl font-black uppercase tracking-tight sm:text-8xl"
            style={{
              textShadow: "6px 6px 0px var(--accent)",
            }}
          >
            FREE OCR
          </h1>
          <p className="text-lg font-bold uppercase tracking-wide opacity-80 sm:text-xl">
            ocr without bullshit.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative cursor-pointer  border-dashed border-foreground
              bg-background p-12 transition-all duration-200
              ${
                isDragging
                  ? "-translate-x-2 -translate-y-2 bg-accent shadow-[8px_8px_0px_var(--shadow)]"
                  : "shadow-[4px_4px_0px_var(--shadow)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_var(--shadow)]"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center gap-4 text-center">
              {previewUrl ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative h-48 w-48 border-4 border-foreground">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <p className="font-bold uppercase">{selectedFile?.name}</p>
                </div>
              ) : (
                <>
                  <ImageIcon size={64} strokeWidth={3} className="opacity-80" />
                  <div>
                    <p className="mb-2 text-xl font-bold uppercase">
                      Drag & Drop, paste or Click
                    </p>
                    <p className="font-bold uppercase opacity-60">
                      PNG, JPG, JPEG, WebP
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <button
            onClick={handleExtract}
            disabled={!selectedFile || isExtracting}
            className={`
              w-full  border-foreground bg-accent p-6
              text-2xl font-black uppercase tracking-wide text-foreground
              transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
              ${
                !isExtracting && selectedFile
                  ? "hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_var(--shadow)] active:translate-x-0 active:translate-y-0 active:shadow-none"
                  : ""
              }
              shadow-[4px_4px_0px_var(--shadow)]
            `}
          >
            {isExtracting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={28} strokeWidth={3} />
                Extracting...
              </span>
            ) : (
              "Extract Text"
            )}
          </button>
        </motion.div>

        <AnimatePresence>
          {extractedText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="mt-8"
            >
              <div className="border-foreground bg-background p-6 shadow-[4px_4px_0px_var(--shadow)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-black uppercase">
                    Extracted Text
                  </h2>
                  <button
                    onClick={handleCopy}
                    className={`
                      flex items-center gap-2 border-[3px] border-foreground
                      px-4 py-2 font-bold uppercase transition-all duration-150
                      ${
                        isCopied
                          ? "bg-accent -translate-x-0.5 -translate-y-0.5 shadow-[4px_4px_0px_var(--shadow)]"
                          : "bg-background hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_var(--shadow)] active:translate-x-0 active:translate-y-0 active:shadow-none"
                      }
                    `}
                  >
                    {isCopied ? (
                      <>
                        <CheckCircle2 size={18} strokeWidth={3} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={18} strokeWidth={3} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="max-h-96 overflow-auto border-[3px] border-foreground bg-[#FFFEF9] p-4">
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {extractedText}
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
