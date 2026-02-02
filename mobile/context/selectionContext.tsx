import React, { createContext, useContext, useState } from 'react';

type SelectionContextType = {
  selectionMode: boolean;
  setSelectionMode: (v: boolean) => void;
};

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectionMode, setSelectionMode] = useState(false);
  return (
    <SelectionContext.Provider value={{ selectionMode, setSelectionMode }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider');
  return ctx;
}
