import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export type Priority = 'low' | 'medium' | 'high';
export interface Task {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
}
export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'completed'> & { completed?: boolean };

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private readonly url = '/api/tasks';

  // Single source of truth; components subscribe via the async pipe.
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  readonly tasks$ = this.tasksSubject.asObservable();

  get snapshot(): Task[] { return this.tasksSubject.value; }

  load(): Observable<Task[]> {
    return this.http.get<Task[]>(this.url).pipe(tap((t) => this.tasksSubject.next(t)));
  }

  create(input: TaskInput): Observable<Task> {
    return this.http.post<Task>(this.url, input).pipe(
      tap((t) => this.tasksSubject.next([t, ...this.snapshot]))
    );
  }

  update(id: number, input: TaskInput): Observable<Task> {
    return this.http.put<Task>(`${this.url}/${id}`, input).pipe(
      tap((t) => this.tasksSubject.next(this.snapshot.map((x) => (x.id === id ? t : x))))
    );
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      tap(() => this.tasksSubject.next(this.snapshot.filter((x) => x.id !== id)))
    );
  }
}
