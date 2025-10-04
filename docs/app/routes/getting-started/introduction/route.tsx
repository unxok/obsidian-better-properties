import type { Route } from "./+types/route";
import MdxArticle, {
  // @ts-expect-error TODO named imports from *.mdx not being recognized by TS
  toc,
  // @ts-expect-error
  filepath,
} from "./article.mdx";
import { Article } from "~/components/common/Article";
import { createMeta } from "~/lib/utils";

export function meta({}: Route.MetaArgs) {
  return createMeta({
    title: "Introduction",
    description: "Getting started with Better Properties.",
  });
}

export default function Route({}: Route.ComponentProps) {
  return (
    <Article
      path={filepath}
      toc={toc}
      next={{
        label: "Installation",
        path: "/getting-started/installation",
      }}
    >
      <MdxArticle />
    </Article>
  );
}
