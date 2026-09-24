import type { ReactNode } from "react";

import "./ArsenalLayout.css";

type ArsenalLayoutProps = {
  left: ReactNode;
  children: ReactNode;
  right?: ReactNode;
};

function ArsenalLayout({
  left,
  children,
  right,
}: ArsenalLayoutProps) {
  return (
    <div className="arsenal-layout">
      <aside className="arsenal-layout-left">
        {left}
      </aside>

      <main className="arsenal-layout-main">
        {children}
      </main>

      <aside
        className="arsenal-layout-right"
        aria-label="Global activity completions"
      >
        {right}
      </aside>
    </div>
  );
}

export default ArsenalLayout;
