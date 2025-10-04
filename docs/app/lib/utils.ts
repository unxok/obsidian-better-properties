import { clsx, type ClassValue } from "clsx";
import type { href } from "react-router";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Path = Parameters<typeof href>[0];

type Meta =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };
export const createMeta = (props: {
  title: string;
  description?: string;
  image?: string;
}): Meta[] => {
  const title: Meta[] = [
    {
      title: props.title + " | Better Properties",
    },
    {
      property: "og:title",
      content: props.title + " | Better Properties",
    },
  ];

  const description: Meta[] = props.description
    ? [
        {
          name: "description",
          content: props.description,
        },
        {
          property: "og:description",
          content: props.description,
        },
      ]
    : [];

  return [
    ...title,
    ...description,
    {
      property: "og:image",
      content:
        props.image ??
        "https://better-properties.unxok.com/open-graph-image.png",
    },
    {
      property: "og:site_name",
      content: "Better Properties",
    },
    {
      property: "og:image:width",
      content: "1200",
    },
    {
      property: "og:image:width",
      content: "600",
    },
    {
      property: "og:type",
      content: "object",
    },
  ];
};
