import { Element, MDXContent } from "mdx/types";
import { TocItem } from "rehype-mdx-toc";

declare module "*.mdx" {
  export const toc: undefined | TocItem[];
  export default function MDXContent(props: MDXProps): Element;
}

export {};
