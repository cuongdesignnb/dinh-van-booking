'use client';

import { RefreshCw } from 'lucide-react';
import styles from './RuntimeErrorState.module.css';

/** This state must not depend on settings or the API that just failed. */
export function RuntimeErrorState() {
  return (
    <main className={styles.page}>
      <section className={styles.card} role="alert" aria-labelledby="runtime-error-title">
        <span className={styles.icon} aria-hidden="true"><RefreshCw size={28} strokeWidth={1.8} /></span>
        <p className={styles.eyebrow}>Kết nối tạm gián đoạn</p>
        <h1 id="runtime-error-title">Chưa thể tải trang này</h1>
        <p className={styles.description}>Dữ liệu đang không sẵn sàng. Vui lòng thử lại sau ít phút; nội dung chưa tải được sẽ không được thay bằng dữ liệu mẫu.</p>
        <button className={styles.retry} type="button" onClick={() => window.location.reload()}>
          <RefreshCw size={18} aria-hidden="true" /> Tải lại trang
        </button>
      </section>
    </main>
  );
}
