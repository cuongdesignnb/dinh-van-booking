'use client';

import {
  CircleAlert,
  Copy,
  Eye,
  FileText,
  Images,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DEST_CATEGORY_LABEL, PUBLISHING, formatDate, num, searchKey } from '@/lib/admin/formatters';
import { contentStats, seoChecklist } from '@/lib/admin/selectors';
import type { AdminDestination, Article } from '@/lib/admin/types';
import { useAdmin } from '../AdminStore';
import { ConfirmDialog, EmptyState, Panel, RowMenu, StatCard, StatusBadge } from '../shared/ui';
import { DestinationEditor } from './DestinationEditor';
import { MediaLibrary } from './MediaLibrary';

const TABS = [
  { id: 'destinations', label: 'Điểm đến', icon: MapPin },
  { id: 'articles', label: 'Bài viết', icon: FileText },
  { id: 'seo', label: 'SEO & nội dung', icon: Search },
  { id: 'media', label: 'Thư viện ảnh', icon: Images },
] as const;

export type ContentTab = (typeof TABS)[number]['id'];

export function ContentScreen({ defaultTab = 'destinations' }: { defaultTab?: ContentTab }) {
  const { data, commit, busy } = useAdmin();
  const params = useSearchParams();
  const pathname = usePathname();

  const tab = (params.get('tab') as ContentTab) ?? defaultTab;
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? 'all';
  const publication = params.get('pub') ?? 'all';
  const selectedId = params.get('selected');
  const [checked, setChecked] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AdminDestination | null>(null);
  const [preview, setPreview] = useState<AdminDestination | null>(null);
  const [creating, setCreating] = useState(false);

  const stats = contentStats(data);

  const setQuery = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || v === 'all') next.delete(k);
      else next.set(k, v);
    }
    window.history.pushState(null, '', `${pathname}?${next.toString()}`);
  };

  const destinations = useMemo(() => {
    const key = searchKey(q);
    return data.destinations.filter((d) => {
      if (category !== 'all' && d.category !== category) return false;
      if (publication !== 'all' && d.publication !== publication) return false;
      if (key && !searchKey(`${d.name} ${d.shortDescription}`).includes(key)) return false;
      return true;
    });
  }, [data.destinations, q, category, publication]);

  const selected = data.destinations.find((d) => d.id === selectedId) ?? destinations[0] ?? data.destinations[0];
  const missingSeo = [
    ...data.destinations
      .filter((d) => !d.seo.description || !d.seo.ogImage || !d.shortDescription)
      .map((d) => ({ id: d.id, kind: 'Điểm đến', name: d.name, missing: [!d.seo.description && 'meta description', !d.seo.ogImage && 'ảnh chia sẻ', !d.shortDescription && 'mô tả ngắn'].filter(Boolean).join(', ') })),
    ...data.articles
      .filter((a) => !a.seo.description)
      .map((a) => ({ id: a.id, kind: 'Bài viết', name: a.title, missing: 'meta description' })),
  ];

  return (
    <div className="ct">
      <nav className="ct__tabs" aria-label="Nhóm nội dung">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? 'is-active' : undefined}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setQuery({ tab: t.id })}
            >
              <Icon size={15} aria-hidden="true" /> {t.label}
            </button>
          );
        })}
      </nav>

      <section className="kpis kpis--5" aria-label="Chỉ số nội dung">
        <StatCard icon={<MapPin size={22} aria-hidden="true" />} tone="mint" label="Số điểm đến đang hiển thị" value={stats.publishedDestinations} caption={`Trên tổng ${stats.destinations} điểm đến`} />
        <StatCard icon={<FileText size={22} aria-hidden="true" />} tone="green" label="Bài viết đã xuất bản" value={stats.publishedArticles} caption={`Tổng ${stats.articles} bài viết`} />
        <StatCard icon={<Images size={22} aria-hidden="true" />} tone="cream" label="Tệp media (ảnh)" value={stats.media} caption={`Dung lượng ${(stats.mediaBytes / 1_000_000).toFixed(1)} MB`} />
        <StatCard icon={<CircleAlert size={22} aria-hidden="true" />} tone="rose" label="Trang cần bổ sung" value={stats.needSeo} caption="Thiếu trường theo checklist nội bộ" />
        <StatCard icon={<Eye size={22} aria-hidden="true" />} tone="sky" label="Lượt xem nội dung" value={num(stats.views)} caption="Số mẫu, chưa gắn analytics" />
      </section>

      {tab === 'destinations' && (
        <div className="ct__grid">
          <div className="ct__left">
            <Panel
              icon={<MapPin size={18} aria-hidden="true" />}
              title="Danh sách điểm đến"
              action={
                <div className="ct__list-tools">
                  <span className="bk__search ct__search">
                    <Search size={14} aria-hidden="true" />
                    <input className="ainput" value={q} placeholder="Tìm kiếm điểm đến…" onChange={(e) => setQuery({ q: e.target.value })} aria-label="Tìm kiếm điểm đến" />
                  </span>
                  <select className="ainput ct__select" value={category} onChange={(e) => setQuery({ category: e.target.value })} aria-label="Lọc theo danh mục">
                    <option value="all">Tất cả danh mục</option>
                    {Object.entries(DEST_CATEGORY_LABEL).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select className="ainput ct__select" value={publication} onChange={(e) => setQuery({ pub: e.target.value })} aria-label="Lọc theo trạng thái">
                    <option value="all">Tất cả trạng thái</option>
                    <option value="published">Đang hiển thị</option>
                    <option value="draft">Bản nháp</option>
                    <option value="hidden">Tạm ẩn</option>
                  </select>
                  <button type="button" className="abtn abtn--primary abtn--sm" onClick={() => setCreating(true)}>
                    <Plus size={14} aria-hidden="true" /> Thêm điểm đến
                  </button>
                </div>
              }
            >
              <div className="tscroll">
                <table className="atable atable--compact ct__table">
                  <thead>
                    <tr>
                      <th scope="col" className="bk__check">
                        <span className="sr-only">Chọn</span>
                      </th>
                      <th scope="col">Hình ảnh</th>
                      <th scope="col">Tên điểm đến</th>
                      <th scope="col">Danh mục</th>
                      <th scope="col">Mô tả ngắn</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Cập nhật</th>
                      <th scope="col">SEO</th>
                      <th scope="col">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {destinations.map((d) => {
                      const list = seoChecklist({ ...d, image: d.image });
                      const ok = list.filter((i) => i.ok).length;
                      return (
                        <tr key={d.id} className={`is-clickable${selected?.id === d.id ? ' is-selected' : ''}`} onClick={() => setQuery({ selected: d.id })}>
                          <td className="bk__check" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checked.includes(d.id)}
                              onChange={(e) => setChecked((c) => (e.target.checked ? [...c, d.id] : c.filter((x) => x !== d.id)))}
                              aria-label={`Chọn ${d.name}`}
                            />
                          </td>
                          <td>
                            <Image src={d.image} alt="" width={52} height={36} className="ct__thumb" />
                          </td>
                          <td>{d.name}</td>
                          <td>
                            <span className="ct__cat">{DEST_CATEGORY_LABEL[d.category]}</span>
                          </td>
                          <td className="atable__ellipsis">{d.shortDescription}</td>
                          <td>
                            <StatusBadge label={PUBLISHING[d.publication].label} tone={PUBLISHING[d.publication].tone} small />
                          </td>
                          <td className="numeric">{formatDate(d.updatedAt)}</td>
                          <td>
                            <StatusBadge
                              label={ok === list.length ? 'Đủ trường' : `Thiếu ${list.length - ok}`}
                              tone={ok === list.length ? 'success' : 'warning'}
                              small
                            />
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="ct__row-actions">
                              <button type="button" className="icon-btn icon-btn--sm" aria-label={`Sửa ${d.name}`} onClick={() => setQuery({ selected: d.id })}>
                                <Pencil size={14} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="icon-btn icon-btn--sm"
                                aria-label={`Nhân bản ${d.name}`}
                                onClick={() =>
                                  commit(
                                    'dup-dest',
                                    (draft) => {
                                      const src = draft.destinations.find((x) => x.id === d.id);
                                      if (!src) return 'Không tìm thấy điểm đến.';
                                      draft.destinations.unshift({
                                        ...structuredClone(src),
                                        id: `${src.id}-ban-sao-${Date.now().toString(36)}`,
                                        slug: `${src.slug}-ban-sao`,
                                        name: `${src.name} (bản sao)`,
                                        publication: 'draft',
                                      });
                                    },
                                    'Đã tạo bản nháp nhân bản',
                                  )
                                }
                              >
                                <Copy size={14} aria-hidden="true" />
                              </button>
                              <RowMenu
                                label={`Thao tác cho ${d.name}`}
                                items={[
                                  { label: 'Xem trước bản nháp', onSelect: () => setPreview(d) },
                                  {
                                    label: d.publication === 'published' ? 'Tạm ẩn' : 'Xuất bản',
                                    onSelect: () =>
                                      commit(
                                        'pub-dest',
                                        (draft) => {
                                          const t = draft.destinations.find((x) => x.id === d.id);
                                          if (!t) return 'Không tìm thấy điểm đến.';
                                          t.publication = t.publication === 'published' ? 'hidden' : 'published';
                                          t.updatedAt = formatDate(t.updatedAt) ? t.updatedAt : t.updatedAt;
                                        },
                                        'Đã đổi trạng thái hiển thị trong bản demo',
                                      ),
                                  },
                                  { label: 'Xóa', tone: 'danger', onSelect: () => setDeleteTarget(d) },
                                ]}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!destinations.length && <EmptyState title="Không có điểm đến nào khớp bộ lọc." />}
              {checked.length > 0 && <p className="ct__bulk">Đã chọn {checked.length} mục (chọn để thao tác hàng loạt, chưa áp dụng cho toàn bộ dữ liệu).</p>}
            </Panel>

            <Panel
              icon={<Images size={17} aria-hidden="true" />}
              title="Thư viện ảnh liên quan"
              action={
                <button type="button" className="alink" onClick={() => setQuery({ tab: 'media' })}>
                  Xem tất cả
                </button>
              }
            >
              <ul className="ct__strip">
                {data.media.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    <Image src={m.url} alt={m.alt} width={150} height={96} />
                  </li>
                ))}
                <li>
                  <button type="button" className="ct__strip-add" onClick={() => setQuery({ tab: 'media' })}>
                    <Plus size={18} aria-hidden="true" />
                    Thêm ảnh
                  </button>
                </li>
              </ul>
            </Panel>
          </div>

          <DestinationEditor destination={selected} onSelect={(id) => setQuery({ selected: id })} onPreview={(d) => setPreview(d)} />
        </div>
      )}

      {tab === 'articles' && <ArticlesTab />}

      {tab === 'seo' && (
        <Panel icon={<Search size={18} aria-hidden="true" />} title={`Nội dung cần bổ sung (${missingSeo.length})`}>
          <div className="tscroll">
            <table className="atable atable--compact">
              <thead>
                <tr>
                  <th scope="col">Loại nội dung</th>
                  <th scope="col">Tên</th>
                  <th scope="col">Trường còn thiếu</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {missingSeo.map((row) => (
                  <tr key={`${row.kind}-${row.id}`}>
                    <td>{row.kind}</td>
                    <td>{row.name}</td>
                    <td>{row.missing}</td>
                    <td>
                      <button
                        type="button"
                        className="abtn abtn--ghost abtn--sm"
                        onClick={() => setQuery({ tab: row.kind === 'Điểm đến' ? 'destinations' : 'articles', selected: row.id, etab: 'seo' })}
                      >
                        Mở trình soạn thảo
                      </button>
                    </td>
                  </tr>
                ))}
                {!missingSeo.length && (
                  <tr>
                    <td colSpan={4}>Tất cả nội dung đã đủ trường theo checklist nội bộ.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="ahint">
            Checklist nội bộ dựa trên dữ liệu thật trong hệ thống; đây không phải điểm xếp hạng của Google và không kết nối
            Search Console.
          </p>
        </Panel>
      )}

      {tab === 'media' && <MediaLibrary />}

      <DestinationEditor
        destination={creating ? null : undefined}
        creating={creating}
        onSelect={(id) => {
          setCreating(false);
          setQuery({ selected: id });
        }}
        onClose={() => setCreating(false)}
        onPreview={(d) => setPreview(d)}
        asDrawer
      />

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} labelledBy="ct-preview" className="dialog--admin" size="lg">
        <h2 id="ct-preview" className="dialog__title">
          Xem trước bản nháp: {preview?.name}
        </h2>
        <p className="adialog__note">Bản xem trước dựng từ dữ liệu nháp, chưa xuất bản lên website thật.</p>
        {preview && (
          <article className="ct__preview">
            <Image src={preview.image} alt={preview.name} width={640} height={280} />
            <h3>{preview.name}</h3>
            <p>{preview.shortDescription}</p>
            <p>{preview.content}</p>
          </article>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        busy={busy === 'del-dest'}
        tone="danger"
        title="Xóa điểm đến"
        confirmLabel="Xóa"
        onConfirm={async () => {
          const target = deleteTarget;
          if (!target) return;
          await commit(
            'del-dest',
            (draft) => {
              const used = draft.combos.filter((c) => c.destinationIds.includes(target.id));
              if (used.length) return `Điểm đến đang được dùng trong ${used.length} combo, hãy gỡ liên kết trước.`;
              draft.destinations = draft.destinations.filter((d) => d.id !== target.id);
            },
            'Đã xóa điểm đến khỏi bản demo',
          );
          setDeleteTarget(null);
        }}
      >
        <p>Xóa “{deleteTarget?.name}” khỏi dữ liệu mẫu?</p>
        <p className="adialog__note">Hệ thống kiểm tra liên kết với combo trước khi xóa.</p>
      </ConfirmDialog>
    </div>
  );
}

function ArticlesTab() {
  const { data, commit } = useAdmin();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Article | null>(null);
  const list = data.articles.filter((a) => !q || searchKey(`${a.title} ${a.category}`).includes(searchKey(q)));

  return (
    <div className="ct__grid">
      <Panel
        icon={<FileText size={18} aria-hidden="true" />}
        title={`Bài viết (${list.length})`}
        action={
          <span className="bk__search ct__search">
            <Search size={14} aria-hidden="true" />
            <input className="ainput" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm bài viết…" aria-label="Tìm bài viết" />
          </span>
        }
      >
        <div className="tscroll">
          <table className="atable atable--compact">
            <thead>
              <tr>
                <th scope="col">Ảnh</th>
                <th scope="col">Tiêu đề</th>
                <th scope="col">Danh mục</th>
                <th scope="col">Tác giả</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Cập nhật</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id} className="is-clickable" onClick={() => setSelected(a)}>
                  <td>
                    <Image src={a.cover} alt="" width={48} height={32} className="ct__thumb" />
                  </td>
                  <td>{a.title}</td>
                  <td>{a.category}</td>
                  <td>{a.author}</td>
                  <td>
                    <StatusBadge label={PUBLISHING[a.publication].label} tone={PUBLISHING[a.publication].tone} small />
                  </td>
                  <td className="numeric">{formatDate(a.updatedAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <RowMenu
                      label={`Thao tác cho ${a.title}`}
                      items={[
                        { label: 'Mở trình soạn thảo', onSelect: () => setSelected(a) },
                        {
                          label: a.publication === 'published' ? 'Chuyển về nháp' : 'Xuất bản',
                          onSelect: () =>
                            commit(
                              'pub-article',
                              (draft) => {
                                const t = draft.articles.find((x) => x.id === a.id);
                                if (!t) return 'Không tìm thấy bài viết.';
                                t.publication = t.publication === 'published' ? 'draft' : 'published';
                              },
                              'Đã đổi trạng thái bài viết trong bản demo',
                            ),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={selected ? `Soạn thảo: ${selected.title}` : 'Trình soạn thảo bài viết'}>
        {selected ? (
          <ArticleEditor article={selected} onClose={() => setSelected(null)} />
        ) : (
          <EmptyState title="Chọn một bài viết để chỉnh sửa." text="Trình soạn thảo dùng chung với điểm đến." />
        )}
      </Panel>
    </div>
  );
}

function ArticleEditor({ article, onClose }: { article: Article; onClose: () => void }) {
  const { commit, busy } = useAdmin();
  const [form, setForm] = useState({ title: article.title, excerpt: article.excerpt, content: article.content, seo: article.seo.description });
  const [dirty, setDirty] = useState(false);

  return (
    <div className="ct__article">
      <label className="afield">
        <span>Tiêu đề</span>
        <input
          className="ainput"
          value={form.title}
          onChange={(e) => {
            setForm({ ...form, title: e.target.value });
            setDirty(true);
          }}
        />
      </label>
      <label className="afield">
        <span>Mô tả ngắn</span>
        <textarea
          className="ainput"
          rows={2}
          value={form.excerpt}
          onChange={(e) => {
            setForm({ ...form, excerpt: e.target.value });
            setDirty(true);
          }}
        />
      </label>
      <label className="afield">
        <span>Nội dung</span>
        <textarea
          className="ainput"
          rows={8}
          value={form.content}
          onChange={(e) => {
            setForm({ ...form, content: e.target.value });
            setDirty(true);
          }}
        />
      </label>
      <label className="afield">
        <span>Meta description</span>
        <textarea
          className="ainput"
          rows={2}
          maxLength={160}
          value={form.seo}
          onChange={(e) => {
            setForm({ ...form, seo: e.target.value });
            setDirty(true);
          }}
        />
        <span className="ahint">{form.seo.length}/160 ký tự</span>
      </label>
      <div className="adialog__actions">
        <button type="button" className="abtn abtn--ghost" onClick={onClose}>
          Đóng
        </button>
        <button
          type="button"
          className="abtn abtn--primary"
          disabled={!dirty || busy === 'save-article'}
          onClick={async () => {
            const err = await commit(
              'save-article',
              (draft) => {
                const a = draft.articles.find((x) => x.id === article.id);
                if (!a) return 'Không tìm thấy bài viết.';
                a.title = form.title;
                a.excerpt = form.excerpt;
                a.content = form.content;
                a.seo.description = form.seo;
              },
              'Đã lưu bài viết trong bản demo',
            );
            if (!err) setDirty(false);
          }}
        >
          Lưu thay đổi
        </button>
      </div>
    </div>
  );
}

export { X, Trash2 };
