import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoalRoutingModule } from './goal-routing.module';
import { GoalListComponent } from './list/list.component';
import { GoalCreateComponent } from './create/create.component';
import { GoalEditComponent } from './edit/edit.component';
import { GoalViewComponent } from './view/view.component';
import { UserGoalsComponent } from './user-goals/user-goals.component';

@NgModule({
    imports: [
        CommonModule,
        GoalRoutingModule,
        GoalListComponent,
        GoalCreateComponent,
        GoalEditComponent,
        GoalViewComponent,
        UserGoalsComponent
    ]
})
export class GoalModule { }
