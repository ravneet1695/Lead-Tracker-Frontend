import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../guards/auth.guard';
import { GoalListComponent } from './list/list.component';
import { GoalCreateComponent } from './create/create.component';
import { GoalEditComponent } from './edit/edit.component';
import { GoalViewComponent } from './view/view.component';

const routes: Routes = [
    {
        path: '',
        component: GoalListComponent,
        canActivate: [AuthGuard],
        data: { permissions: ['goals.read'] }
    },
    {
        path: 'create',
        component: GoalCreateComponent,
        canActivate: [AuthGuard],
        data: { permissions: ['goals.create'] }
    },
    {
        path: ':id',
        component: GoalViewComponent,
        canActivate: [AuthGuard],
        data: { permissions: ['goals.read'] }
    },
    {
        path: ':id/edit',
        component: GoalEditComponent,
        canActivate: [AuthGuard],
        data: { permissions: ['goals.update'] }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class GoalRoutingModule { }
