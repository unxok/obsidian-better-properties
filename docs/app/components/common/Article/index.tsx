import { useEffect, type ReactNode } from "react";
import { EditOnGithub } from "../EditOnGithub";
import type { TocItem } from "rehype-mdx-toc";
import { useToc } from "../TocSidebar";
import { Link } from "react-router";
import { cn, type Path } from "~/lib/utils";
import { buttonVariants } from "~/components/ui/button";
import { ArrowRight } from "lucide-react";

export const Article = ({
  children,
  path,
  toc,
  next,
}: {
  children: ReactNode;
  path: string;
  toc: TocItem[];
  next?: {
    path: Path;
    label: string;
  };
}): ReactNode => {
  const { setToc } = useToc();

  useEffect(() => {
    if (!toc) return;
    setToc(() => [...toc]);
  }, [toc]);
  return (
    <div className="mx-auto flex w-full max-w-[95%] justify-center">
      {/* <DotsBackground /> */}
      <article className="typography h-fit w-full max-w-[80ch] pt-4 pb-72 [&_th_code,&_td_code]:text-nowrap">
        {children}
        <hr />
        <div className="flex w-full flex-wrap items-center justify-between gap-4">
          <EditOnGithub path={path} />
          {next && (
            <Link
              to={next.path}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "no-underline",
              )}
            >
              {next.label}
              <ArrowRight />
            </Link>
          )}
        </div>
      </article>
    </div>
  );
};

// const DotsBackground = () => (
//   <div className="absolute inset-0 h-full w-full bg-[radial-gradient(var(--color-muted)_1px,transparent_1px)] [background-size:32px_32px]"></div>
// );
