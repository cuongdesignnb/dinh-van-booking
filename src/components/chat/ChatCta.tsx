'use client';

import Link from 'next/link';
import type { ComponentProps, MouseEvent } from 'react';
import { useSiteData } from '@/components/site/SiteDataProvider';
import { openChat } from '@/lib/events';
import { publicSetting } from '@/lib/public-content';

/** True when the Owner has switched the website chat on. */
export function useChatEnabled(): boolean {
  const site = useSiteData();
  return publicSetting(site.publicSite, 'chat.widget').enabled === true;
}

type ChatCtaProps = Omit<ComponentProps<typeof Link>, 'onClick'> & {
  /** Message prefilled in the chat box (the visitor can edit it before sending). */
  draft?: string;
  /** Runs before the chat opens, e.g. to close a dialog the CTA sits in. */
  onOpen?: () => void;
};

/**
 * An advisor call-to-action that opens the live chat when it is enabled and
 * otherwise keeps its original link (contact page, inquiry form…).
 */
export function ChatCta({ draft, onOpen, href, ...props }: ChatCtaProps) {
  const enabled = useChatEnabled();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!enabled || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onOpen?.();
    openChat(draft);
  };
  return <Link href={href} {...props} onClick={onClick} />;
}
