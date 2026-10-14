import { Injectable, type MessageEvent } from '@nestjs/common';
import { filter, interval, map, merge, Observable, Subject } from 'rxjs';

export interface ChatEvent {
  type: 'message.created' | 'conversation.updated';
  conversationId: string;
  seq?: string;
  status?: string;
  /** Hash of the visitor cookie; used for routing only, never sent to a client. */
  visitorKey: string;
}

const HEARTBEAT_MS = 20_000;

/**
 * In-process fan-out for live chat. The API runs as a single instance, so a
 * Subject is enough; clients still poll on a slow timer, which also covers a
 * missed event or a future second instance.
 */
@Injectable()
export class ChatEventsService {
  private readonly events = new Subject<ChatEvent>();

  emit(event: ChatEvent): void {
    this.events.next(event);
  }

  /** SSE stream of invalidation events; the client refetches its authoritative data. */
  stream(accept: (event: ChatEvent) => boolean): Observable<MessageEvent> {
    const updates = this.events.pipe(
      filter(accept),
      map(({ visitorKey: _visitorKey, ...data }): MessageEvent => ({ type: data.type, data })),
    );
    const heartbeat = interval(HEARTBEAT_MS).pipe(map((): MessageEvent => ({ type: 'heartbeat', data: { at: new Date().toISOString() } })));
    return merge(updates, heartbeat);
  }
}
