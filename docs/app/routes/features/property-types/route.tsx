import MdxArticle, {
  // @ts-expect-error TODO named imports from *.mdx not being recognized by TS
  toc,
  // @ts-expect-error
  filepath,
} from "./article.mdx";
import { Article } from "~/components/common/Article";
import type { Route } from "./+types/route";
import { createMeta } from "~/lib/utils";

export function meta({}: Route.MetaArgs) {
  return createMeta({
    title: "Property types",
    description: "Descriptions and examples of newly added property types.",
  });
}

export default function Route({ loaderData }: Route.ComponentProps) {
  return (
    <Article
      path={filepath}
      toc={toc}
      next={{
        label: "bpjs",
        path: "/features/bpjs",
      }}
    >
      <MdxArticle />
    </Article>
  );
}
