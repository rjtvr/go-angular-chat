import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WS_URL } from '../../core/config/app-config';
import { ChatMessage } from './chat.models';
import { ChatService } from './chat.service';

// Fake socket: `incoming` plays the server, `next` records what the client sends.
const incoming = new Subject<ChatMessage>();
const fakeSocket = {
  next: vi.fn(),
  pipe: (...ops: any[]) => (incoming.pipe as any)(...ops),
};
let config: any;

vi.mock('rxjs/webSocket', () => ({
  webSocket: (c: unknown) => {
    config = c;
    return fakeSocket;
  },
}));

const msg = (over: Partial<ChatMessage>): ChatMessage => ({
  type: 'chat',
  sender: 'abc12345',
  content: 'hi',
  sentAt: '2026-01-01T00:00:00Z',
  ...over,
});

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    fakeSocket.next.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: WS_URL, useValue: 'ws://test/ws' }],
    });
    service = TestBed.inject(ChatService);
  });

  afterEach(() => service.disconnect());

  it('connects to the injected URL and reports status', () => {
    service.connect();
    expect(config.url).toBe('ws://test/ws');
    expect(service.status()).toBe('connecting');

    config.openObserver.next();
    expect(service.status()).toBe('online');
  });

  it('stores the id from a welcome message without listing it', () => {
    service.connect();
    incoming.next(msg({ type: 'welcome', sender: 'me12345', content: '' }));

    expect(service.myId()).toBe('me12345');
    expect(service.messages()).toEqual([]);
  });

  it('appends chat and system messages as new arrays', () => {
    service.connect();
    const before = service.messages();

    incoming.next(msg({ content: 'one' }));
    incoming.next(msg({ type: 'system', sender: undefined, content: 'joined' }));

    expect(service.messages().map((m) => m.content)).toEqual(['one', 'joined']);
    expect(service.messages()).not.toBe(before);
  });

  it('sends trimmed content and ignores blank input', () => {
    service.connect();

    service.send('  hello  ');
    service.send('   ');

    expect(fakeSocket.next).toHaveBeenCalledTimes(1);
    expect(fakeSocket.next).toHaveBeenCalledWith({ content: 'hello' });
  });

  it('does not send before connect()', () => {
    service.send('hello');
    expect(fakeSocket.next).not.toHaveBeenCalled();
  });

  it('goes offline on disconnect', () => {
    service.connect();
    service.disconnect();
    expect(service.status()).toBe('offline');
  });
});
