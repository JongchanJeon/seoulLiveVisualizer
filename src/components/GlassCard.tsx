import React, { type ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  style?: React.CSSProperties;
}

export function GlassCard({ children, style }: GlassCardProps) {
  return (
    <div style={{
      backgroundColor: "rgba(255, 255, 255, 0.75)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(0, 0, 0, 0.08)",
      borderRadius: "16px",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
      padding: "20px",
      ...style
    }}>
      {children}
    </div>
  );
}
