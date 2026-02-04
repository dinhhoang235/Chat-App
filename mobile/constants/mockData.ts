export interface Contact {
  id: string;
  name: string;
  phone?: string;
  initials?: string;
  color?: string;
  online?: boolean;
  bio?: string;
}

export const contacts: Contact[] = [
  { id: '1', name: 'Nguyễn Văn An', initials: 'VA', color: '#34D399', online: true, phone: '0905123456', bio: 'Lập trình viên React Native, thích cà phê và leo núi.' },
  { id: '2', name: 'Lê Thị Mai', initials: 'LM', color: '#60A5FA', online: false, phone: '0916789012' },
  { id: '3', name: 'Trần Minh Hoàng', initials: 'TH', color: '#F472B6', online: true, phone: '0932109876' },
  { id: '4', name: 'Hoàng Dương', initials: 'HD', color: '#F59E0B', online: false, phone: '0945566778' },
  { id: '5', name: 'Phạm Thuỷ', initials: 'PT', color: '#FB7185', online: true, phone: '0956677889' },
  { id: '6', name: 'Team Dev', initials: 'TD', color: '#9CA3AF', online: false, phone: 'N/A' },
  { id: '7', name: 'Quán Cà Phê', initials: 'QC', color: '#A78BFA', online: false, phone: '0967788990' },
  { id: '8', name: 'Bạn học cấp 3', initials: 'BH', color: '#F97316', online: true, phone: '0978899001' },
  { id: '9', name: 'Zalo Shop', initials: 'ZS', color: '#38BDF8', online: false, phone: '0989900112' },
  { id: '10', name: 'Số lạ', initials: 'SL', color: '#60A5FA', online: false, phone: '0123456789' },
  { id: '11', name: 'Ngọc Ánh', initials: 'NA', color: '#60A5FA', online: true, phone: '0912345670' },
  { id: '12', name: 'Đỗ Minh', initials: 'DM', color: '#34D399', online: false, phone: '0909988776' },
  { id: '13', name: 'Trương Anh', initials: 'TA', color: '#F472B6', online: false, phone: '0911223344' },
  { id: '14', name: 'Phan Huy', initials: 'PH', color: '#F59E0B', online: true, phone: '0922334455' },
  { id: '15', name: 'Vũ Khánh', initials: 'VK', color: '#FB7185', online: false, phone: '0933445566' },
  { id: '16', name: 'Bùi Lan', initials: 'BL', color: '#9CA3AF', online: true, phone: '0944556677' },
  { id: '17', name: 'Hà Anh', initials: 'HA', color: '#A78BFA', online: false, phone: '0955667788' },
  { id: '18', name: 'Nguyễn Bình', initials: 'NB', color: '#F97316', online: true, phone: '0966778899' },
  { id: '19', name: 'Cà phê Sáng', initials: 'CS', color: '#38BDF8', online: false, phone: '0977889900' },
  { id: '20', name: 'Mai Hương', initials: 'MH', color: '#60A5FA', online: true, phone: '0988990011' },
  { id: '21', name: 'Lê Văn Tuấn', initials: 'LT', color: '#34D399', online: false, phone: '0999001122' },
  { id: '22', name: 'Phùng Duy', initials: 'PD', color: '#F472B6', online: false, phone: '0910001112' },
  { id: '23', name: 'Hồng Nhung', initials: 'HN', color: '#F59E0B', online: true, phone: '0921112233' },
  { id: '24', name: 'Tân Bùi', initials: 'TB', color: '#FB7185', online: false, phone: '0932223344' },
  { id: '25', name: 'Ốc Sên', initials: 'OS', color: '#9CA3AF', online: true, phone: '0943334455' },
  { id: '26', name: 'Nhật Minh', initials: 'NM', color: '#A78BFA', online: false, phone: '0954445566' },
  { id: '27', name: 'Gia Huy', initials: 'GH', color: '#F97316', online: true, phone: '0965556677' },
  { id: '28', name: 'Trà My', initials: 'TM', color: '#38BDF8', online: false, phone: '0976667788' },
  { id: '29', name: 'Shop Quà', initials: 'SQ', color: '#60A5FA', online: false, phone: '0987778899' },
  { id: '30', name: 'Số dịch vụ', initials: 'SD', color: '#34D399', online: true, phone: '0998889900' },
];

