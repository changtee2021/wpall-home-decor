import { createContext, useContext, type ReactNode } from "react";

const AccountLayoutContext = createContext(false);

export function AccountLayoutProvider({ children }: { children: ReactNode }) {
  return <AccountLayoutContext.Provider value={true}>{children}</AccountLayoutContext.Provider>;
}

export function useInsideAccountLayout(): boolean {
  return useContext(AccountLayoutContext);
}
