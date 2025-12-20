import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterConfigRoutingModule } from './master-config-routing.module';
import { MasterConfigListComponent } from './list/list.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        MasterConfigRoutingModule,
        MasterConfigListComponent
    ]
})
export class MasterConfigModule { }
