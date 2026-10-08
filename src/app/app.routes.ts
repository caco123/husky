import { Routes } from '@angular/router';

import { UsersComponent } from './users/users';

export const routes: Routes = [
  { path: '', component: UsersComponent },
  { path: 'users', component: UsersComponent },
];
