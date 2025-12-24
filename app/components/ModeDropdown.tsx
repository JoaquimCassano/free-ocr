import { ChevronDown, AlertCircle } from "lucide-react";
import { ResponseMode, MODE_CONFIG } from "@/lib/constants";
import { useState, useRef, useEffect } from "react";

interface ModeDropdownProps {
  modes: ResponseMode[];
  selectedMode: ResponseMode;
  onModeChange: (mode: ResponseMode) => void;
  loadingModes: Set<ResponseMode>;
  failedModes: Set<ResponseMode>;
}

export function ModeDropdown({
  modes,
  selectedMode,
  onModeChange,
  loadingModes,
  failedModes,
}: ModeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = MODE_CONFIG[selectedMode].label;
  const isCurrentLoading = loadingModes.has(selectedMode);
  const isCurrentFailed = failedModes.has(selectedMode);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 border-[3px] border-foreground
          px-4 py-2 font-bold uppercase transition-all duration-150 cursor-pointer
          lg:text-lg lg:px-6 lg:py-3
          ${
            isCurrentLoading || isCurrentFailed
              ? "bg-background cursor-not-allowed opacity-60"
              : "bg-background hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_var(--shadow)] active:translate-x-0 active:translate-y-0 active:shadow-none"
          }
          shadow-[4px_4px_0px_var(--shadow)]
        `}
        disabled={isCurrentLoading || isCurrentFailed}
      >
        <span>{currentLabel}</span>
        <ChevronDown
          size={18}
          strokeWidth={3}
          className={`transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="
            absolute top-full left-0 mt-2 w-full
            border-[3px] border-foreground bg-background
            shadow-[4px_4px_0px_var(--shadow)]
            z-50
          "
        >
          {modes.map((mode) => {
            const isFailed = failedModes.has(mode);
            const isLoading = loadingModes.has(mode);

            return (
              <button
                key={mode}
                onClick={() => {
                  if (!isFailed && !isLoading) {
                    onModeChange(mode);
                    setIsOpen(false);
                  }
                }}
                disabled={isFailed || isLoading}
                className={`
                  w-full border-t-[3px] border-foreground px-4 py-3 text-left
                  font-bold uppercase transition-all duration-150
                  flex items-center justify-between
                  lg:text-base lg:px-6 lg:py-4
                  ${
                    mode === selectedMode
                      ? "bg-accent"
                      : isFailed || isLoading
                      ? "bg-background opacity-50 cursor-not-allowed"
                      : "bg-background hover:bg-accent"
                  }
                `}
              >
                <span>{MODE_CONFIG[mode].label}</span>
                {isFailed && (
                  <AlertCircle size={18} strokeWidth={3} className="ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
