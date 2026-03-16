import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
};

const { width } = Dimensions.get('window');
const focusedSize = width * 0.7;

export default function ScannerModal({ visible, onClose, onScan }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data);
    
    // Reset scanned state after a delay
    setTimeout(() => setScanned(false), 2000);
  };

  if (!permission) {
    return <View />;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-row items-center justify-between px-4 h-14">
          <TouchableOpacity onPress={onClose} className="p-2">
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold">Quét mã QR</Text>
          <View style={{ width: 44 }} />
        </View>

        {!permission.granted ? (
          <View className="flex-1 justify-center items-center p-5">
            <Text className="text-white text-center mb-5">
              Chúng tôi cần quyền truy cập camera để quét mã QR
            </Text>
            <TouchableOpacity onPress={requestPermission} className="bg-blue-600 py-3 px-6 rounded-lg">
              <Text className="text-white font-bold">Cấp quyền</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-1 overflow-hidden relative bg-black">
            <CameraView
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
            {/* Overlay via absolute positioning */}
            <View className="absolute inset-0">
              <View className="flex-1 bg-black/50" />
              <View className="flex-row" style={{ height: focusedSize }}>
                <View className="flex-1 bg-black/50" />
                <View style={{ width: focusedSize, height: focusedSize }} className="relative">
                  {/* Corners */}
                  <View className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-blue-600 rounded-tl-xl" />
                  <View className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-blue-600 rounded-tr-xl" />
                  <View className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-blue-600 rounded-bl-xl" />
                  <View className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-blue-600 rounded-br-xl" />
                </View>
                <View className="flex-1 bg-black/50" />
              </View>
              <View className="flex-1 bg-black/50 items-center justify-start pt-5">
                <Text className="text-white text-sm">Di chuyển mã QR vào khung để quét</Text>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
