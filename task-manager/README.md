# Task Management System

Angular 18 · TypeScript · RxJS · Reactive Forms · REST API · JWT

## Run it
```bash
npm install
npm run api     # terminal 1: REST API on :3000
npm start       # terminal 2: Angular on :4200 (proxies /api to :3000)
```
Open http://localhost:4200, create an account, and add tasks.

## Where each feature lives
| Feature | Location |
|---|---|
| CRUD over REST | `src/app/tasks/task.service.ts`, `server/server.js` |
| Reactive Forms + validation | `tasks/task-list.component.ts`, `auth/auth.component.ts` |
| RxJS | `BehaviorSubject` store in `TaskService`; `combineLatest`, `debounceTime`, `distinctUntilChanged` for search and filter |
| Lazy loading | `app.routes.ts` (`loadComponent`) with `PreloadAllModules` |
| JWT auth | `core/auth.service.ts`, `auth.interceptor.ts` (adds Bearer token, signs out on 401), `auth.guard.ts`; token verified in `server.js` |

## Notes
- The API keeps data in memory, so it resets on restart. Swap the arrays in `server/server.js` for a database for real use.
- Set `JWT_SECRET` in the environment before deploying.
- Git: `git init && git add . && git commit -m "Initial task manager"`
