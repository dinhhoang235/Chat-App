import React, { createContext, useCallback, useContext, useState } from 'react';

type SearchContextType = {
  openFor: string | null;
  open: (chatId: string) => void;
  close: () => void;
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [openFor, setOpenFor] = useState<string | null>(null);

  const open = useCallback((chatId: string) => setOpenFor(chatId), []);
  const close = useCallback(() => setOpenFor(null), []);

  return (
    <SearchContext.Provider value={{ openFor, open, close }}>
      {children}
    </SearchContext.Provider>
  );
};

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within SearchProvider');
  return ctx;
}
