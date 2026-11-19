import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AsyncPipe],
  template: `
    <header class="bar">
      <strong>Taskboard</strong>
      @if (auth.user$ | async; as user) {
        <span class="who">{{ user.name }}
          <button class="ghost" (click)="auth.logout()">Sign out</button>
        </span>
      }
    </header>
    <main><router-outlet /></main>
  `,
})
export class AppComponent {
  auth = inject(AuthService);
}
