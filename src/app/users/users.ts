import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CreateUserRequest, User, UserRole, UsersService } from 'dummy-openapi';
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css'
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
