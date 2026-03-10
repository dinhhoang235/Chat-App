import React, { createContext, useContext } from 'react';

type TabBarContextType = {
  tabBarHeight: number;
};

const TabBarContext = createContext<TabBarContextType>({ tabBarHeight: 0 });

export function TabBarProvider({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <TabBarContext.Provider value={{ tabBarHeight: height }}>
      {children}
    </TabBarContext.Provider>
  );
};

export const useTabBar = () => useContext(TabBarContext);
