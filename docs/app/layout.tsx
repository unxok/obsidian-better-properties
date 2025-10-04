import { useState, type ComponentProps, type ReactNode } from "react";
import {
  Meta,
  Links,
  ScrollRestoration,
  Scripts,
  href,
  NavLink as BaseNavLink,
  Link,
} from "react-router";
import {
  ThemeProvider,
  ThemeSwitcher,
} from "~/components/common/ThemeSwitcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "~/components/ui/sidebar";
import { Logo } from "./components/common/Logo";
import "./typography.css";
import "./index.css";
import "./starry-night.css";
import { cn } from "./lib/utils";
import { RightSidebar, TocProvider } from "./components/common/TocSidebar";
import { Coffee, ExternalLink, PanelLeft, PanelRight } from "lucide-react";
import { Button, buttonVariants } from "./components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { GithubIcon } from "./components/common/GithubIcon";

export const Layout = ({ children }: { children: ReactNode }): ReactNode => {
  const [leftOpen, setLeftOpen] = useState<boolean>(true);
  const [rightOpen, setRightOpen] = useState<boolean>(true);
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider>
          <TocProvider>
            <div className="fixed inset-0 flex flex-col bg-inherit text-inherit">
              <div className="relative flex w-full">
                <SidebarProvider
                  className="w-fit"
                  open={leftOpen}
                  onOpenChange={setLeftOpen}
                >
                  <LeftSidebar />
                </SidebarProvider>
                <main className="bg-background h-screen w-full overflow-y-auto">
                  <ScrollRestoration
                    getScrollContainer={() => document.querySelector("main")}
                  />
                  <Scripts />
                  <Header
                    toggleLeftSidebar={() => setLeftOpen((prev) => !prev)}
                    toggleRightSidebar={() => setRightOpen((prev) => !prev)}
                  />
                  {children}
                </main>
                <SidebarProvider
                  className="w-fit"
                  open={rightOpen}
                  onOpenChange={setRightOpen}
                >
                  <RightSidebar />
                </SidebarProvider>
              </div>
            </div>
          </TocProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

const LeftSidebar = (): ReactNode => {
  return (
    <Sidebar collapsible="offcanvas">
      {/* <SidebarHeader>
					<h1 className='text-lg text-nowrap font-mono font-semibold flex items-center gap-[0.75ch] pt-4'>
						<Logo />
						<span>Better Properties</span>
					</h1>
				</SidebarHeader> */}
      <SidebarHeader>
        <header className="hidden w-full justify-center py-1 lg:flex">
          <H1 />
        </header>
        <div className="flex w-full items-center justify-around gap-1">
          <a
            title="Buy me a coffee"
            href="https://buymeacoffee.com/unxok"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <Coffee />
          </a>
          <GithubButton />
          <ThemeSwitcher />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Getting started</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to={href("/")}>Introduction</NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to={href("/getting-started/installation")}>
                    Installation
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to={href("/getting-started/usage")}>Usage</NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Features</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to={href("/features/roadmap")}>
                    Roadmap, bugs, and more
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to={href("/features/metadata-editor")}>
                    Metadata Editor
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to={href("/features/property-types")}>
                    Property types
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to={href("/features/bpjs")}>bpjs</NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem></SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="text-center font-mono font-semibold">
        Made with &lt;3 by Unxok
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

const NavLink = ({
  className,
  ...props
}: ComponentProps<typeof BaseNavLink>): ReactNode => (
  <BaseNavLink
    className={({ isActive }) => {
      const defaultClassName = "";
      return cn(defaultClassName, isActive && "bg-secondary", className);
    }}
    {...props}
  />
);

const GithubButton = (): ReactNode => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button title="Github links" variant={"ghost"} size={"icon"}>
        <GithubIcon />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem asChild>
        <a href="https://github.com/unxok/obsidian-better-properties-docs">
          <span>Docs</span>
          <ExternalLink />
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <a href="https://github.com/unxok/obsidian-better-properties">
          <span>Plugin</span>
          <ExternalLink />
        </a>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const Header = ({
  toggleLeftSidebar,
  toggleRightSidebar,
}: {
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
}) => {
  return (
    <>
      <header className="bg-background flex items-center justify-between gap-1 border-b-1 px-2 py-2 lg:border-0">
        <Button onClick={toggleLeftSidebar} variant={"ghost"} size={"icon"}>
          <PanelLeft />
        </Button>
        <H1 className="lg:hidden" />
        <Button variant={"ghost"} size={"icon"} onClick={toggleRightSidebar}>
          <PanelRight />
        </Button>
      </header>
    </>
  );
};

const H1 = ({ className }: { className?: string }) => (
  <h1
    className={cn(
      "flex w-fit items-center gap-[.5ch] font-bold tracking-wide max-[324px]:text-sm",
      className,
    )}
  >
    <Link to={href("/")}>
      <span className="sr-only">Better Properties</span>
      <Logo height={32} className="mb-0.5 w-full" />
    </Link>
    {/* <span>Better Properties Docs</span> */}
  </h1>
);
