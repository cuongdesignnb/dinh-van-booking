'use client';

import { CheckCircle2, ImagePlus, LoaderCircle, Star, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ApiError, apiRequest } from '@/lib/api/client';
import { compressImage } from '@/lib/image-compress';

const MAX_PHOTOS = 5;
const BODY_MIN = 20;
const BODY_MAX = 2000;
const STAR_LABELS = ['Rất tệ', 'Chưa tốt', 'Bình thường', 'Tốt', 'Tuyệt vời'];

type Photo = { id: string; file: File; url: string };

function recentMonths(count = 24): Array<{ value: string; label: string }> {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return { value: `${date.getFullYear()}-${month}`, label: `Tháng ${month}/${date.getFullYear()}` };
  });
}

function newKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Guest review form: stars, name, phone, text, optional stay month and up to five photos. */
export function ReviewForm({ open, onClose, stayName, slug, source }: {
  open: boolean;
  onClose: () => void;
  stayName: string;
  slug: string;
  source: 'website' | 'invite';
}) {
  const uid = useId();
  const months = useMemo(() => recentMonths(), []);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [body, setBody] = useState('');
  const [stayedMonth, setStayedMonth] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const keyRef = useRef(newKey());
  const fileRef = useRef<HTMLInputElement>(null);

  // Release preview blobs only when the form goes away; removePhoto() handles single removals.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), []);

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setPhotoError(null);
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) { setPhotoError(`Tối đa ${MAX_PHOTOS} ảnh.`); return; }
    setPhotoBusy(true);
    const added: Photo[] = [];
    let skipped = 0;
    for (const file of [...files].slice(0, room)) {
      try {
        const compressed = await compressImage(file);
        added.push({ id: newKey(), file: compressed, url: URL.createObjectURL(compressed) });
      } catch {
        skipped += 1;
      }
    }
    setPhotos((current) => [...current, ...added]);
    if (files.length > room) setPhotoError(`Chỉ thêm được ${MAX_PHOTOS} ảnh cho mỗi đánh giá.`);
    else if (skipped) setPhotoError('Có ảnh chưa đọc được định dạng. Hãy chọn ảnh JPG, PNG hoặc WebP.');
    setPhotoBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removePhoto = (id: string) => {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((photo) => photo.id !== id);
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!rating) { setError('Hãy chọn số sao.'); return; }
    if (body.trim().length < BODY_MIN) { setError(`Nội dung cần ít nhất ${BODY_MIN} ký tự.`); return; }
    if (!consent) { setError('Hãy đồng ý cho hiển thị tên và đánh giá.'); return; }
    const form = new FormData();
    form.set('stay', slug);
    form.set('rating', String(rating));
    form.set('name', name);
    form.set('phone', phone);
    form.set('body', body);
    if (stayedMonth) form.set('stayedMonth', stayedMonth);
    form.set('source', source);
    form.set('consent', 'true');
    form.set('website', website);
    photos.forEach((photo) => form.append('photos', photo.file, photo.file.name));
    setBusy(true);
    try {
      await apiRequest('/reviews', { method: 'POST', body: form, headers: { 'idempotency-key': keyRef.current } }, { quiet: true });
      setDone(true);
      keyRef.current = newKey();
    } catch (failure) {
      setError(failure instanceof ApiError
        ? failure.status === 429 ? 'Bạn gửi hơi nhiều lần, vui lòng thử lại sau ít phút.' : failure.message
        : 'Chưa gửi được, vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    onClose();
    if (done) {
      setDone(false); setRating(0); setBody(''); setStayedMonth(''); setConsent(false);
      setPhotos((current) => { current.forEach((photo) => URL.revokeObjectURL(photo.url)); return []; });
    }
  };

  const shown = hover || rating;
  return (
    <Modal open={open} onClose={close} labelledBy={`${uid}-t`} size="md" className="dialog--review">
      {done ? (
        <div className="rform__done" role="status">
          <CheckCircle2 size={44} aria-hidden="true" />
          <h2 id={`${uid}-t`} className="dialog__title">Cảm ơn bạn đã đánh giá!</h2>
          <p>Đánh giá của bạn về {stayName} sẽ hiển thị sau khi được kiểm duyệt.</p>
          <button type="button" className="btn btn--primary" onClick={close}>Đóng</button>
        </div>
      ) : (
        <form className="rform" onSubmit={submit} noValidate>
          <h2 id={`${uid}-t`} className="dialog__title">Đánh giá {stayName}</h2>
          <p className="rform__lead">Chia sẻ trải nghiệm thật của bạn để những khách sau chọn chỗ nghỉ phù hợp hơn.</p>

          <fieldset className="rform__stars" onMouseLeave={() => setHover(0)}>
            <legend>Bạn chấm mấy sao? <span aria-hidden="true">*</span></legend>
            <div className="rform__star-row">
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className="rform__star" data-on={value <= shown || undefined} onMouseEnter={() => setHover(value)}>
                  <input type="radio" name={`${uid}-rating`} value={value} checked={rating === value} onChange={() => setRating(value)} className="sr-only" />
                  <Star size={30} aria-hidden="true" />
                  <span className="sr-only">{value} sao — {STAR_LABELS[value - 1]}</span>
                </label>
              ))}
              <span className="rform__star-label" aria-hidden="true">{shown ? STAR_LABELS[shown - 1] : ''}</span>
            </div>
          </fieldset>

          <div className="rform__row">
            <label className="rform__field">
              <span>Họ và tên <span aria-hidden="true">*</span></span>
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={60} required />
            </label>
            <label className="rform__field">
              <span>Số điện thoại <span aria-hidden="true">*</span></span>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" maxLength={20} required />
              <small>Chỉ dùng để xác minh, không hiển thị công khai.</small>
            </label>
          </div>

          <label className="rform__field">
            <span>Trải nghiệm của bạn <span aria-hidden="true">*</span></span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} maxLength={BODY_MAX} required placeholder="Phòng, không gian, dịch vụ, ăn uống… điều gì bạn thích hoặc chưa hài lòng?" />
            <small>{body.trim().length < BODY_MIN ? `Tối thiểu ${BODY_MIN} ký tự` : `${body.length}/${BODY_MAX}`}</small>
          </label>

          <label className="rform__field rform__field--narrow">
            <span>Thời gian lưu trú</span>
            <select value={stayedMonth} onChange={(event) => setStayedMonth(event.target.value)}>
              <option value="">Không ghi</option>
              {months.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
            </select>
          </label>

          <div className="rform__photos">
            <span className="rform__label">Ảnh ({photos.length}/{MAX_PHOTOS})</span>
            <ul>
              {photos.map((photo, index) => (
                <li key={photo.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a blob URL */}
                  <img src={photo.url} alt={`Ảnh ${index + 1} sắp gửi`} />
                  <button type="button" onClick={() => removePhoto(photo.id)} aria-label={`Bỏ ảnh ${index + 1}`}><X size={14} aria-hidden="true" /></button>
                </li>
              ))}
              {photos.length < MAX_PHOTOS && (
                <li>
                  <label className="rform__add">
                    {photoBusy ? <LoaderCircle size={22} className="rform__spin" aria-hidden="true" /> : <ImagePlus size={22} aria-hidden="true" />}
                    <span>{photoBusy ? 'Đang xử lý' : 'Thêm ảnh'}</span>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => void addPhotos(event.target.files)} disabled={photoBusy} />
                  </label>
                </li>
              )}
            </ul>
            {photoError && <p className="rform__hint rform__hint--error">{photoError}</p>}
          </div>

          {/* Honeypot: hidden from people, filled by naive bots. */}
          <div className="rform__trap" aria-hidden="true">
            <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} name="website" /></label>
          </div>

          <label className="rform__consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>Tôi đồng ý hiển thị tên và nội dung đánh giá trên website. Số điện thoại chỉ dùng để xác minh, không hiển thị.</span>
          </label>

          {error && <p className="rform__hint rform__hint--error" role="alert">{error}</p>}
          <div className="rform__actions">
            <button type="button" className="btn btn--light" onClick={close}>Huỷ</button>
            <button type="submit" className="btn btn--primary" disabled={busy || photoBusy}>
              {busy ? <><LoaderCircle size={16} className="rform__spin" aria-hidden="true" /> Đang gửi…</> : 'Gửi đánh giá'}
            </button>
          </div>
          <p className="rform__note">Đánh giá được kiểm duyệt trước khi hiển thị.</p>
        </form>
      )}
    </Modal>
  );
}
