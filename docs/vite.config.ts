import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import mdx from "@mdx-js/rollup";
import path from "path";
import rehypeSlug from "rehype-slug";
import rehypeMdxToc from "rehype-mdx-toc";
import rehypeAutoLinkHeadings from "rehype-autolink-headings";
import recmaExportFilepath from "recma-export-filepath";
import remarkGfm from "remark-gfm";
import rehypeStarryNight from "rehype-starry-night";

export default defineConfig({
	plugins: [
		mdx({
			remarkPlugins: [remarkGfm],
			rehypePlugins: [
				rehypeSlug,
				rehypeMdxToc,
				rehypeAutoLinkHeadings,
				rehypeStarryNight,
			],
			recmaPlugins: [recmaExportFilepath],
		}),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tailwindcss(),
		reactRouter(),
		tsconfigPaths(),
	],
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "./app"),
		},
	},
});
