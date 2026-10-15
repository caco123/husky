import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { UserListResponse, UserRole, UsersService } from 'dummy-openapi';

import { UsersComponent } from './users';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let mockUsersService: {
    usersGet: ReturnType<typeof vi.fn>;
    usersUserIdDelete: ReturnType<typeof vi.fn>;
    usersUserIdPut: ReturnType<typeof vi.fn>;
    usersPost: ReturnType<typeof vi.fn>;
  };

  const mockResponse: UserListResponse = {
    users: [
      {
        id: 'e2a4a754-0b12-4f32-843a-7dbb7e51c8b1',
        username: 'ada.lovelace',
        email: 'ada.lovelace@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        role: UserRole.admin,
        isActive: true,
        createdAt: '2026-01-15T08:30:00.000Z',
        updatedAt: '2026-01-15T08:30:00.000Z',
      },
    ],
    pagination: {
      page: 1,
      limit: 5,
      totalItems: 1,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    mockUsersService = {
      usersGet: vi.fn().mockReturnValue(of(mockResponse)),
      usersUserIdDelete: vi.fn().mockReturnValue(of({})),
      usersUserIdPut: vi.fn().mockReturnValue(of(mockResponse.users![0])),
      usersPost: vi.fn().mockReturnValue(of(mockResponse.users![0])),
    };

    await TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and load users from UsersService', () => {
    expect(component).toBeTruthy();
    expect(mockUsersService.usersGet).toHaveBeenCalledWith(1, 5, undefined);
    expect(component.users().length).toBe(1);
    expect(component.users()[0].username).toBe('ada.lovelace');
  });

  it('should update query and reload when onSearchChange is called', () => {
    component.onSearchChange('lovelace');
    expect(component.searchQuery()).toBe('lovelace');
    expect(mockUsersService.usersGet).toHaveBeenCalledWith(1, 5, 'lovelace');
  });

  it('should open edit modal and populate fields with user data', () => {
    const userToEdit = mockResponse.users![0];
    component.openEditModal(userToEdit);

    expect(component.showModal()).toBe(true);
    expect(component.modalMode()).toBe('edit');
    expect(component.editingUserId()).toBe(userToEdit.id);
    expect(component.formUsername).toBe(userToEdit.username);
    expect(component.formFirstName).toBe(userToEdit.firstName);
    expect(component.formLastName).toBe(userToEdit.lastName);
    expect(component.formEmail).toBe(userToEdit.email);
    expect(component.formRole).toBe(userToEdit.role);
    expect(component.formIsActive).toBe(userToEdit.isActive);
  });

  it('should update user via usersUserIdPut and reload users on submitEdit', () => {
    const userToEdit = mockResponse.users![0];
    component.openEditModal(userToEdit);

    component.formFirstName = 'Ada Updated';
    component.formLastName = 'Byron';
    component.formEmail = 'ada.byron@example.com';
    component.formRole = UserRole.admin;
    component.formIsActive = false;

    component.submitForm();

    expect(mockUsersService.usersUserIdPut).toHaveBeenCalledWith(
      userToEdit.id,
      {
        firstName: 'Ada Updated',
        lastName: 'Byron',
        email: 'ada.byron@example.com',
        role: UserRole.admin,
        isActive: false,
      },
    );
    expect(component.showModal()).toBe(false);
    expect(mockUsersService.usersGet).toHaveBeenCalledTimes(2);
  });

  it('should close modal and reset editing state when closeModal is called', () => {
    const userToEdit = mockResponse.users![0];
    component.openEditModal(userToEdit);
    expect(component.showModal()).toBe(true);

    component.closeModal();
    expect(component.showModal()).toBe(false);
    expect(component.editingUserId()).toBeNull();
  });
});
