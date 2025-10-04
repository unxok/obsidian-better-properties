import MdxArticle, {
  // @ts-expect-error TODO named imports from *.mdx not being recognized by TS
  toc,
  // @ts-expect-error
  filepath,
} from "./article.mdx";
import { Article } from "~/components/common/Article";
import type { components } from "@octokit/openapi-types";
import type { Route } from "./+types/route";
import { ArrowDown, ArrowUp, MessageSquare } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import type { ReactNode } from "react";
import { createMeta } from "~/lib/utils";

type Issue = components["schemas"]["issue"];

export function meta({}: Route.MetaArgs) {
  return createMeta({
    title: "Roadmap, bugs, and more",
    description:
      "Current issues categorized by roadmap, bugs, and feature requests.",
  });
}

export async function loader({ context }: Route.LoaderArgs) {
  // TODO catch errors
  const token = context.cloudflare.env["GITHUB_PAT"];
  const res = await fetch(
    "https://api.github.com/repos/unxok/obsidian-better-properties/issues",
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "obsidian-better-properties-docs",
        // "Access-Control-Allow-Origin": "*",
        // "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        // "Access-Control-Max-Age": "86400",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      mode: "cors",
    },
  );
  const issues: Issue[] = await res.json();
  return issues;
}

export default function Route({ loaderData }: Route.ComponentProps) {
  return (
    <Article
      path={filepath}
      toc={toc}
      next={{
        label: "Metadata Editor",
        path: "/features/metadata-editor",
      }}
    >
      <MdxArticle
        components={{
          RoadmapIssues() {
            return <RoadmapIssues issues={loaderData} />;
          },
          BugIssues() {
            return <BugIssues issues={loaderData} />;
          },
          FeatureIssues() {
            return <FeatureIssues issues={loaderData} />;
          },
        }}
      />
    </Article>
  );
}

const RoadmapIssues = ({ issues }: { issues: Issue[] }) => {
  return (
    <IssuesList
      issues={issues
        .filter((issue) =>
          issue.labels.some((l) => {
            const label = typeof l === "string" ? l : (l.name ?? "");
            return label?.toLowerCase().includes("roadmap");
          }),
        )
        .sort((a, b) => {
          const upvotes = (i: Issue) => i.reactions?.["+1"] ?? 0;
          const au = upvotes(a);
          const bu = upvotes(b);
          if (au > bu) return 1;
          if (au < bu) return -1;
          return 0;
        })}
    />
  );
};

const BugIssues = ({ issues }: { issues: Issue[] }) => {
  return (
    <IssuesList
      issues={issues
        .filter((issue) =>
          issue.labels.some((l) => {
            const label = typeof l === "string" ? l : (l.name ?? "");
            return label?.toLowerCase().includes("bug");
          }),
        )
        .sort((a, b) => {
          const upvotes = (i: Issue) => i.reactions?.["+1"] ?? 0;
          const au = upvotes(a);
          const bu = upvotes(b);
          if (au > bu) return 1;
          if (au < bu) return -1;
          return 0;
        })}
    />
  );
};

const FeatureIssues = ({ issues }: { issues: Issue[] }) => {
  return (
    <IssuesList
      issues={issues
        .filter((issue) => {
          let isFR = false;
          let isOnRoadmap = false;
          issue.labels.forEach((l) => {
            const label = typeof l === "string" ? l : (l.name ?? "");
            if (label?.toLowerCase().includes("roadmap")) {
              isOnRoadmap = true;
            }
            const hasFrLabel = label?.toLowerCase().includes("feature request");
            if (!hasFrLabel) return;
            isFR = true;
          });
          if (isOnRoadmap) return false;
          return isFR;
        })
        .sort((a, b) => {
          const upvotes = (i: Issue) => i.reactions?.["+1"] ?? 0;
          const au = upvotes(a);
          const bu = upvotes(b);
          if (au > bu) return 1;
          if (au < bu) return -1;
          return 0;
        })}
    />
  );
};

const IssuesList = ({ issues }: { issues: Issue[] }) => {
  return (
    <ul>
      {issues.map(({ id, html_url, title, comments, reactions }) => {
        const badges: {
          label: string;
          icon: ReactNode;
          count: number | undefined;
        }[] = [
          {
            label: "Comments",
            icon: <MessageSquare />,
            count: comments,
          },
          {
            label: "+1 reactions",
            icon: <ArrowUp />,
            count: reactions?.["+1"],
          },
          {
            label: "-1 reactions",
            icon: <ArrowDown />,
            count: reactions?.["-1"],
          },
          {
            label: "Laugh reactions",
            icon: "😄",
            count: reactions?.laugh,
          },
          {
            label: "Hooray reactions",
            icon: "🎉",
            count: reactions?.hooray,
          },
          {
            label: "Confused reactions",
            icon: "😕",
            count: reactions?.confused,
          },
          {
            label: "Eyes reactions",
            icon: "👀",
            count: reactions?.eyes,
          },
          {
            label: "Heart reactions",
            icon: "❤",
            count: reactions?.heart,
          },
          {
            label: "Rocket reactions",
            icon: "🚀",
            count: reactions?.rocket,
          },
        ];
        return (
          <li key={id}>
            <div className="flex items-center gap-2">
              <a href={html_url}>{title}</a>
              {badges
                .filter(({ count }) => !!count)
                .map(({ label, icon, count }) => (
                  <Badge
                    key={label + id + "roadmap-issues-list-badge"}
                    title={label}
                    className="flex h-6 items-center gap-1 rounded-full font-mono [&_svg]:size-3"
                    variant={"outline"}
                  >
                    <span className="">{icon}</span>
                    <span>{count ?? 0}</span>
                  </Badge>
                ))}
            </div>
          </li>
        );
      })}
      {issues.length === 0 && <li className="text-muted">No issues found</li>}
    </ul>
  );
};
