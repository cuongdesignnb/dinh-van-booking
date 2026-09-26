'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api/client';
import { settingGroupLabel, SettingsFormEditor, validateSetting } from './SettingsFormEditor';
import { AiSettingsPanel } from './AiSettingsPanel';

interface SettingItem {
  key: string;
  group: string;
  label: string;
  description?: string;
  isPublic: boolean;
  value: unknown;
  isDefault: boolean;
  version: number;
  updatedAt: string | null;
}

interface SettingsPayload {
  groups: string[];
  items: SettingItem[];
}

interface SeoPolicyPayload {
  indexingAllowed: boolean;
  canonicalOrigin: string | null;
  blockedReasons: string[];
  structuredData: {
    core: boolean;
    offers: false;
    reviews: false;
    vacationRental: false;
    blockedCommercialReasons: Record<string, string>;
  };
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function SettingsScreen() {
  const [payload, setPayload] = useState<SettingsPayload | null>(null);
  const [seoPolicy, setSeoPolicy] = useState<SeoPolicyPayload | null>(null);
  const [group, setGroup] = useState('all');
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setMessage(null);
    try {
      const next = await apiRequest<SettingsPayload>('/settings');
      setPayload(next);
      setDrafts(Object.fromEntries(next.items.map((item) => [item.key, item.value])));
      try {
        setSeoPolicy(await apiRequest<SeoPolicyPayload>('/public/seo/policy'));
      } catch {
        setSeoPolicy(null);
      }
    } catch (reason) {
      setMessage({ tone: 'error', text: reason instanceof Error ? reason.message : 'Không tải được cài đặt.' });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => group === 'ai' ? [] : payload?.items.filter((item) => group === 'all' || item.group === group) ?? [],
    [group, payload],
  );

  const save = async (item: SettingItem) => {
    const value = drafts[item.key];
    const issue = validateSetting(item.key, value);
    if (issue) {
      setMessage({ tone: 'error', text: issue });
      return;
    }
    setBusyKey(item.key);
    setMessage(null);
    try {
      await apiRequest(`/settings/${encodeURIComponent(item.key)}`, {
        method: 'PUT',
        body: JSON.stringify({ value, expectedVersion: item.version }),
      });
      setMessage({ tone: 'success', text: `Đã lưu cài đặt “${item.label}”.` });
      await load();
    } catch (reason) {
      const conflict = reason instanceof ApiError && reason.status === 409;
      setMessage({ tone: 'error', text: conflict ? 'Cài đặt vừa được thay đổi ở nơi khác. Đã tải lại bản mới.' : reason instanceof Error ? reason.message : 'Không lưu được cài đặt.' });
      if (conflict) await load();
    } finally {
      setBusyKey(null);
    }
  };

  const reset = async (item: SettingItem) => {
    if (!window.confirm(`Đưa “${item.label}” về cài đặt ban đầu?`)) return;
    setBusyKey(item.key);
    setMessage(null);
    try {
      await apiRequest(`/settings/${encodeURIComponent(item.key)}?expectedVersion=${item.version}`, { method: 'DELETE' });
      setMessage({ tone: 'success', text: `Đã khôi phục “${item.label}” về mặc định.` });
      await load();
    } catch (reason) {
      const conflict = reason instanceof ApiError && reason.status === 409;
      setMessage({ tone: 'error', text: conflict ? 'Cài đặt vừa được thay đổi ở nơi khác. Đã tải lại bản mới.' : reason instanceof Error ? reason.message : 'Không khôi phục được cài đặt.' });
      if (conflict) await load();
    } finally {
      setBusyKey(null);
    }
  };

  if (!payload && !message) return <section className="acard apending">Đang tải cài đặt…</section>;

  return (
    <div className="settings-screen">
      <div className="settings-screen__head">
        <div>
          <h2>Cài đặt hệ thống</h2>
          <p className="ahint">Chỉnh trực tiếp từng mục bằng biểu mẫu. Thay đổi chỉ có hiệu lực sau khi bấm lưu.</p>
        </div>
        <button type="button" className="abtn abtn--ghost" onClick={() => void load()} disabled={!!busyKey}>Tải lại</button>
      </div>
      {message && <p className={`settings-screen__message settings-screen__message--${message.tone}`} role={message.tone === 'error' ? 'alert' : 'status'}>{message.text}</p>}
      {payload && (
        <>
          {seoPolicy && (group === 'all' || group === 'seo') && (
            <section className={`settings-screen__message ${seoPolicy.indexingAllowed ? 'settings-screen__message--success' : 'settings-screen__message--error'}`} aria-live="polite">
              <strong>{seoPolicy.indexingAllowed ? 'Website đã qua cổng cấu hình index.' : 'Website hiện đang được bảo vệ khỏi index.'}</strong>
              {seoPolicy.canonicalOrigin && <span> Domain đang cấu hình: {seoPolicy.canonicalOrigin}.</span>}
              {seoPolicy.blockedReasons.length > 0 && <ul>{seoPolicy.blockedReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
              <p>Offers, review aggregate và Vacation Rental vẫn bị khóa tới khi có API, dữ liệu và xác minh đủ điều kiện.</p>
            </section>
          )}
          <div className="settings-screen__groups" role="tablist" aria-label="Nhóm cài đặt">
            <button type="button" role="tab" aria-selected={group === 'all'} className={`abtn ${group === 'all' ? 'abtn--primary' : 'abtn--ghost'}`} onClick={() => setGroup('all')}>Tất cả</button>
            <button type="button" role="tab" aria-selected={group === 'ai'} className={`abtn ${group === 'ai' ? 'abtn--primary' : 'abtn--ghost'}`} onClick={() => setGroup('ai')}>AI nội dung & ảnh</button>
            {payload.groups.map((item) => (
              <button key={item} type="button" role="tab" aria-selected={group === item} className={`abtn ${group === item ? 'abtn--primary' : 'abtn--ghost'}`} onClick={() => setGroup(item)}>{settingGroupLabel(item)}</button>
            ))}
          </div>
          {(group === 'all' || group === 'ai') && <AiSettingsPanel />}
          <div className="settings-screen__list">
            {visible.map((item) => {
              const draft = drafts[item.key] ?? item.value;
              const changed = !sameValue(draft, item.value);
              const busy = busyKey === item.key;
              return (
                <article className="acard settings-item" key={item.key}>
                  <div className="settings-item__head">
                    <div>
                      <h3>{item.label}</h3>
                      {item.description && <p className="ahint">{item.description}</p>}
                    </div>
                    <span className="settings-item__meta">{changed ? 'Chưa lưu' : item.isDefault ? 'Mặc định' : 'Đã tuỳ chỉnh'}{item.version > 0 ? ` · phiên bản ${item.version}` : ''}</span>
                  </div>
                  <SettingsFormEditor
                    settingKey={item.key}
                    value={draft}
                    disabled={busy}
                    onChange={(value) => setDrafts((current) => ({ ...current, [item.key]: value }))}
                  />
                  <div className="settings-item__actions">
                    <button type="button" className="abtn abtn--primary" onClick={() => void save(item)} disabled={busy || !changed}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
                    <button type="button" className="abtn abtn--ghost" onClick={() => void reset(item)} disabled={busy || item.isDefault}>Khôi phục mặc định</button>
                    {changed && <button type="button" className="abtn abtn--ghost" onClick={() => setDrafts((current) => ({ ...current, [item.key]: item.value }))} disabled={busy}>Huỷ chỉnh sửa</button>}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
