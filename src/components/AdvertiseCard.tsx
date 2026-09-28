import { Megaphone } from "lucide-react";
import "@/components/meshGradient.css";

export function AdvertiseCard() {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      aria-label="Advertise your job board here"
      className="advertise-border group block rounded-[14px] p-[3px] transition-shadow outline-none hover:shadow-[0_12px_28px_-14px_rgba(255,106,0,0.65)] focus-visible:ring-2 focus-visible:ring-[#161B1D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f5f1] dark:focus-visible:ring-[#e8e6e1] dark:focus-visible:ring-offset-[#0e1113]"
    >
      <div className="mesh-gradient mesh-gradient-drift flex min-h-[66px] items-start gap-3 rounded-[11px] p-3.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.25)]">
          <Megaphone aria-hidden className="size-4 text-[#ff6a00]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-5 text-white">
            Your Job Board Here
          </h3>
          <p className="mt-0.5 text-xs leading-4 text-white/85">
            Put your jobs in front of the right candidates
          </p>
        </div>
      </div>
    </a>
  );
}
