'use client';

import dynamic from 'next/dynamic';
import { MessageCircle, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSiteData } from '@/components/site/SiteDataProvider';
import { onOpenChat } from '@/lib/events';
import { publicSetting, publicText } from '@/lib/public-content';

// The conversation UI only loads once the visitor opens the chat.
const ChatPanel = dynamic(() => import('./ChatPanel').then((module) => module.ChatPanel), { ssr: false });

const OPEN_KEY = 'dvb:chat-open';

function rememberOpen(open: boolean) {
  try { window.sessionStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch { /* storage unavailable */ }
}

/** Floating chat bubble shown on every public page when the Owner enables the chat. */
export function ChatLauncher() {
  const site = useSiteData();
  const config = publicSetting(site.publicSite, 'chat.widget');
  const enabled = config.enabled === true;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState<string | undefined>();

  const show = useCallback((next: boolean) => {
    setOpen(next);
    if (next) { setMounted(true); setUnread(0); }
    rememberOpen(next);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    try { if (window.sessionStorage.getItem(OPEN_KEY) === '1') show(true); } catch { /* storage unavailable */ }
    return onOpenChat((text) => { setDraft(text); show(true); });
  }, [enabled, show]);

  if (!enabled) return null;
  const label = publicText(config.launcherLabel) || 'Chat tư vấn';

  return (
    <>
      {mounted && (
        <ChatPanel
          open={open}
          draft={draft}
          onDraftUsed={() => setDraft(undefined)}
          onClose={() => show(false)}
          onUnread={() => { if (!open) setUnread((count) => count + 1); }}
        />
      )}
      <button
        type="button"
        className="chatl"
        data-open={open || undefined}
        aria-expanded={open}
        aria-controls="dvb-chat-panel"
        aria-label={open ? 'Đóng khung chat' : unread ? `${label} — ${unread} tin nhắn mới` : label}
        onClick={() => show(!open)}
      >
        {open ? <X size={24} aria-hidden="true" /> : <MessageCircle size={24} aria-hidden="true" />}
        {!open && <span className="chatl__label">{label}</span>}
        {!open && unread > 0 && <span className="chatl__badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
      </button>
    </>
  );
}
