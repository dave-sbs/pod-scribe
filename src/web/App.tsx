import { useState, useEffect } from "react";
import { Sidebar, CollapsedSidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { useThemeStore } from "./stores/theme";

export function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const dark = useThemeStore((s) => s.dark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="h-screen flex overflow-hidden bg-bg-primary">
      {/* Desktop sidebar */}
      <div className="hidden md:block flex-none">
        {collapsed ? (
          <CollapsedSidebar onExpand={() => setCollapsed(false)} />
        ) : (
          <Sidebar onCollapse={() => setCollapsed(true)} />
        )}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-[280px] z-40 md:hidden">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center px-4 py-3 border-b border-border">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-bg-secondary text-text-secondary"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="ml-3 font-serif text-sm text-text-secondary italic">
            Pod-Scribe
          </span>
        </div>

        <ChatView />
      </div>
    </div>
  );
}
