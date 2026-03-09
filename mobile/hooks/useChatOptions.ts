import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { chatApi } from '../services/chat';
import { socketService } from '../services/socket';
import { useAuth } from '../context/authContext';
import { contacts } from '../constants/mockData';
import { API_URL } from '../services/api';

export function useChatOptions() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const [pinned, setPinned] = useState(false);
  const [eyeOff, setEyeOff] = useState(false);
  const [muteVisible, setMuteVisible] = useState(false);
  const [muteSettingsVisible, setMuteSettingsVisible] = useState(false);
  const [selectedMuteOption, setSelectedMuteOption] = useState<string>('Không tắt');
  const [excludeReminders, setExcludeReminders] = useState<boolean>(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // block settings
  const [blockVisible, setBlockVisible] = useState(false);
  const [blockMessages, setBlockMessages] = useState<boolean>(false);
  const [blockCalls, setBlockCalls] = useState<boolean>(false);

  // edit display name
  const [displayNameModalVisible, setDisplayNameModalVisible] = useState(false);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);

  // report modal state
  const [reportVisible, setReportVisible] = useState(false);
  // confirm clear chat modal
  const [confirmVisible, setConfirmVisible] = useState(false);
  // leave group modal
  const [leaveVisible, setLeaveVisible] = useState(false);

  // resolve id / contact so we can detect groups reliably
  const id = (params as any).id as string;
  const contact = contacts.find(c => c.id === id);
  const name = (params as any).name || contact?.name || 'Người dùng';
  const rawAvatar = (params as any).avatar as string | undefined;
  const avatar = rawAvatar ? (rawAvatar.startsWith('http') ? rawAvatar : `${API_URL}${rawAvatar}`) : undefined;
  const targetUserId = (params as any).targetUserId as string | undefined;
  
  const isGroup = useMemo(() => {
    return (params as any).isGroup === 'true' || (params as any).isGroup === true;
  }, [params]);

  const membersCount = (params as any).membersCount ? parseInt((params as any).membersCount as string) : 0;
  
  const [currentStatus, setCurrentStatus] = useState<string | undefined>((params as any).status);
  const isOnline = currentStatus === 'online';

  const [groupDetails, setGroupDetails] = useState<any>(null);

  const groupAvatars = useMemo(() => {
    if (groupDetails?.participants) {
      return groupDetails.participants
        .map((p: any) => p.user.avatar)
        .filter(Boolean)
        .map((a: string) => `${API_URL}${a}`);
    }
    return (params as any).avatars ? ((params as any).avatars as string).split(',') : [];
  }, [groupDetails, params]);

  const fetchGroupDetails = useCallback(async () => {
    if (!isGroup) return;
    try {
      const response = await chatApi.getConversationDetails(id);
      setGroupDetails(response.data);
    } catch (error) {
      console.error('Fetch group details error:', error);
    }
  }, [id, isGroup]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  // Listen for member updates
  useEffect(() => {
    if (!isGroup) return;

    const handleUpdate = (data: any) => {
      if (data.conversationId?.toString() === id.toString()) {
        fetchGroupDetails();
      }
    };

    socketService.on('conversation_updated', handleUpdate);
    return () => {
      socketService.off('conversation_updated', handleUpdate);
    };
  }, [id, isGroup, fetchGroupDetails]);

  useEffect(() => {
    if (!targetUserId) return;

    const handleStatusChanged = (data: { userId: number; status: string }) => {
      if (data.userId.toString() === targetUserId) {
        setCurrentStatus(data.status);
      }
    };

    socketService.on('user_status_changed', handleStatusChanged);
    return () => {
      socketService.off('user_status_changed', handleStatusChanged);
    };
  }, [targetUserId]);

  const isMuted = selectedMuteOption !== 'Không tắt';

  const performClearChat = async () => {
    setConfirmVisible(false);
    try {
      await chatApi.deleteConversation(id);
      Alert.alert('Đã xóa', 'Lịch sử trò chuyện đã được xóa');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Delete conversation error:', error);
      Alert.alert('Lỗi', 'Không thể xóa cuộc trò chuyện. Vui lòng thử lại sau.');
    }
  };

  const isOwner = useMemo(() => {
    if (!isGroup || !groupDetails || !user) return false;
    const currentUserParticipant = groupDetails.participants?.find((p: any) => p.userId === user.id);
    return currentUserParticipant?.role === 'owner' || currentUserParticipant?.role === 'admin';
  }, [isGroup, groupDetails, user]);

  return {
    router,
    params,
    id,
    name,
    avatar,
    isGroup,
    membersCount,
    groupAvatars,
    isOnline,
    groupDetails,
    pinned, setPinned,
    eyeOff, setEyeOff,
    muteVisible, setMuteVisible,
    muteSettingsVisible, setMuteSettingsVisible,
    selectedMuteOption, setSelectedMuteOption,
    excludeReminders, setExcludeReminders,
    addModalVisible, setAddModalVisible,
    blockVisible, setBlockVisible,
    blockMessages, setBlockMessages,
    blockCalls, setBlockCalls,
    displayNameModalVisible, setDisplayNameModalVisible,
    displayName, setDisplayName,
    reportVisible, setReportVisible,
    confirmVisible, setConfirmVisible,
    leaveVisible, setLeaveVisible,
    isMuted,
    performClearChat,
    isOwner,
  };
}
