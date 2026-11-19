import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="card narrow">
      <h1>{{ mode() === 'login' ? 'Sign in' : 'Create your account' }}</h1>
      <form [formGroup]="form" (ngSubmit)="submit()">
        @if (mode() === 'register') {
          <label>Name
            <input formControlName="name" autocomplete="name">
            @if (invalid('name')) { <small class="err">Enter your name.</small> }
          </label>
        }
        <label>Email
          <input type="email" formControlName="email" autocomplete="email">
          @if (invalid('email')) { <small class="err">Enter a valid email address.</small> }
        </label>
        <label>Password
          <input type="password" formControlName="password" autocomplete="current-password">
          @if (invalid('password')) { <small class="err">Use at least 6 characters.</small> }
        </label>
        @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
        <button class="primary" [disabled]="loading()">
          {{ loading() ? 'Please wait…' : mode() === 'login' ? 'Sign in' : 'Create account' }}
        </button>
      </form>
      <p class="muted">
        {{ mode() === 'login' ? 'New here?' : 'Already registered?' }}
        <a href="#" (click)="toggle($event)">{{ mode() === 'login' ? 'Create an account' : 'Sign in' }}</a>
      </p>
    </section>
  `,
})
export class AuthComponent {
  private fb = inject(FormBuilder).nonNullable;
  private auth = inject(AuthService);
  private router = inject(Router);

  mode = signal<'login' | 'register'>('login');
  loading = signal(false);
  error = signal('');

  form = this.fb.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  invalid(c: 'name' | 'email' | 'password') {
    const ctrl = this.form.controls[c];
    return ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  toggle(e: Event) {
    e.preventDefault();
    const next = this.mode() === 'login' ? 'register' : 'login';
    this.mode.set(next);
    this.error.set('');
    this.form.controls.name.setValidators(next === 'register' ? [Validators.required] : []);
    this.form.controls.name.updateValueAndValidity();
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { name, email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');
    const req$ = this.mode() === 'login'
      ? this.auth.login(email, password)
      : this.auth.register(name, email, password);
    req$.subscribe({
      next: () => this.router.navigate(['/tasks']),
      error: (e: HttpErrorResponse) => {
        this.error.set(e.error?.message ?? 'Could not reach the server.');
        this.loading.set(false);
      },
    });
  }
}
