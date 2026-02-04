import React, { createContext, useContext } from 'react';

type TabBarContextType = {
  tabBarHeight: number;
};

const TabBarContext = createContext<TabBarContextType>({ tabBarHeight: 0 });

export const TabBarProvider: React.FC<{ height: number; children: React.ReactNode }> = ({ height, children }) => {
  return (
    <TabBarContext.Provider value={{ tabBarHeight: height }}>
      {children}
    </TabBarContext.Provider>
  );
};

export const useTabBar = () => useContext(TabBarContext);
