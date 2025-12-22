import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../guards/auth.guard';
import { GoalListComponent } from './list/list.component';
import { GoalCreateComponent } from './create/create.component';
import { GoalEditComponent } from './edit/edit.component';
import { GoalViewComponent } from './view/view.component';
import { UserGoalsComponent } from './user-goals/user-goals.component';

const routes: Routes = [
    // User routes (no special permissions required)
    {
        path: '',
        component: UserGoalsComponent,
        canActivate: [AuthGuard]
    },

    // Admin routes (require permissions)
    {
        path: 'manage',
        component: GoalListComponent,
        canActivate: [AuthGuard],
        data: { permissions: ['goals.read'] }
    },
    {
        path: 'manage/create',
        component: GoalCreateComponent,
        canActivate: [AuthGuard],
        data: { permissions: ['goals.create'] }
    },
    {
        path: 'manage/:id',
        component: GoalViewComponent,
        canActivate: [AuthGuard],
        data: { permissions: ['goals.read'] }
    },
    {
        path: 'manage/:id/edit',
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
