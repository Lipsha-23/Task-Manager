import { Component, OnInit, inject, signal } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { combineLatest, debounceTime, distinctUntilChanged, map, startWith } from 'rxjs';
import { Priority, Task, TaskInput, TaskService } from './task.service';

type Filter = 'all' | 'open' | 'done';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [ReactiveFormsModule, AsyncPipe, DatePipe],
  template: `
    <div class="layout">
      <section class="card">
        <h2>{{ editingId() ? 'Edit task' : 'New task' }}</h2>
        <form [formGroup]="form" (ngSubmit)="save()">
          <label>Title
            <input formControlName="title" placeholder="What needs doing?">
            @if (showError('title')) {
              @if (form.controls.title.errors?.['required']) { <small class="err">Add a title.</small> }
              @else { <small class="err">Title needs at least 3 characters.</small> }
            }
          </label>
          <label>Details
            <textarea formControlName="description" rows="3"></textarea>
            @if (showError('description')) { <small class="err">Keep details under 200 characters.</small> }
          </label>
          <div class="row">
            <label>Priority
              <select formControlName="priority">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </label>
            <label>Due date
              <input type="date" formControlName="dueDate">
            </label>
          </div>
          @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
          <div class="row">
            <button class="primary" [disabled]="saving()">{{ editingId() ? 'Save changes' : 'Add task' }}</button>
            @if (editingId()) { <button type="button" class="ghost" (click)="cancel()">Cancel</button> }
          </div>
        </form>
      </section>

      <section>
        <div class="toolbar">
          <input type="search" [formControl]="search" placeholder="Search tasks">
          <div class="seg" role="group" aria-label="Filter">
            @for (f of filters; track f) {
              <button type="button" [class.on]="filter.value === f" (click)="filter.setValue(f)">{{ f }}</button>
            }
          </div>
        </div>

        @if (loading()) { <p class="muted">Loading tasks…</p> }

        @if (visible$ | async; as tasks) {
          @for (t of tasks; track t.id) {
            <article class="task" [class.done]="t.completed">
              <input type="checkbox" [checked]="t.completed" (change)="toggle(t)" [attr.aria-label]="'Mark ' + t.title + ' done'">
              <div class="body">
                <h3>{{ t.title }}</h3>
                @if (t.description) { <p>{{ t.description }}</p> }
                <small class="muted">
                  <span class="pill" [class]="'pill ' + t.priority">{{ t.priority }}</span>
                  @if (t.dueDate) { Due {{ t.dueDate | date: 'mediumDate' }} }
                </small>
              </div>
              <div class="actions">
                <button type="button" class="ghost" (click)="edit(t)">Edit</button>
                <button type="button" class="ghost danger" (click)="remove(t)">Delete</button>
              </div>
            </article>
          } @empty {
            @if (!loading()) { <p class="muted empty">No tasks match. Add one to get started.</p> }
          }
        }
      </section>
    </div>
  `,
})
export class TaskListComponent implements OnInit {
  private svc = inject(TaskService);
  private fb = inject(FormBuilder).nonNullable;

  filters: Filter[] = ['all', 'open', 'done'];
  search = new FormControl('', { nonNullable: true });
  filter = new FormControl<Filter>('all', { nonNullable: true });

  loading = signal(true);
  saving = signal(false);
  error = signal('');
  editingId = signal<number | null>(null);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', Validators.maxLength(200)],
    priority: ['medium' as Priority],
    dueDate: [''],
  });

  // Debounced search + status filter combined with the live task stream.
  visible$ = combineLatest([
    this.svc.tasks$,
    this.search.valueChanges.pipe(startWith(''), debounceTime(250), distinctUntilChanged()),
    this.filter.valueChanges.pipe(startWith<Filter>('all')),
  ]).pipe(
    map(([tasks, q, f]) =>
      tasks.filter((t) =>
        (f === 'all' || (f === 'done') === t.completed) &&
        (t.title + ' ' + t.description).toLowerCase().includes(q.toLowerCase())
      )
    )
  );

  ngOnInit() {
    this.svc.load().subscribe({
      next: () => this.loading.set(false),
      error: () => { this.loading.set(false); this.error.set('Could not load tasks.'); },
    });
  }

  showError(c: 'title' | 'description') {
    const ctrl = this.form.controls[c];
    return ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const input: TaskInput = { ...v, dueDate: v.dueDate || null };
    const id = this.editingId();
    const completed = id ? this.svc.snapshot.find((t) => t.id === id)?.completed ?? false : false;

    this.saving.set(true);
    this.error.set('');
    const req$ = id ? this.svc.update(id, { ...input, completed }) : this.svc.create(input);

    req$.subscribe({
      next: () => { this.saving.set(false); this.cancel(); },
      error: (e: HttpErrorResponse) => { this.saving.set(false); this.error.set(e.error?.message ?? 'Could not save the task.'); },
    });
  }

  edit(t: Task) {
    this.editingId.set(t.id);
    this.form.setValue({ title: t.title, description: t.description, priority: t.priority, dueDate: t.dueDate ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancel() {
    this.editingId.set(null);
    this.form.reset({ title: '', description: '', priority: 'medium', dueDate: '' });
  }

  toggle(t: Task) {
    this.svc.update(t.id, { ...t, completed: !t.completed }).subscribe({
      error: () => this.error.set('Could not update the task.'),
    });
  }

  remove(t: Task) {
    if (confirm(`Delete “${t.title}”?`)) {
      this.svc.remove(t.id).subscribe({ error: () => this.error.set('Could not delete the task.') });
    }
  }
}
