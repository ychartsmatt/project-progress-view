import { Component, Input, OnChanges } from "@angular/core";
import * as Highcharts from 'highcharts/highcharts-gantt';
import chroma from 'chroma-js';
import { PivotalService } from "../services/pivotal";
import { Epic, Story } from "../interfaces";

@Component({
    selector: 'project-progress[token]',
    templateUrl: './project-progress.template.html'
})
export class ProjectProgressComponent implements OnChanges {
    @Input() token!: string;
    @Input() project!: string;
    @Input() longProjects!: boolean;

    Highcharts: typeof Highcharts = Highcharts;
    chart?: Highcharts.Chart;

    constructor(private pivotalService: PivotalService) {}

    ngOnChanges() {
        this.pivotalService.getEpicStories(this.token, this.project).subscribe(this.drawChart.bind(this));
    }

    drawChart(epics: Epic[]) {
        const series: Highcharts.SeriesOptionsType[] = [];
        const includeLongProjects = this.longProjects;
        
        epics.forEach(epic => {
            if (includeLongProjects || (+epic.projected_completion - +epic.start_date) < ( 60 * (1000 * 60 * 60 * 24))) {

                const tasks: Highcharts.GanttPointOptionsObject[] = [];
            
                tasks.push({
                    id: epic.id.toString(),
                    name: epic.name,
                    completed: {
                        amount: parseFloat((epic.completed_points / epic.total_points).toFixed(2))
                    },
                    color: getProjectColor(epic)
                });
                
                epic.stories.forEach(story => {
                    tasks.push({
                        id: story.id.toString(),
                        parent: epic.id.toString(),
                        dependency: tasks[-1]?.id?.toString() === epic.id.toString() ? undefined : tasks[-1]?.id?.toString(),
                        name: story.name,
                        start: story.start_date.getTime(),
                        end: story.finish_date?.getTime() || story.estimated_end_date.getTime(),
                        description: `Estimate: ${story.estimate}`,
                        color: getTaskColor(story)
                    });
                });
            
                series.push({
                    id: epic.id.toString(),
                    type: 'gantt',
                    name: epic.name,
                    data: tasks
                });
            }
        });
        

        const chartOptions: Highcharts.Options = { series }

        this.chart?.destroy();
        this.chart = new Highcharts.GanttChart('chart', chartOptions);

    }

}

function getTaskColor(story: Story): string {
    switch(story.current_state) {
        case 'finished':
        case 'delivered':
        case 'accepted':
            return 'lightblue';
            break;
        case 'started':
            return 'lightyellow';
            break;
        default:
            return 'lightgray';
    }
}

function getProjectColor(epic: Epic): string {
    const estimatedProjectTime = +epic.estimated_completion - +epic.start_date;
    const projectedProjectTime = +epic.projected_completion - +epic.start_date;

    if (estimatedProjectTime > projectedProjectTime) {
        // project is ahead of schedule
        return chroma.mix('gray', 'green', 1 - ((estimatedProjectTime - projectedProjectTime) / estimatedProjectTime)).hex();
    } else {
        // project is behind schedule
        return chroma.mix('gray', 'red', (projectedProjectTime - estimatedProjectTime) / estimatedProjectTime).hex();
    }
}