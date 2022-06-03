import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HighchartsChartModule } from 'highcharts-angular';
import { AppComponent } from './app.component';
import { ProjectProgressComponent } from './components/project-progress.component';

@NgModule({
  declarations: [
    AppComponent,
    ProjectProgressComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HighchartsChartModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
