import { Injectable, inject, signal } from '@angular/core';
import { Subscription, retry, timer } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { WS_URL } from '../../core/config/app-config';
import { ChatMessage, ConnectionStatus, OutgoingMessage } from './chat.models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly url = inject(WS_URL);
  private socket?: WebSocketSubject<ChatMessage | OutgoingMessage>;
  private subscription?: Subscription;

  readonly messages = signal<ChatMessage[]>([]);
  readonly myId = signal<string | null>(null);
  readonly status = signal<ConnectionStatus>('offline');

  connect(): void {
    if (this.socket) return; // already connected

    this.status.set('connecting');
    this.socket = webSocket<ChatMessage | OutgoingMessage>({
      url: this.url,
      openObserver: { next: () => this.status.set('online') },
      closeObserver: { next: () => this.status.set('offline') },
    });

    this.subscription = this.socket
      .pipe(
        // If the server goes down, try again every 2 seconds.
        retry({
          delay: () => {
            this.status.set('connecting');
            return timer(2000);
          },
        }),
      )
      .subscribe((msg) => this.handle(msg as ChatMessage));
  }

  send(content: string): void {
    const text = content.trim();
    if (!text || !this.socket) return;
    this.socket.next({ content: text });
  }

  disconnect(): void {
    this.subscription?.unsubscribe(); // last unsubscribe closes the socket
    this.socket = undefined;
    this.status.set('offline');
  }

  private handle(msg: ChatMessage): void {
    if (msg.type === 'welcome') {
      this.myId.set(msg.sender ?? null);
      return;
    }
    // Always create a new array: signals compare by reference,
    // so push() on the old array would not update the view.
    this.messages.update((list) => [...list, msg]);
  }
}