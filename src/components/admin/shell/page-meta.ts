/** Title, subtitle and breadcrumb section per admin route. */
export interface AdminPageMeta {
  title: string;
  subtitle: string;
  section?: string;
}

const META: Record<string, AdminPageMeta> = {
  '/admin': {
    title: 'Tổng quan',
    subtitle: 'Tình hình đặt phòng, tư vấn, quỹ phòng và hoạt động gần đây.',
  },
  '/admin/dat-phong': {
    section: 'Vận hành',
    title: 'Đặt phòng',
    subtitle: 'Tra cứu đơn, tạo yêu cầu giữ chỗ, xác nhận hoặc huỷ và xem lịch sử xử lý.',
  },
  '/admin/phong-nghi': {
    section: 'Sản phẩm',
    title: 'Nơi lưu trú',
    subtitle: 'Mỗi khu nghỉ, khách sạn hay homestay có hồ sơ riêng; hạng phòng được quản lý bên trong từng cơ sở.',
  },
  '/admin/hang-phong': {
    section: 'Sản phẩm',
    title: 'Hạng phòng',
    subtitle: 'Hạng phòng theo nơi lưu trú: giá, sức chứa, số phòng và album ảnh.',
  },
  '/admin/ton-phong': {
    section: 'Vận hành',
    title: 'Quỹ phòng',
    subtitle: 'Xem và cập nhật số phòng còn bán theo từng hạng phòng, từng ngày.',
  },
  '/admin/combo-du-lich': {
    section: 'Sản phẩm',
    title: 'Combo du lịch',
    subtitle: 'Nội dung, lịch trình và trạng thái xuất bản của combo.',
  },
  '/admin/diem-den': {
    section: 'Sản phẩm',
    title: 'Điểm đến',
    subtitle: 'Hồ sơ điểm đến, hình ảnh và trạng thái xuất bản trên website.',
  },
  '/admin/noi-dung': {
    section: 'Website',
    title: 'Nội dung website',
    subtitle: 'Soạn, sửa, lưu phiên bản và xuất bản bài viết.',
  },
  '/admin/khach-hang': {
    section: 'Khách hàng',
    title: 'Khách hàng',
    subtitle: 'Hồ sơ khách, lịch sử trao đổi và lịch chăm sóc tiếp theo.',
  },
  '/admin/khuyen-mai': {
    section: 'Khách hàng',
    title: 'Khuyến mãi',
    subtitle: 'Tạo, chỉnh sửa và bật/tắt mã giảm giá; lượt dùng được kiểm soát ở máy chủ.',
  },
  '/admin/thanh-toan': {
    section: 'Khách hàng',
    title: 'Thanh toán',
    subtitle: 'Ghi nhận thanh toán và hoàn tiền thủ công; không kết nối cổng thanh toán.',
  },
  '/admin/bao-cao': {
    section: 'Hệ thống',
    title: 'Báo cáo',
    subtitle: 'Đối soát đặt phòng, tiền đã ghi nhận, hoàn tiền, yêu cầu tư vấn và quỹ phòng theo kỳ.',
  },
  '/admin/chuyen-trang': {
    section: 'Website',
    title: 'Chuyên trang',
    subtitle: 'Trang chính sách, FAQ và nội dung tĩnh với đường dẫn riêng, SEO và trạng thái xuất bản.',
  },
  '/admin/menu': {
    section: 'Website',
    title: 'Menu website',
    subtitle: 'Sắp xếp liên kết đầu trang và thêm chuyên trang đã xuất bản vào menu chính.',
  },
  '/admin/yeu-cau-tu-van': {
    section: 'Khách hàng',
    title: 'Yêu cầu tư vấn',
    subtitle: 'Yêu cầu khách gửi từ website; mọi thay đổi trạng thái đều được ghi lại.',
  },
  '/admin/thu-vien-anh': {
    section: 'Website',
    title: 'Thư viện ảnh',
    subtitle: 'Tải lên một lần, dùng lại ảnh ở mọi nội dung và nơi lưu trú.',
  },
  '/admin/doi-tac': {
    section: 'Vận hành',
    title: 'Đối tác & đồng bộ',
    subtitle: 'Duyệt hồ sơ đối tác, phân quyền theo cơ sở và theo dõi đồng bộ bảng tính.',
  },
  '/admin/doi-tac/cap-quyen': {
    section: 'Đối tác & đồng bộ',
    title: 'Phân quyền cho đối tác',
    subtitle: 'Chọn người, cơ sở, phạm vi và mức quyền. Không tạo tài khoản mới, không nhân bản cơ sở.',
  },
  '/admin/cai-dat': {
    section: 'Hệ thống',
    title: 'Cài đặt',
    subtitle: 'Thông tin thương hiệu, liên hệ, SEO và nội dung trang; lưu trực tiếp vào hệ thống.',
  },
};

export function pageMeta(pathname: string): AdminPageMeta {
  if (META[pathname]) return META[pathname];
  const sectionPath = pathname.split('/').slice(0, 3).join('/');
  if (META[sectionPath]) return META[sectionPath];
  return META['/admin'];
}
