import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  type ReactNode,
  useState,
} from "react";
import { Link } from "react-router";
import type { TocItem } from "rehype-mdx-toc";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarRail,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarFooter,
} from "~/components/ui/sidebar";
import { Button } from "~/components/ui/button";

const TocContext = createContext<{
  toc: TocItem[];
  setToc: Dispatch<SetStateAction<TocItem[]>>;
}>({
  toc: [],
  setToc: () => {},
});

export const useToc = () => {
  const ctx = useContext(TocContext);
  if (ctx === undefined) {
    throw new Error("useToc() must be used within a <TocProvier />");
  }
  return ctx;
};

export const TocProvider = ({ children }: { children: ReactNode }) => {
  const [toc, setToc] = useState<TocItem[]>([]);
  return (
    <TocContext.Provider value={{ toc, setToc }}>
      {children}
    </TocContext.Provider>
  );
};

export const RightSidebar = () => {
  const { toc } = useToc();

  return (
    <Sidebar collapsible="offcanvas" side="right">
      <SidebarHeader>{/* <Header /> */}</SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>On this page</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nestTocByDepth(toc ?? [])?.[0]?.children?.map((item) =>
                renderNestedMenu(item),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-1">
        <div className="flex flex-col gap-2 p-2">
          <hr />
          <span>
            I have spent a lot of my free time and effort to work on this
            plugin, and because it will{" "}
            <span className="text-primary">never have any paid features</span>,
            coffee is a great way to show your support :&#41;
          </span>
          <Button>Buy me a coffee ☕</Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

const renderNestedMenu = (item: TreeNode) => (
  <SidebarMenuItem key={item.id}>
    <SidebarMenuButton asChild>
      <Link
        to={{
          hash: item.href,
        }}
      >
        {item.value}
      </Link>
    </SidebarMenuButton>
    {item.children.length ? (
      <SidebarMenuSub>
        {item.children.map((subItem) => renderNestedMenu(subItem))}
      </SidebarMenuSub>
    ) : undefined}
  </SidebarMenuItem>
);

type TreeNode = TocItem & { children: TreeNode[] };

const nestTocByDepth = (toc: readonly TocItem[]): TreeNode[] => {
  const roots: TreeNode[] = [];
  const stack: TreeNode[] = [];

  for (const item of toc) {
    const { depth } = item;
    const node: TreeNode = { ...item, children: [] };

    stack.length = Math.min(stack.length, depth - 1);

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack[depth - 1] = node;
  }

  return roots;
};
