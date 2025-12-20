import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../guards/auth.guard';
import { OrganizationListComponent } from './list/list.component';
import { OrganizationFormComponent } from './form/form.component';

const routes: Routes = [
    {
        path: '',
        component: OrganizationListComponent,
        canActivate: [AuthGuard],
        data: { role: 'super_admin' }
    },
    {
        path: 'new',
        component: OrganizationFormComponent,
        canActivate: [AuthGuard],
        data: { role: 'super_admin' }
    },
    {
        path: ':id/edit',
        component: OrganizationFormComponent,
        canActivate: [AuthGuard],
        data: { role: 'super_admin' }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class OrganizationRoutingModule { }
