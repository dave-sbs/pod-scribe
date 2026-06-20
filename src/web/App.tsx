import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Sidebar, CollapsedSidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { useThemeStore } from "./stores/theme";
import { Button } from "@/web/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/web/components/ui/sheet";

export function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const dark = useThemeStore((s) => s.dark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden flex-none md:block">
        {collapsed ? (
          <CollapsedSidebar onExpand={() => setCollapsed(false)} />
        ) : (
          <Sidebar onCollapse={() => setCollapsed(true)} />
        )}
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">Conversations</SheetTitle>
          <Sidebar onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <div className="flex items-center border-b px-3 py-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </Button>
          <span className="ml-2 font-serif text-sm text-muted-foreground italic">
            Pod-Scribe
          </span>
        </div>

        <ChatView />
      </div>
    </div>
  );
}