export interface Message {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread?: number;
  initials?: string;
  color?: string;
}

export const messages: Message[] = [
  { id: 'm1', name: 'Zalo Shop', lastMessage: 'Đơn hàng #12345 đã được gửi 🎉', time: '5 phút', unread: 3, initials: 'ZS', color: '#60A5FA' },
  { id: 'm2', name: 'Nguyễn Văn An', lastMessage: 'Ok, chiều này gặp quán cũ nhé.', time: '2 giờ', unread: 0, initials: 'VA', color: '#34D399' },
  { id: 'm3', name: 'Lê Thị Mai', lastMessage: 'Gửi file rồi, check giúp em nha.', time: 'Hôm nay', unread: 0, initials: 'LM', color: '#60A5FA' },
  { id: 'm4', name: 'Team Dev', lastMessage: 'Pull request đã merged ✅', time: 'Hôm qua', unread: 0, initials: 'TD', color: '#F59E0B' },
  { id: 'm5', name: 'Quán Cà Phê', lastMessage: 'Sáng nay tụ tập 8h không?', time: '3 giờ', unread: 1, initials: 'QC', color: '#38BDF8' },
  { id: 'm6', name: 'Bạn học cấp 3', lastMessage: 'Xem ảnh du lịch của mình nhé 😍', time: '17 giờ', unread: 0, initials: 'BH', color: '#F472B6' },
  { id: 'm7', name: 'Phạm Thuỷ', lastMessage: 'Bạn ơi, máy em bị lỗi, giúp mình với.', time: '20 giờ', unread: 2, initials: 'PT', color: '#FB7185' },
  { id: 'm8', name: 'Số lạ', lastMessage: 'Bạn gọi nhỡ', time: 'T2', unread: 0, initials: 'SL', color: '#F59E0B' },
  { id: 'm9', name: 'Ngọc Ánh', lastMessage: 'Nhớ mang sách nhé!', time: 'Hôm nay', unread: 0, initials: 'NA', color: '#60A5FA' },
  { id: 'm10', name: 'Đỗ Minh', lastMessage: 'Cập nhật ticket #456', time: '1 giờ', unread: 0, initials: 'DM', color: '#34D399' },
  { id: 'm11', name: 'Trương Anh', lastMessage: 'Ok luôn, mình làm', time: '3 giờ', unread: 0, initials: 'TA', color: '#F472B6' },
  { id: 'm12', name: 'Phan Huy', lastMessage: 'Sẵn sàng cho buổi họp', time: 'Hôm nay', unread: 0, initials: 'PH', color: '#F59E0B' },
  { id: 'm13', name: 'Vũ Khánh', lastMessage: 'Đã đóng issue.', time: 'Hôm qua', unread: 0, initials: 'VK', color: '#FB7185' },
  { id: 'm14', name: 'Bùi Lan', lastMessage: 'Bạn ơi gửi link giúp', time: '4 giờ', unread: 0, initials: 'BL', color: '#9CA3AF' },
  { id: 'm15', name: 'Hà Anh', lastMessage: 'Chúc mừng sinh nhật nhé 🎂', time: '2 ngày', unread: 0, initials: 'HA', color: '#A78BFA' },
  { id: 'm16', name: 'Nguyễn Bình', lastMessage: 'Sẵn sàng nhận hàng', time: '1 ngày', unread: 0, initials: 'NB', color: '#F97316' },
  { id: 'm17', name: 'Cà phê Sáng', lastMessage: 'Khuyến mại 20% cuối tuần', time: '5 giờ', unread: 1, initials: 'CS', color: '#38BDF8' },
  { id: 'm18', name: 'Mai Hương', lastMessage: 'Gặp tối nay được không?', time: '6 giờ', unread: 0, initials: 'MH', color: '#60A5FA' },
  { id: 'm19', name: 'Lê Văn Tuấn', lastMessage: 'Đã tới nơi.', time: '10 phút', unread: 1, initials: 'LT', color: '#34D399' },
  { id: 'm20', name: 'Phùng Duy', lastMessage: 'Chi tiết tại file đính kèm', time: 'Hôm nay', unread: 0, initials: 'PD', color: '#F472B6' },
  { id: 'm21', name: 'Hồng Nhung', lastMessage: 'Cảm ơn nhé!', time: '3 ngày', unread: 0, initials: 'HN', color: '#F59E0B' },
  { id: 'm22', name: 'Tân Bùi', lastMessage: 'Check inbox đi', time: '1 giờ', unread: 0, initials: 'TB', color: '#FB7185' },
  { id: 'm23', name: 'Ốc Sên', lastMessage: 'Sản phẩm mới đã về', time: 'Hôm nay', unread: 2, initials: 'OS', color: '#9CA3AF' },
  { id: 'm24', name: 'Nhật Minh', lastMessage: 'Đi chơi cuối tuần nhé', time: '2 ngày', unread: 0, initials: 'NM', color: '#A78BFA' },
  { id: 'm25', name: 'Gia Huy', lastMessage: 'Video call lúc 7 được không?', time: '30 phút', unread: 0, initials: 'GH', color: '#F97316' },
  { id: 'm26', name: 'Trà My', lastMessage: 'Gửi report rồi đó', time: 'Hôm nay', unread: 0, initials: 'TM', color: '#38BDF8' },
  { id: 'm27', name: 'Shop Quà', lastMessage: 'Hoá đơn #789 được tạo', time: 'Hôm qua', unread: 0, initials: 'SQ', color: '#60A5FA' },
  { id: 'm28', name: 'Số dịch vụ', lastMessage: 'Thông báo hệ thống', time: '1 giờ', unread: 0, initials: 'SD', color: '#34D399' },
  { id: 'm29', name: 'Hỗ trợ Zalo', lastMessage: 'Đã nhận yêu cầu của bạn', time: '10 phút', unread: 1, initials: 'HZ', color: '#F472B6' },
  { id: 'm30', name: 'Tin tức', lastMessage: 'Bản tin sáng: Thị trường...', time: '6 giờ', unread: 0, initials: 'TT', color: '#F59E0B' },
];

export interface FriendRequest {
  id: string;
  name: string;
  message?: string;
  time: string;
  initials?: string;
  color?: string;
}

export const friendRequests: FriendRequest[] = [
  { id: 'fr1', name: 'Huyền Tuyên Sinh Elearning', message: 'Xin chào, mình là Huyền Tuyên Sinh Elearning. Mình tìm thấy bạn b...', time: '12/01', initials: 'HT', color: '#34D399' },
  { id: 'fr2', name: 'Nguyen Coway', message: 'Muốn kết bạn', time: '11/01', initials: 'NC', color: '#60A5FA' },
  { id: 'fr3', name: 'Đăng Hải', message: 'Muốn kết bạn', time: '10/01', initials: 'ĐH', color: '#F472B6' },
  { id: 'fr4', name: 'Minh Cũ', message: 'Muốn kết bạn', time: '08/01', initials: 'MC', color: '#F59E0B' },
  { id: 'fr5', name: 'Người lạ', message: 'Muốn kết bạn', time: '12/12', initials: 'NL', color: '#FB7185' },
];

// Sent friend requests (mock) — currently empty, filled later from API
export const friendRequestsSent: FriendRequest[] = [];
