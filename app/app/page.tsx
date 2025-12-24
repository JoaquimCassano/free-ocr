"use client";

import { useState, useRef, useEffect } from "react";
import { Copy, CheckCircle2, ImageIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { RESPONSE_MODES, ResponseMode } from "@/lib/constants";
import { ModeDropdown } from "@/components/ModeDropdown";

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<ResponseMode>("markdown");
  const [extractedVersions, setExtractedVersions] = useState<
    Record<ResponseMode, string>
  >({
    markdown: "",
    plain: "",
    json: "",
    pydantic: "",
    zod: "",
  });
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [failedModes, setFailedModes] = useState<Set<ResponseMode>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith("image/")) {
            const file = items[i].getAsFile();
            if (file) {
              setSelectedFile(file);
              setPreviewUrl(URL.createObjectURL(file));
              setExtractedText("");
            }
            break;
          }
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

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
    setFailedModes(new Set());
    setSelectedMode("markdown");

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(selectedFile);
      const base64Data = await base64Promise;

      const response = await fetch(
        "https://soumnerd--flavortown-ocr-deepseekocr-extract.modal.run/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_data: base64Data,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const markdownText = data.text || "No text extracted";
      setExtractedText(markdownText);
      setExtractedVersions((prev) => ({
        ...prev,
        markdown: markdownText,
      }));

      setIsLoadingVersions(true);
      await fetchResponseModes(markdownText);
    } catch (error) {
      console.error("OCR extraction failed:", error);
      setExtractedText("Error: Failed to extract text. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const fetchResponseModes = async (text: string) => {
    const modes: ResponseMode[] = ["plain", "json", "pydantic", "zod"];
    const results: Record<ResponseMode, string | null> = {
      markdown: extractedVersions.markdown,
      plain: null,
      json: null,
      pydantic: null,
      zod: null,
    };
    const failedSet = new Set<ResponseMode>();

    const promises = modes.map((mode) =>
      fetch("/api/change_response_mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          content: text,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            failedSet.add(mode);
            return null;
          }
          return response.json();
        })
        .then((data) => {
          if (data?.text) {
            results[mode] = data.text;
          } else {
            failedSet.add(mode);
          }
        })
        .catch(() => {
          failedSet.add(mode);
        })
    );

    await Promise.all(promises);

    setExtractedVersions({
      markdown: results.markdown || "",
      plain: results.plain || "",
      json: results.json || "",
      pydantic: results.pydantic || "",
      zod: results.zod || "",
    });
    setFailedModes(failedSet);
    setIsLoadingVersions(false);
  };

  const handleCopy = async () => {
    const textToCopy = extractedVersions[selectedMode] || extractedText;
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const currentDisplayText = extractedVersions[selectedMode] || extractedText;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 lg:p-12">
      <main className="mx-auto max-w-450">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center lg:mb-12"
        >
          <h1
            className="mb-4 text-5xl font-black uppercase tracking-tight sm:text-7xl lg:text-8xl"
            style={{
              textShadow: "6px 6px 0px var(--accent)",
            }}
          >
            FREE OCR
          </h1>
          <p className="text-base font-bold uppercase tracking-wide opacity-80 sm:text-lg lg:text-2xl">
            ocr without bullshit.
          </p>
        </motion.div>

        <div
          className={`grid gap-6 lg:gap-8 transition-all duration-500 ${
            extractedText
              ? "lg:grid-cols-2"
              : "lg:grid-cols-1 lg:max-w-4xl lg:mx-auto"
          }`}
        >
          <div className="flex flex-col gap-6 lg:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative cursor-pointer border-dashed border-foreground
                  bg-background p-8 transition-all duration-200 lg:p-12 lg:min-h-125 flex items-center justify-center
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

                <div className="flex flex-col items-center justify-center gap-4 text-center w-full ">
                  {previewUrl ? (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="relative w-full max-w-md border-4 border-foreground aspect-square">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <p className="font-bold uppercase text-sm lg:text-base break-all px-4">
                        {selectedFile?.name}
                      </p>
                    </div>
                  ) : (
                    <>
                      <ImageIcon
                        size={64}
                        strokeWidth={3}
                        className="opacity-80 lg:w-24 lg:h-24"
                      />
                      <div>
                        <p className="mb-2 text-xl font-bold uppercase lg:text-3xl">
                          Drag & Drop, paste or Click
                        </p>
                        <p className="font-bold uppercase opacity-60 lg:text-xl">
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
                  w-full border-foreground bg-accent p-5
                  text-xl font-black uppercase tracking-wide text-foreground
                  transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                  lg:text-3xl lg:p-8
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
                    <Loader2
                      className="animate-spin"
                      size={28}
                      strokeWidth={3}
                    />
                    Extracting...
                  </span>
                ) : (
                  "Extract Text"
                )}
              </button>
            </motion.div>
          </div>

          <AnimatePresence>
            {extractedText && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="lg:row-start-1 lg:row-span-2"
              >
                <div className="border-foreground bg-background p-6 shadow-[4px_4px_0px_var(--shadow)] lg:h-full flex flex-col">
                  <div className="mb-4 flex items-center justify-between shrink-0 gap-3 flex-wrap">
                    <h2 className="text-xl font-black uppercase lg:text-3xl">
                      Extracted Text
                    </h2>
                    <div className="flex items-center gap-2">
                      {isLoadingVersions ? (
                        <div className="flex items-center gap-2 px-4 py-2 border-[3px] border-foreground bg-background shadow-[4px_4px_0px_var(--shadow)] font-bold uppercase text-sm lg:text-base">
                          <Loader2
                            className="animate-spin"
                            size={16}
                            strokeWidth={3}
                          />
                          Generating other versions
                        </div>
                      ) : (
                        <ModeDropdown
                          modes={RESPONSE_MODES as unknown as ResponseMode[]}
                          selectedMode={selectedMode}
                          onModeChange={setSelectedMode}
                          loadingModes={new Set()}
                          failedModes={failedModes}
                        />
                      )}
                      <button
                        onClick={handleCopy}
                        className={`
                          flex items-center gap-2 border-[3px] border-foreground
                          px-4 py-2 font-bold uppercase transition-all duration-150
                          lg:text-lg lg:px-6 lg:py-3
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
                  </div>
                  <div className="flex-1 overflow-auto border-[3px] border-foreground bg-[#FFFEF9] p-4 lg:p-6">
                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed lg:text-base lg:leading-loose">
                      {currentDisplayText}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
