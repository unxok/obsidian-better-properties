import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

export const InfoButton = ({
  label,
  content,
}: {
  label: ReactNode;
  content: ReactNode;
}) => {
  return (
    <div className="inline-flex items-center gap-1">
      {label}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={"ghost"} className="size-6">
            <Info />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="typography bg-background max-h-[50vh] w-fit overflow-y-auto [&_h1_a,&_h2_a,&_h3_a,&_h4_a,&_h5_a,&_h6_a]:hidden [&_th_code,&_td_code]:text-nowrap">
          {content}
        </PopoverContent>
      </Popover>
    </div>
  );
};
