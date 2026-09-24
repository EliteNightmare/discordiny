import type { ReactNode } from "react";

import "./VaultTransition.css";

type VaultTransitionProps = {
  children: ReactNode;
};

function VaultTransition({
  children,
}: VaultTransitionProps) {
  return (
    <div className="vault-transition">
      {children}
    </div>
  );
}

export default VaultTransition;
