import {
  type RouteConfig,
  index,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/getting-started/introduction/route.tsx"),
  ...prefix("getting-started", [
    route("installation", "routes/getting-started/installation/route.tsx"),
    route("usage", "routes/getting-started/usage/route.tsx"),
  ]),
  ...prefix("features", [
    route("roadmap", "routes/features/roadmap/route.tsx"),
    route("bpjs", "routes/features/bpjs/route.tsx"),
    route("metadata-editor", "routes/features/metadata-editor/route.tsx"),
    route("property-types", "routes/features/property-types/route.tsx"),
  ]),
] satisfies RouteConfig;
