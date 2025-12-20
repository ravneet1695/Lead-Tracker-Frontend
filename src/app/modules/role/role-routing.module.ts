import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleListComponent } from './list/list.component';
import { RoleFormComponent } from './form/form.component';

const routes: Routes = [
    {
        path: '',
        component: RoleListComponent
    },
    {
        path: 'new',
        component: RoleFormComponent
    },
    {
        path: 'edit/:id',
        component: RoleFormComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class RoleRoutingModule { }
