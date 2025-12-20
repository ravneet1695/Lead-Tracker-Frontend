import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GroupListComponent } from './list/list.component';
import { GroupFormComponent } from './form/form.component';
import { AuthGuard } from '../../guards/auth.guard';

const routes: Routes = [
    {
        path: '',
        component: GroupListComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'new',
        component: GroupFormComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'edit/:id',
        component: GroupFormComponent,
        canActivate: [AuthGuard]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class GroupRoutingModule { }
