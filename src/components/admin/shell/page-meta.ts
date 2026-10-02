/** Title, subtitle, and hand-written note per admin route. */
export interface AdminPageMeta {
  title: string;
  subtitle: string;
  script: string;
}

const META: Record<string, AdminPageMeta> = {
  '/admin': {
    title: 'Tổng quan',
    subtitle: 'Tình hình đặt phòng, tư vấn, quỹ phòng, thu tiền và hoạt động gần đây từ dữ liệu hệ thống.',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
  },
  '/admin/dat-phong': {
    title: 'Quản lý đặt phòng',
    subtitle: 'Tra cứu đơn, tạo yêu cầu giữ chỗ, xác nhận hoặc huỷ và xem lịch sử xử lý.',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
  },
  '/admin/phong-nghi': {
    title: 'Quản lý nơi lưu trú',
    subtitle: 'Mỗi khu nghỉ, khách sạn hay homestay có hồ sơ riêng; các hạng phòng được quản lý bên trong từng cơ sở.',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
  },
  '/admin/hang-phong': {
    title: 'Quản lý hạng phòng',
    subtitle: 'Danh sách hạng phòng theo nơi lưu trú, giá, sức chứa, số phòng và album ảnh.',
    script: 'Chăm chút từng phòng\ntrọn vẹn trải nghiệm ♡',
  },
  '/admin/ton-phong': {
    title: 'Quỹ phòng',
    subtitle: 'Mở tồn theo ngày, thiết lập sức chứa, khoá phòng và trạng thái dừng bán.',
    script: 'Quản lý chủ động\nhành trình an tâm ♡',
  },
  '/admin/combo-du-lich': {
    title: 'Quản lý combo du lịch',
    subtitle: 'Quản lý nội dung, lịch trình và trạng thái xuất bản của combo.',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
  },
  '/admin/diem-den': {
    title: 'Quản lý điểm đến',
    subtitle:
      'Quản lý hồ sơ điểm đến, hình ảnh và trạng thái xuất bản trên website.',
    script: 'Lan tỏa vẻ đẹp\nNinh Bình đến muôn nơi! ♡',
  },
  '/admin/noi-dung': {
    title: 'Nội dung website',
    subtitle: 'Soạn, sửa, lưu revision và xuất bản bài viết từ CMS.',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
  },
  '/admin/khach-hang': {
    title: 'Khách hàng',
    subtitle: 'Cập nhật hồ sơ, theo dõi lịch sử trao đổi và lên lịch chăm sóc tiếp theo.',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
  },
  '/admin/khuyen-mai': {
    title: 'Khuyến mãi',
    subtitle: 'Tạo, chỉnh sửa và bật/tắt mã giảm giá; lượt giữ và sử dụng được kiểm soát ở máy chủ.',
    script: 'Ưu đãi đúng lúc\nhành trình trọn vẹn ♡',
  },
  '/admin/thanh-toan': {
    title: 'Thanh toán',
    subtitle: 'Ghi nhận thanh toán và xử lý hoàn tiền thủ công; không kết nối hay gọi cổng thanh toán.',
    script: 'Rõ ràng từng khoản\nan tâm mỗi chuyến đi ♡',
  },
  '/admin/bao-cao': {
    title: 'Báo cáo',
    subtitle: 'Đối soát booking, tiền đã ghi nhận, hoàn tiền, yêu cầu tư vấn và quỹ phòng theo kỳ.',
    script: 'Số liệu thật\nquyết định vững vàng ♡',
  },
};

META['/admin/chuyen-trang'] = {
  title: 'Chuyên trang',
  subtitle: 'Tạo trang chính sách, FAQ và nội dung tĩnh với URL riêng, SEO và trạng thái xuất bản.',
  script: 'Nội dung rõ ràng\nniềm tin bền lâu ♡',
};
META['/admin/menu'] = {
  title: 'Quản lý menu website',
  subtitle: 'Sắp xếp liên kết đầu trang và thêm chuyên trang đã xuất bản vào menu chính.',
  script: 'Đường đi rõ ràng\ntrải nghiệm an yên ♡',
};
META['/admin/yeu-cau-tu-van'] = {
  title: 'Khách hàng & yêu cầu tư vấn',
  subtitle: 'Yêu cầu tư vấn được tải từ API CRM; thay đổi trạng thái được ghi lại ở backend.',
  script: 'Làm du lịch\nbằng cả trái tim ♡',
};
META['/admin/thu-vien-anh'] = {
  title: 'Thư viện ảnh',
  subtitle: 'Tải lên một lần, tái sử dụng ảnh ở mọi nội dung và nơi lưu trú trong hệ thống.',
  script: 'Một hình ảnh đẹp\nđi cùng nhiều hành trình ♡',
};
META['/admin/cai-dat'] = {
  title: 'Cài đặt hệ thống',
  subtitle: 'Cấu hình bằng biểu mẫu trực quan; thay đổi được lưu qua API vào PostgreSQL.',
  script: 'Cấu hình rõ ràng\nvận hành an tâm ♡',
};

export function pageMeta(pathname: string): AdminPageMeta {
  if (META[pathname]) return META[pathname];
  const sectionPath = pathname.split('/').slice(0, 3).join('/');
  if (META[sectionPath]) return META[sectionPath];
  return META['/admin'];
}
