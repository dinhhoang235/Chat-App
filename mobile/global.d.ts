// ambient type declarations for libs without shipped types

// allow importing sound files from assets without type errors
// e.g. import sound from '@/assets/sounds/notification.mp3';
declare module '*.mp3';
declare module '*.wav';
declare module '*.caf';
declare module 'expo-notifications';
