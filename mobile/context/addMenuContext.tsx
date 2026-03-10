import React, { createContext, useContext, useState } from 'react';

type AddMenuContextType = {
  visible: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addLayout: { x: number; y: number; width: number; height: number } | null;
  setAddLayout: (l: { x: number; y: number; width: number; height: number } | null) => void;
  headerLayout: { x: number; y: number; width: number; height: number } | null;
  setHeaderLayout: (l: { x: number; y: number; width: number; height: number } | null) => void;
};

const AddMenuContext = createContext<AddMenuContextType | undefined>(undefined);

export function AddMenuProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [addLayout, setAddLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [headerLayout, setHeaderLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const open = () => setVisible(true);
  const close = () => setVisible(false);
  const toggle = () => setVisible(v => !v);

  return (
    <AddMenuContext.Provider value={{ visible, open, close, toggle, addLayout, setAddLayout, headerLayout, setHeaderLayout }}>
      {children}
    </AddMenuContext.Provider>
  );
};

export const useAddMenu = () => {
  const ctx = useContext(AddMenuContext);
  if (!ctx) throw new Error('useAddMenu must be used within AddMenuProvider');
  return ctx;
};
