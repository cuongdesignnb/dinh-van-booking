/** Title, subtitle, and hand-written note per admin route. */
export interface AdminPageMeta {
  title: string;
  subtitle: string;
  script: string;
}

const META: Record<string, AdminPageMeta> = {
  '/admin': {
    title: 'Tổng quan',
    subtitle: 'API tổng quan và báo cáo chưa được tích hợp; màn này không hiển thị số liệu mẫu.',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
  },
  '/admin/dat-phong': {
    title: 'Quản lý đặt phòng',
    subtitle: 'Chức năng đặt phòng quản trị đang chờ API nghiệp vụ; không có đơn mẫu để thao tác.',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
  },
  '/admin/phong-nghi': {
    title: 'Quản lý phòng nghỉ',
    subtitle: 'Quản lý hồ sơ nơi lưu trú, nội dung, ảnh và trạng thái xác minh.',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
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
    subtitle: 'Quản lý hồ sơ khách hàng đang chờ tích hợp API; hiện không có dữ liệu mẫu.',
    script: 'Làm du lịch\nbằng cả trái tim ♡',
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

const PENDING: Record<string, string> = {
  '/admin/khuyen-mai': 'Khuyến mãi',
  '/admin/thanh-toan': 'Thanh toán',
  '/admin/bao-cao': 'Báo cáo',
};

export function pageMeta(pathname: string): AdminPageMeta {
  if (META[pathname]) return META[pathname];
  const pending = PENDING[pathname];
  if (pending)
    return {
      title: pending,
      subtitle: 'Module này chưa nằm trong phạm vi đợt lập trình giao diện quản trị hiện tại.',
      script: 'Làm du lịch\nbằng cả trái tim ♡',
    };
  return META['/admin'];
}
