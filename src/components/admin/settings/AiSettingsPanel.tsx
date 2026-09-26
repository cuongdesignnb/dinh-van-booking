'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, RefreshCw, Save, Sparkles } from 'lucide-react';
import { ApiError, apiRequest } from '@/lib/api/client';

interface ProviderView {
  baseUrl: string;
  model: string;
  keyConfigured: boolean;
  maskedKey: string | null;
  keySource: 'database' | 'environment' | 'none';
  wire?: 'responses' | 'chat_completions';
  maxOutputTokens?: number;
  imageSize?: string;
  imageQuality?: string;
}

interface AiSettingsPayload {
  version: number;
  content: ProviderView;
  image: ProviderView;
  encryption: 'dedicated_key' | 'session_secret';
}

interface ProviderForm extends ProviderView {
  apiKey: string;
  clearApiKey: boolean;
}

function providerForm(provider: ProviderView): ProviderForm {
  return { ...provider, apiKey: '', clearApiKey: false };
}

function keyStatus(provider: ProviderForm): string {
  if (provider.clearApiKey) return provider.keySource === 'environment' ? 'Key trong CSDL sẽ xoá; máy chủ vẫn dùng key môi trường.' : 'Key đã lưu sẽ bị xoá khi lưu.';
  if (provider.apiKey) return 'Key mới sẽ được mã hoá khi lưu.';
  if (provider.keySource === 'database') return `Đang dùng key đã mã hoá: ${provider.maskedKey ?? '••••••••'}`;
  if (provider.keySource === 'environment') return 'Đang dùng key do máy chủ cấu hình.';
  return 'Chưa cấu hình API key.';
}

export function AiSettingsPanel() {
  const [payload, setPayload] = useState<AiSettingsPayload | null>(null);
  const [content, setContent] = useState<ProviderForm | null>(null);
  const [image, setImage] = useState<ProviderForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [showContentKey, setShowContentKey] = useState(false);
  const [showImageKey, setShowImageKey] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setMessage(null);
    try {
      const next = await apiRequest<AiSettingsPayload>('/ai/settings');
      setPayload(next);
      setContent(providerForm(next.content));
      setImage(providerForm(next.image));
    } catch (reason) {
      setMessage({ tone: 'error', text: reason instanceof Error ? reason.message : 'Không tải được cài đặt AI.' });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!payload || !content || !image) return;
    setBusy(true);
    setMessage(null);
    try {
      const next = await apiRequest<AiSettingsPayload>('/ai/settings', {
        method: 'PUT',
        body: JSON.stringify({
          expectedVersion: payload.version,
          content: {
            baseUrl: content.baseUrl,
            model: content.model,
            wire: content.wire,
            maxOutputTokens: content.maxOutputTokens,
            apiKey: content.apiKey,
            clearApiKey: content.clearApiKey,
          },
          image: {
            baseUrl: image.baseUrl,
            model: image.model,
            imageSize: image.imageSize,
            imageQuality: image.imageQuality,
            apiKey: image.apiKey,
            clearApiKey: image.clearApiKey,
          },
        }),
      });
      setPayload(next);
      setContent(providerForm(next.content));
      setImage(providerForm(next.image));
      setMessage({ tone: 'success', text: 'Đã lưu cấu hình AI. API key được giữ ở máy chủ và không hiển thị lại.' });
    } catch (reason) {
      const conflict = reason instanceof ApiError && reason.status === 409;
      setMessage({ tone: 'error', text: conflict ? 'Cài đặt AI vừa được thay đổi ở nơi khác. Hãy tải lại trước khi lưu.' : reason instanceof Error ? reason.message : 'Không lưu được cấu hình AI.' });
      if (conflict) await load();
    } finally {
      setBusy(false);
    }
  };

  if (!content || !image) return (
    <section className="acard ai-settings">
      {message ? <p className={`settings-screen__message settings-screen__message--${message.tone}`}>{message.text}</p> : <p className="ahint">Đang tải cấu hình AI…</p>}
      <button type="button" className="abtn abtn--ghost" onClick={() => void load()}><RefreshCw size={15} aria-hidden="true" /> Tải lại</button>
    </section>
  );

  return (
    <section className="acard ai-settings">
      <div className="ai-settings__head">
        <div className="ai-settings__title-icon"><Sparkles size={20} aria-hidden="true" /></div>
        <div>
          <h3>AI viết nội dung và tạo ảnh</h3>
          <p className="ahint">Cấu hình hai nhà cung cấp độc lập. API key chỉ gửi tới backend, được mã hoá khi lưu và không trả lại cho trình duyệt.</p>
        </div>
        <button type="button" className="abtn abtn--ghost" onClick={() => void load()} disabled={busy}><RefreshCw size={15} aria-hidden="true" /> Tải lại</button>
      </div>

      {message && <p className={`settings-screen__message settings-screen__message--${message.tone}`} role={message.tone === 'error' ? 'alert' : 'status'}>{message.text}</p>}

      <div className="ai-settings__providers">
        <ProviderFields
          title="AI viết nội dung"
          description="Sinh bài viết, chuyên trang, mô tả lưu trú, combo và điểm đến; kết quả luôn ở trạng thái xem trước."
          form={content}
          showKey={showContentKey}
          setShowKey={setShowContentKey}
          onChange={setContent}
          disabled={busy}
          kind="content"
        />
        <ProviderFields
          title="AI tạo ảnh"
          description="Ảnh được chuẩn hoá sang WebP và đưa vào Media Library; ALT và chú thích được lưu cùng ảnh."
          form={image}
          showKey={showImageKey}
          setShowKey={setShowImageKey}
          onChange={setImage}
          disabled={busy}
          kind="image"
        />
      </div>

      <p className="ai-settings__security"><KeyRound size={15} aria-hidden="true" /> Mã hoá key: {payload?.encryption === 'dedicated_key' ? 'khoá riêng của máy chủ' : 'SESSION_SECRET của máy chủ'}. Giữ bí mật và ổn định khoá mã hoá để giải mã cấu hình đã lưu.</p>
      <div className="ai-settings__footer">
        <span className="ahint">Key trống nghĩa là giữ nguyên key hiện có. Key môi trường chỉ dùng làm dự phòng.</span>
        <button type="button" className="abtn abtn--primary" onClick={() => void save()} disabled={busy}>
          <Save size={15} aria-hidden="true" /> {busy ? 'Đang lưu…' : 'Lưu cấu hình AI'}
        </button>
      </div>
    </section>
  );
}

