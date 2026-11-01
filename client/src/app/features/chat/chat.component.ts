import { Component, ElementRef, OnDestroy, OnInit, effect, inject, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ChatService } from './chat.service';

@Component({
  selector: 'app-chat',
  imports: [DatePipe],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements OnInit, OnDestroy {
  protected readonly chat = inject(ChatService);
  private readonly list = viewChild<ElementRef<HTMLUListElement>>('list');

  constructor() {
    // Re-runs whenever messages() changes: scroll to the newest one.
    effect(() => {
      this.chat.messages();
      const el = this.list()?.nativeElement;
      if (el) setTimeout(() => (el.scrollTop = el.scrollHeight));
    });
  }

  ngOnInit(): void {
    this.chat.connect();
  }

  ngOnDestroy(): void {
    this.chat.disconnect();
  }

  protected send(event: Event, input: HTMLInputElement): void {
    event.preventDefault(); // stop the browser's full-page form submit
    this.chat.send(input.value);
    input.value = '';
    input.focus();
  }
}