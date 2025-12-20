import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganizationRoutingModule } from './organization-routing.module';
import { OrganizationListComponent } from './list/list.component';
import { OrganizationFormComponent } from './form/form.component';

@NgModule({
    imports: [
        CommonModule,
        OrganizationRoutingModule,
        OrganizationListComponent,
        OrganizationFormComponent
    ]
})
export class OrganizationModule { }