function ProviderFields({
  title,
  description,
  form,
  showKey,
  setShowKey,
  onChange,
  disabled,
  kind,
}: {
  title: string;
  description: string;
  form: ProviderForm;
  showKey: boolean;
  setShowKey: (show: boolean) => void;
  onChange: (next: ProviderForm) => void;
  disabled: boolean;
  kind: 'content' | 'image';
}) {
  const update = <K extends keyof ProviderForm>(key: K, value: ProviderForm[K]) => onChange({ ...form, [key]: value });
  return (
    <article className="ai-provider">
      <div className="ai-provider__head"><div><h4>{title}</h4><p className="ahint">{description}</p></div><span className={`ai-provider__status${form.keyConfigured ? ' is-ready' : ''}`}>{form.keyConfigured ? 'Đã cấu hình key' : 'Thiếu key'}</span></div>
      <div className="ai-provider__grid">
        <label className="afield ai-provider__wide">
          <span>Base URL (HTTPS) *</span>
          <input className="ainput" type="url" value={form.baseUrl} onChange={(event) => update('baseUrl', event.target.value)} disabled={disabled} placeholder="https://api.openai.com/v1" />
        </label>
        <label className="afield ai-provider__wide">
          <span>Model *</span>
          <input className="ainput" value={form.model} onChange={(event) => update('model', event.target.value)} disabled={disabled} placeholder={kind === 'content' ? 'Ví dụ: model hỗ trợ JSON Schema' : 'Ví dụ: model tạo ảnh của nhà cung cấp'} />
        </label>
        <label className="afield ai-provider__wide">
          <span>API key mới</span>
          <span className="ai-provider__secret">
            <input className="ainput" type={showKey ? 'text' : 'password'} autoComplete="new-password" value={form.apiKey} onChange={(event) => update('apiKey', event.target.value)} disabled={disabled} placeholder={form.keyConfigured ? 'Để trống để giữ nguyên key' : 'Dán API key tại đây'} />
            <button type="button" className="abtn abtn--ghost" onClick={() => setShowKey(!showKey)} aria-label={showKey ? 'Ẩn API key' : 'Hiện API key'}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </span>
          <span className="ahint">{keyStatus(form)}</span>
        </label>
        {kind === 'content' ? <>
          <label className="afield">
            <span>Kiểu API</span>
            <select className="ainput" value={form.wire ?? 'responses'} onChange={(event) => update('wire', event.target.value as ProviderForm['wire'])} disabled={disabled}>
              <option value="responses">Responses API</option>
              <option value="chat_completions">Chat Completions</option>
            </select>
          </label>
          <label className="afield">
            <span>Giới hạn đầu ra (token)</span>
            <input className="ainput" type="number" min={256} max={30000} step={256} value={form.maxOutputTokens ?? 5000} onChange={(event) => update('maxOutputTokens', Number(event.target.value))} disabled={disabled} />
          </label>
        </> : <>
          <label className="afield">
            <span>Kích thước ảnh</span>
            <select className="ainput" value={form.imageSize ?? '1024x1024'} onChange={(event) => update('imageSize', event.target.value)} disabled={disabled}>
              <option value="1024x1024">Vuông · 1024 × 1024</option>
              <option value="1536x1024">Ngang · 1536 × 1024</option>
              <option value="1024x1536">Dọc · 1024 × 1536</option>
              <option value="auto">Tự động</option>
            </select>
          </label>
          <label className="afield">
            <span>Chất lượng ảnh</span>
            <select className="ainput" value={form.imageQuality ?? 'medium'} onChange={(event) => update('imageQuality', event.target.value)} disabled={disabled}>
              <option value="low">Thấp</option><option value="medium">Vừa</option><option value="high">Cao</option><option value="auto">Tự động</option><option value="standard">Tiêu chuẩn</option>
            </select>
          </label>
        </>}
      </div>
      {form.keySource === 'database' && <button type="button" className="abtn abtn--ghost ai-provider__clear" onClick={() => onChange({ ...form, apiKey: '', clearApiKey: !form.clearApiKey })} disabled={disabled}>{form.clearApiKey ? 'Hoàn tác xoá key' : 'Xoá key đã lưu'}</button>}
    </article>
  );
}
