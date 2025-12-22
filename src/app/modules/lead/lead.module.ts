import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeadRoutingModule } from './lead-routing.module';
import { CreateLeadComponent } from './create-lead/create-lead.component';
import { EditLeadComponent } from './edit-lead/edit-lead.component';
import { MyLeadsComponent } from './my-leads/my-leads.component';

@NgModule({
    imports: [
        CommonModule,
        LeadRoutingModule,
        CreateLeadComponent,
        EditLeadComponent,
        MyLeadsComponent
    ]
})
export class LeadModule { }
