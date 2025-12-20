import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MasterConfigListComponent } from './list/list.component';

const routes: Routes = [
    {
        path: '',
        component: MasterConfigListComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class MasterConfigRoutingModule { }
