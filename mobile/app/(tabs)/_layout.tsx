import React from 'react';
import { Tabs, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from '@/context/themeContext';
import { useSelection } from '@/context/selectionContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddMenuProvider, useAddMenu } from '@/context/addMenuContext';
import { AddMenu } from '@/components';

import { TabBarProvider } from '@/context/tabBarContext';

export default function TabsLayout() {
  const { colors } = useTheme();

  const { selectionMode } = useSelection();
  const insets = useSafeAreaInsets();

  const tabBarHeight = 56 + insets.bottom; // compute in one place and provide to children

  return (
    <AddMenuProvider>
      <TabBarProvider height={tabBarHeight}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabIconSelected,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarStyle: selectionMode
            ? { display: 'none' as any }
            : {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: tabBarHeight, // use computed value
                paddingBottom: insets.bottom + 6,
                paddingTop: 6,
                backgroundColor: colors.surface,
                borderTopColor: 'transparent',
                borderTopWidth: 0,
                elevation: 0,
                shadowOpacity: 0,
                overflow: 'hidden',
              },
          tabBarLabelStyle: { fontSize: 12, paddingBottom: 2 },
        }}
      >
        
      <Tabs.Screen
        name="index"
        options={{
          title: "Tin nhắn",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="message" color={color} size={size + 6} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Danh bạ",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="contacts" color={color} size={size + 6} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Cá nhân",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size + 6} />
          ),
        }}
      />
    </Tabs>
      </TabBarProvider>

      {/* place AddMenu at layout level so overlay covers tab bar */}
      <AddMenuWrapper />
    </AddMenuProvider>
  );
}



function AddMenuWrapper() {
  const { visible, close, addLayout, headerLayout } = useAddMenu();
  const router = useRouter();

  const handleAddContact = () => { close(); router.push('/new-contact'); };
  const handleCreateGroup = () => { close(); router.push('/new-group'); };

  return (
    <AddMenu 
      visible={visible} 
      addLayout={addLayout} 
      headerLayout={headerLayout} 
      onClose={close} 
      onAddContact={handleAddContact} 
      onCreateGroup={handleCreateGroup} 
    />
  );
}
