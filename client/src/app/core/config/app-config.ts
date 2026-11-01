import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** WebSocket endpoint of the chat server. Override in tests via providers. */
export const WS_URL = new InjectionToken<string>('WS_URL', {
  providedIn: 'root',
  factory: () => environment.wsUrl,
});
