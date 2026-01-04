import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    {
        path: 'login',
        loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule)
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'goals',
        loadChildren: () => import('./modules/goal/goal.module').then(m => m.GoalModule),
        canActivate: [AuthGuard]
    },
    {
        path: 'leads',
        loadChildren: () => import('./modules/lead/lead.module').then(m => m.LeadModule),
        canActivate: [AuthGuard]
    },
    {
        path: 'organizations',
        loadChildren: () => import('./modules/organization/organization.module').then(m => m.OrganizationModule),
        canActivate: [AuthGuard],
        data: { role: 'super_admin' }
    },
    {
        path: 'users',
        loadChildren: () => import('./modules/user/user.module').then(m => m.UserModule),
        canActivate: [AuthGuard],
        data: { permissions: ['users.read'] }
    },
    {
        path: 'audit-logs',
        loadComponent: () => import('./modules/audit-logs/list/list.component').then(m => m.AuditLogsListComponent),
        canActivate: [AuthGuard],
        data: { permissions: ['audit-logs.read'] }
    },
    {
        path: 'roles',
        loadChildren: () => import('./modules/role/role.module').then(m => m.RoleModule),
        canActivate: [AuthGuard],
        data: { permissions: ['roles.read'] }
    },
    {
        path: 'groups',
        loadChildren: () => import('./modules/group/group.module').then(m => m.GroupModule),
        canActivate: [AuthGuard],
        data: { permissions: ['groups.read'] }
    },
    // Catch-all route - must be last
    { path: '**', redirectTo: '/login' }
];

