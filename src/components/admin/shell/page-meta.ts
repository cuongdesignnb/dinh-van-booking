/** Title, subtitle, search placeholder and hand-written note per admin route. */
export interface AdminPageMeta {
  title: string;
  subtitle: string;
  placeholder: string;
  script: string;
}

const META: Record<string, AdminPageMeta> = {
  '/admin': {
    title: 'Tổng quan',
    subtitle: 'Chào mừng bạn trở lại! Cùng xem tình hình kinh doanh hôm nay nhé.',
    placeholder: 'Tìm kiếm đặt phòng, khách hàng, phòng nghỉ…',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
  },
  '/admin/dat-phong': {
    title: 'Quản lý đặt phòng',
    subtitle: 'Quản lý, theo dõi và xử lý tất cả các đơn đặt phòng từ website, OTA và kênh trực tiếp.',
    placeholder: 'Tìm kiếm đặt phòng, khách hàng, số điện thoại…',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
  },
  '/admin/phong-nghi': {
    title: 'Quản lý phòng nghỉ',
    subtitle: 'Quản lý thông tin phòng nghỉ, loại phòng, giá bán và tình trạng hoạt động.',
    placeholder: 'Tìm kiếm đặt phòng, khách hàng, phòng nghỉ…',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
  },
  '/admin/combo-du-lich': {
    title: 'Quản lý combo du lịch',
    subtitle: 'Quản lý, thêm mới và theo dõi hiệu quả kinh doanh các combo du lịch.',
    placeholder: 'Tìm kiếm combo, điểm đến, tiêu đề…',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
  },
  '/admin/diem-den': {
    title: 'Quản lý điểm đến & nội dung',
    subtitle:
      'Quản lý điểm đến, bài viết và nội dung website. Cập nhật thông tin, hình ảnh và tối ưu SEO để thu hút nhiều du khách hơn.',
    placeholder: 'Tìm kiếm điểm đến, bài viết, từ khóa…',
    script: 'Lan tỏa vẻ đẹp\nNinh Bình đến muôn nơi! ♡',
  },
  '/admin/khach-hang': {
    title: 'Khách hàng & yêu cầu tư vấn',
    subtitle: 'Quản lý khách hàng, theo dõi yêu cầu tư vấn và chăm sóc khách hàng hiệu quả hơn mỗi ngày.',
    placeholder: 'Tìm kiếm khách hàng, số điện thoại, nhu cầu, tag…',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
  },
};

META['/admin/noi-dung'] = META['/admin/diem-den'];
META['/admin/chuyen-trang'] = {
  title: 'Chuyên trang',
  subtitle: 'Tạo trang chính sách, FAQ và nội dung tĩnh với URL riêng, SEO và trạng thái xuất bản.',
  placeholder: 'Tìm chuyên trang, chính sách, FAQ…',
  script: 'Nội dung rõ ràng\nniềm tin bền lâu ♡',
};
META['/admin/menu'] = {
  title: 'Quản lý menu website',
  subtitle: 'Sắp xếp liên kết đầu trang và thêm chuyên trang đã xuất bản vào menu chính.',
  placeholder: 'Tìm nội dung website…',
  script: 'Đường đi rõ ràng\ntrải nghiệm an yên ♡',
};
META['/admin/yeu-cau-tu-van'] = META['/admin/khach-hang'];
META['/admin/thu-vien-anh'] = {
  title: 'Thư viện ảnh',
  subtitle: 'Tải lên một lần, tái sử dụng ảnh ở mọi nội dung và nơi lưu trú trong hệ thống.',
  placeholder: 'Tìm ảnh, tên tệp, alt text…',
  script: 'Một hình ảnh đẹp\nđi cùng nhiều hành trình ♡',
};

const PENDING: Record<string, string> = {
  '/admin/khuyen-mai': 'Khuyến mãi',
  '/admin/thanh-toan': 'Thanh toán',
  '/admin/bao-cao': 'Báo cáo',
  '/admin/cai-dat': 'Cài đặt',
};

export function pageMeta(pathname: string): AdminPageMeta {
  if (META[pathname]) return META[pathname];
  const pending = PENDING[pathname];
  if (pending)
    return {
      title: pending,
      subtitle: 'Module này chưa nằm trong phạm vi đợt lập trình giao diện quản trị hiện tại.',
      placeholder: 'Tìm kiếm đặt phòng, khách hàng, phòng nghỉ…',
      script: 'Làm du lịch\nbằng cả trái tim ♡',
    };
  return META['/admin'];
}
