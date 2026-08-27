import type { ReactNode } from "react";

interface SeoulMapLayoutProps {
  children: ReactNode;
  sidebarLeft: ReactNode;
  islandRight: ReactNode;
}

export function SeoulMapLayout({ children, sidebarLeft, islandRight }: SeoulMapLayoutProps) {
  return (
    <div style={{
      position: "relative",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#f8fafc", // Light fallback before map loads
      display: "flex"
    }}>
      {/* Absolute full-screen Map layer underneath */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0
      }}>
        {children}
      </div>

      {/* UI Overlay Layer */}
      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        height: "100%",
        display: "flex",
        pointerEvents: "none", // Let clicks pass through to map
      }}>
        
        {/* Left Sidebar (takes up space and block pointer events) */}
        <aside style={{
          width: "380px",
          height: "100%",
          padding: "24px",
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          overflowY: "auto",
          backdropFilter: "blur(12px)",
          backgroundColor: "rgba(255, 255, 255, 0.75)",
          borderRight: "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: "10px 0 30px rgba(0, 0, 0, 0.1)",
          zIndex: 20
        }} className="custom-scrollbar">
          {sidebarLeft}
        </aside>

        {/* Right Island (floats on the right) */}
        <div style={{
          flex: 1,
          position: "relative"
        }}>
          {islandRight && (
            <aside style={{
              position: "absolute",
              top: "24px",
              right: "24px",
              width: "440px",
              maxHeight: "calc(100vh - 48px)",
              pointerEvents: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              overflowY: "auto",
              zIndex: 20
            }} className="custom-scrollbar">
              {islandRight}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
