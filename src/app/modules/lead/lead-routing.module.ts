import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../guards/auth.guard';
import { CreateLeadComponent } from './create-lead/create-lead.component';
import { EditLeadComponent } from './edit-lead/edit-lead.component';
import { MyLeadsComponent } from './my-leads/my-leads.component';

const routes: Routes = [
    {
        path: '',
        component: MyLeadsComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'create/:goalId',
        component: CreateLeadComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'edit/:entryId',
        component: EditLeadComponent,
        canActivate: [AuthGuard]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class LeadRoutingModule { }
