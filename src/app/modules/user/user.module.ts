import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UserListComponent } from './list/list.component';
import { UserFormComponent } from './form/form.component';

const routes: Routes = [
    { path: '', component: UserListComponent },
    { path: 'new', component: UserFormComponent },
    { path: ':id/edit', component: UserFormComponent }
];

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule.forChild(routes)
    ]
})
export class UserModule { }
