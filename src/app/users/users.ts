import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService, User, UserRole, CreateUserRequest } from 'dummy-openapi';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="users-container">
      <header class="header">
        <div>
          <h2>Gestión de Usuarios (OpenAPI + json-server)</h2>
          <p class="subtitle">Consumiendo <code>UsersService</code> de <strong>dummy-openapi</strong> contra <strong>json-server</strong></p>
        </div>
        <button class="btn btn-primary" type="button" (click)="openCreateModal()">
          + Nuevo Usuario
        </button>
      </header>

      <!-- Barra de Filtros y Búsqueda -->
      <div class="toolbar">
        <div class="search-box">
          <input
            id="user-search"
            type="text"
            placeholder="Buscar por nombre, usuario o email..."
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchChange($event)"
          />
        </div>

        <div class="limit-selector">
          <label for="limit-select">Por página:</label>
          <select id="limit-select" [ngModel]="limit()" (ngModelChange)="onLimitChange($event)">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="20">20</option>
          </select>
        </div>
      </div>

      <!-- Estado de Carga -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando usuarios desde json-server...</p>
        </div>
      }

      <!-- Mensaje de Error -->
      @if (error()) {
        <div class="error-banner">
          <span>⚠️ {{ error() }}</span>
          <button class="btn btn-sm btn-secondary" type="button" (click)="loadUsers()">Reintentar</button>
        </div>
      }

      <!-- Tabla de Usuarios -->
      @if (!loading() && users().length > 0) {
        <div class="table-card">
          <table class="users-table">
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Nombre</th>
                <th scope="col">Email</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col">Fecha Creación</th>
                <th scope="col" class="actions-header">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td class="username-cell">
                    <strong>&#64;{{ user.username }}</strong>
                  </td>
                  <td>{{ user.firstName }} {{ user.lastName }}</td>
                  <td>{{ user.email }}</td>
                  <td>
                    <span class="badge badge-role" [attr.data-role]="user.role">
                      {{ user.role }}
                    </span>
                  </td>
                  <td>
                    <span class="badge" [class.badge-active]="user.isActive" [class.badge-inactive]="!user.isActive">
                      {{ user.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="date-cell">{{ user.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td class="actions-cell">
                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      title="Eliminar usuario"
                      [disabled]="deletingId() === user.id"
                      (click)="deleteUser(user.id)"
                    >
                      @if (deletingId() === user.id) {
                        ...
                      } @else {
                        Eliminar
                      }
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="pagination">
          <span class="pagination-info">
            Página {{ page() }} de {{ totalPages() }} (Total: {{ totalItems() }} usuarios)
          </span>
          <div class="pagination-buttons">
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              [disabled]="page() <= 1"
              (click)="changePage(page() - 1)"
            >
              &laquo; Anterior
            </button>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              [disabled]="page() >= totalPages()"
              (click)="changePage(page() + 1)"
            >
              Siguiente &raquo;
            </button>
          </div>
        </div>
      }

      <!-- Sin resultados -->
      @if (!loading() && users().length === 0 && !error()) {
        <div class="empty-state">
          <p>No se encontraron usuarios coincidentes.</p>
        </div>
      }

      <!-- Modal de Creación -->
      @if (showModal()) {
        <div
          class="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabindex="-1"
          (keydown.escape)="closeModal()"
        >
          <div class="modal-card">
            <div class="modal-header">
              <h3 id="modal-title">Crear Nuevo Usuario</h3>
              <button type="button" class="close-btn" (click)="closeModal()" aria-label="Cerrar">&times;</button>
            </div>
            <p class="modal-subtitle">Invoca <code>usersService.usersPost()</code></p>

            <form (ngSubmit)="submitCreate()">
              <div class="form-group">
                <label for="form-username">Nombre de usuario (*):</label>
                <input id="form-username" type="text" [(ngModel)]="formUsername" name="username" required placeholder="ej. ada.lovelace" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="form-firstname">Nombre (*):</label>
                  <input id="form-firstname" type="text" [(ngModel)]="formFirstName" name="firstName" required placeholder="Ada" />
                </div>
                <div class="form-group">
                  <label for="form-lastname">Apellido (*):</label>
                  <input id="form-lastname" type="text" [(ngModel)]="formLastName" name="lastName" required placeholder="Lovelace" />
                </div>
              </div>

              <div class="form-group">
                <label for="form-email">Email (*):</label>
                <input id="form-email" type="email" [(ngModel)]="formEmail" name="email" required placeholder="ada&#64;example.com" />
              </div>

              <div class="form-group">
                <label for="form-password">Contraseña (*):</label>
                <input id="form-password" type="password" [(ngModel)]="formPassword" name="password" required placeholder="Mínimo 8 caracteres" />
              </div>

              <div class="form-group">
                <label for="form-role">Rol:</label>
                <select id="form-role" [(ngModel)]="formRole" name="role">
                  <option [value]="UserRole.user">Usuario (user)</option>
                  <option [value]="UserRole.moderator">Moderador (moderator)</option>
                  <option [value]="UserRole.admin">Administrador (admin)</option>
                </select>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                  {{ submitting() ? 'Creando...' : 'Guardar Usuario' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .users-container {
      max-width: 1100px;
      margin: 2rem auto;
      padding: 1.5rem;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      font-family: inherit;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid #eef2f6;
      padding-bottom: 1rem;
    }
    .header h2 {
      margin: 0;
      color: #1e293b;
      font-size: 1.5rem;
    }
    .subtitle {
      margin: 0.25rem 0 0;
      color: #64748b;
      font-size: 0.9rem;
    }
    .toolbar {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.25rem;
      align-items: center;
    }
    .search-box {
      flex: 1;
    }
    .search-box input {
      width: 100%;
      padding: 0.6rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.95rem;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-box input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
    }
    .limit-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: #475569;
    }
    .limit-selector select {
      padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: white;
      outline: none;
    }
    .table-card {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .users-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.9rem;
    }
    .users-table th {
      background: #f8fafc;
      padding: 0.75rem 1rem;
      font-weight: 600;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
    }
    .users-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .users-table tr:hover {
      background: #f8fafc;
    }
    .username-cell {
      color: #2563eb;
    }
    .date-cell {
      color: #64748b;
      font-size: 0.85rem;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
    }
    .badge-role[data-role="admin"] { background: #fee2e2; color: #991b1b; }
    .badge-role[data-role="moderator"] { background: #fef3c7; color: #92400e; }
    .badge-role[data-role="user"] { background: #e0f2fe; color: #075985; }
    .badge-active { background: #dcfce7; color: #166534; }
    .badge-inactive { background: #f1f5f9; color: #64748b; }
    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #e2e8f0; color: #334155; }
    .btn-secondary:hover { background: #cbd5e1; }
    .btn-danger { background: #ef4444; color: white; }
    .btn-danger:hover { background: #dc2626; }
    .btn-sm { padding: 0.35rem 0.7rem; font-size: 0.8rem; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .actions-cell, .actions-header { text-align: right; }
    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      padding-top: 0.5rem;
    }
    .pagination-info { font-size: 0.85rem; color: #64748b; }
    .pagination-buttons { display: flex; gap: 0.5rem; }
    .loading-state, .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #64748b;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }
    .modal-card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 { margin: 0; color: #1e293b; }
    .close-btn {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #64748b;
    }
    .modal-subtitle { margin: 0.25rem 0 1.25rem; color: #64748b; font-size: 0.85rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.85rem; font-weight: 500; color: #334155; margin-bottom: 0.25rem; }
    .form-group input, .form-group select {
      width: 100%;
      padding: 0.55rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.9rem;
      box-sizing: border-box;
      outline: none;
    }
    .form-row { display: flex; gap: 0.75rem; }
    .form-row .form-group { flex: 1; }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
  `],
})
export class UsersComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly UserRole = UserRole;

  // Estados Reactivos
  readonly users = signal<User[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly page = signal<number>(1);
  readonly limit = signal<number>(5);
  readonly totalItems = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly searchQuery = signal<string>('');
  readonly deletingId = signal<string | null>(null);
  readonly submitting = signal<boolean>(false);

  // Modal
  readonly showModal = signal<boolean>(false);
  formUsername = '';
  formFirstName = '';
  formLastName = '';
  formEmail = '';
  formPassword = '';
  formRole: UserRole = UserRole.user;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUsers();
    }
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.usersService
      .usersGet(this.page(), this.limit(), this.searchQuery() || undefined)
      .subscribe({
        next: (response) => {
          this.users.set(response.users ?? []);
          if (response.pagination) {
            this.totalItems.set(response.pagination.totalItems ?? 0);
            this.totalPages.set(response.pagination.totalPages ?? 1);
            this.page.set(response.pagination.page ?? 1);
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al consultar usersGet:', err);
          this.error.set(
            'No se pudo conectar con el servidor mock de json-server en http://localhost:3000. ' +
              'Asegúrate de ejecutar "npm run mock".'
          );
          this.loading.set(false);
        },
      });
  }

  onSearchChange(term: string): void {
    this.searchQuery.set(term);
    this.page.set(1);
    this.loadUsers();
  }

  onLimitChange(newLimit: number): void {
    this.limit.set(Number(newLimit));
    this.page.set(1);
    this.loadUsers();
  }

  changePage(newPage: number): void {
    this.page.set(newPage);
    this.loadUsers();
  }

  deleteUser(userId: string): void {
    if (!confirm('¿Deseas eliminar este usuario?')) {
      return;
    }

    this.deletingId.set(userId);
    this.usersService.usersUserIdDelete(userId).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error al eliminar usuario:', err);
        alert('Error al eliminar usuario');
        this.deletingId.set(null);
      },
    });
  }

  openCreateModal(): void {
    this.formUsername = '';
    this.formFirstName = '';
    this.formLastName = '';
    this.formEmail = '';
    this.formPassword = '';
    this.formRole = UserRole.user;
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitCreate(): void {
    if (!this.formUsername || !this.formEmail || !this.formFirstName || !this.formLastName) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    this.submitting.set(true);
    const request: CreateUserRequest = {
      username: this.formUsername,
      firstName: this.formFirstName,
      lastName: this.formLastName,
      email: this.formEmail,
      password: this.formPassword,
      role: this.formRole,
    };

    this.usersService.usersPost(request).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeModal();
        this.page.set(1);
        this.searchQuery.set('');
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error al crear usuario:', err);
        const msg = err.error?.error || 'Error al crear usuario en json-server';
        alert(msg);
        this.submitting.set(false);
      },
    });
  }
}
