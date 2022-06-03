import { Component, OnInit } from '@angular/core';
import { Project } from './interfaces';
import { PivotalService } from './services/pivotal';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'project-progress-view';
  token?: string;
  projects: Project[] = [];
  selectedProject: string = ''
  showLongProjects: boolean = false;

  constructor(private pivotalService: PivotalService) {
    this.token = process.env['NG_APP_PIVOTAL_API_TOKEN'] as string;
  }
  
  ngOnInit(): void {
    if (this.token) {
      this.pivotalService.getProjects(this.token)
        .subscribe((projects) => {
          this.projects = projects
        });
    }
  }

  onSelectProject(id: string): void {
    this.selectedProject = id;
  } 

}
