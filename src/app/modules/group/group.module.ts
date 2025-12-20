import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GroupRoutingModule } from './group-routing.module';
import { GroupListComponent } from './list/list.component';
import { GroupFormComponent } from './form/form.component';

@NgModule({
    declarations: [
        GroupListComponent,
        GroupFormComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        GroupRoutingModule
    ]
})
export class GroupModule { }
