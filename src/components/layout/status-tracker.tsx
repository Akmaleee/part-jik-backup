"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const STATUS_FLOW: Record<string, string[]> = {
  MOM: ["Review Mitra", "Signing Mitra", "Finish"],
  JIK: ["Sirkulir TSAT", "Finish"],
  NDA: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
  MOU: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
  MSA: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
};

interface StatusTrackerProps {
  stepName: string;
  currentStatus: string;
}

export function StatusTracker({ stepName, currentStatus }: StatusTrackerProps) {
  const steps = STATUS_FLOW[stepName.toUpperCase()] || [];
  const normalizedStatus = currentStatus?.toLowerCase();

  return (
    <TooltipProvider>
      <div className="flex items-center justify-left gap-1">
        {steps.map((status, idx) => {
          let color = "bg-gray-300"; // default abu-abu

          if (normalizedStatus === "draft") {
            color = "bg-gray-300"; // draft semua abu
          } else if (
            (
              normalizedStatus.includes("review") &&
              ["mom", "nda", "mou", "msa"].includes(stepName.toLowerCase())
            ) ||
            (
              normalizedStatus === "sirkulir tsat" &&
              stepName.toLowerCase() === "jik"
            )
          ) {
            color = "bg-red-500"; // review semua merah
          } else if (normalizedStatus.includes("sign") || normalizedStatus === "signing") {
            // hijau untuk step sebelumnya, abu untuk step setelahnya
            color = idx < steps.findIndex(s => s.toLowerCase() === normalizedStatus) 
              ? "bg-green-500" 
              : "bg-gray-300";
          } else if (normalizedStatus === "finish") {
            color = "bg-green-500"; // semua hijau
          } else {
            // default logic: hijau untuk step <= current, abu-abu sisanya
            const currentIndex = steps.findIndex(s => s.toLowerCase() === normalizedStatus);
            color = idx <= currentIndex ? "bg-green-500" : "bg-gray-300";
          }

          return (
            <Tooltip key={status}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-3 h-3 rounded-full transition-colors cursor-pointer",
                    color
                  )}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {status}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
