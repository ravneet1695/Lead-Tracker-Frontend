import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RoleRoutingModule } from './role-routing.module';
import { RoleListComponent } from './list/list.component';
import { RoleFormComponent } from './form/form.component';

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RoleRoutingModule,
        RoleListComponent,
        RoleFormComponent
    ]
})
export class RoleModule { }
