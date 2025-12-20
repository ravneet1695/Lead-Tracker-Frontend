import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoalRoutingModule } from './goal-routing.module';
import { GoalListComponent } from './list/list.component';
import { GoalCreateComponent } from './create/create.component';
import { GoalEditComponent } from './edit/edit.component';
import { GoalViewComponent } from './view/view.component';

@NgModule({
    imports: [
        CommonModule,
        GoalRoutingModule,
        GoalListComponent,
        GoalCreateComponent,
        GoalEditComponent,
        GoalViewComponent
    ]
})
export class GoalModule { }
