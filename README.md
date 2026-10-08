# Husky

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Mock API con `json-server` y `dummy-openapi`

Este proyecto cuenta con un servidor mock basado en [`json-server`](https://github.com/typicode/json-server) completamente adaptado al contrato de API de la librería [`dummy-openapi`](https://github.com/typicode/json-server).

### Comandos disponibles

- **Iniciar Mock Server adaptado:**
  ```bash
  npm run mock
  # o
  npm run mock:server
  ```
  Inicia el servidor en `http://localhost:3000` con soporte completo para la paginación (`?page=&limit=`), búsqueda por texto (`?search=`), validaciones y estructura de respuesta `UserListResponse` / `UserResponse`.

- **Iniciar json-server directo CLI:**
  ```bash
  npm run mock:json-server
  ```

### Estructura de Datos (`db.json`)

Los datos iniciales residen en `db.json` con usuarios precargados respetando el esquema `User` de `dummy-openapi`:
- `id` (UUID)
- `username` (string)
- `email` (string)
- `firstName`, `lastName` (string)
- `role` (`"admin"` | `"moderator"` | `"user"`)
- `isActive` (boolean)
- `createdAt`, `updatedAt` (ISO 8601)

### Configuración en Angular (`app.config.ts`)

En `src/app/app.config.ts`, el cliente OpenAPI está configurado mediante:
```typescript
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideApi } from 'dummy-openapi';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withFetch()),
    provideApi('http://localhost:3000'),
    // ...
  ],
};
```

También se configuró `proxy.conf.json` en `angular.json` para redirigir peticiones `/users` durante `ng serve`.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

