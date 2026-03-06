import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  FormsModule as EnterpriseBuilderFormsModule,
  FormRoutes,
} from '@formio/enterprise-builder/angular';

@NgModule({
  imports: [
    CommonModule,
    EnterpriseBuilderFormsModule,
    RouterModule.forChild(FormRoutes()),
  ],
})
export class FormsModule {}
