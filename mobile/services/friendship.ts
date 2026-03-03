import apiClient from './api';

// Interface types
export interface User {
  id: number;
  phone: string;
  fullName: string;
  avatar?: string;
  bio?: string;
  coverImage?: string;
  gender?: string;
  dateOfBirth?: string;
  online?: boolean;
}

export interface FriendRequest {
  id: number;
  senderId: number;
  sender?: User;
  receiver?: User;
  receiverId: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface FriendRequestItem {
  id: string;
  name: string;
  phone?: string;
  time: string;
  initials: string;
  color: string;
  message?: string;
}

export interface Friendship {
  id: number;
  userId: number;
  friendId: number;
  friend: User;
  createdAt: string;
  updatedAt: string;
}

// Tìm kiếm bạn theo số điện thoại
export const searchFriendByPhone = async (phone: string) => {
  try {
    const response = await apiClient.get('/users/friends/search', {
      params: { phone }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching friend:', error);
    throw error;
  }
};

// Gửi lời mời kết bạn
export const sendFriendRequest = async (receiverId: number) => {
  try {
    const response = await apiClient.post('/users/friends/request/send', {
      receiverId
    });
    return response.data;
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

// Chấp nhận lời mời kết bạn
export const acceptFriendRequest = async (senderId: number) => {
  try {
    const response = await apiClient.post('/users/friends/request/accept', {
      senderId
    });
    return response.data;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
};

// Từ chối lời mời kết bạn
export const rejectFriendRequest = async (senderId: number) => {
  try {
    const response = await apiClient.post('/users/friends/request/reject', {
      senderId
    });
    return response.data;
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    throw error;
  }
};

// Hủy lời mời kết bạn đã gửi
export const cancelFriendRequest = async (receiverId: number) => {
  try {
    const response = await apiClient.post('/users/friends/request/cancel', {
      receiverId
    });
    return response.data;
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    throw error;
  }
};

// Lấy danh sách lời mời kết bạn chưa xử lý (nhận được)
export const getPendingFriendRequests = async () => {
  try {
    const response = await apiClient.get('/users/friends/requests/pending');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    throw error;
  }
};

// Lấy danh sách lời mời kết bạn đã gửi
export const getSentFriendRequests = async () => {
  try {
    const response = await apiClient.get('/users/friends/requests/sent');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching sent requests:', error);
    throw error;
  }
};

// Lấy danh sách bạn bè
export const getFriendsList = async () => {
  try {
    const response = await apiClient.get('/users/friends/list');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching friends:', error);
    throw error;
  }
};

// Xóa bạn
export const removeFriend = async (friendId: number) => {
  try {
    const response = await apiClient.post('/users/friends/remove', {
      friendId
    });
    return response.data;
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
};

// Kiểm tra trạng thái bạn bè
export const checkFriendshipStatus = async (targetUserId: number) => {
  try {
    const response = await apiClient.get(`/users/friends/status/${targetUserId}`);
    return response.data;
  } catch (error) {
    console.error('Error checking friendship status:', error);
    throw error;
  }
};
