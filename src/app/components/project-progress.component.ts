import { Component, Input, OnChanges } from "@angular/core";
import { formatDate } from "@angular/common";
import * as Highcharts from 'highcharts/highcharts-gantt';
import chroma from 'chroma-js';
import { PivotalService } from "../services/pivotal";
import { Epic, GanttPoint, Story, TooltipLine, User } from "../interfaces";

@Component({
    selector: 'project-progress[token]',
    templateUrl: './project-progress.template.html'
})
export class ProjectProgressComponent implements OnChanges {
    @Input() token!: string;
    @Input() project!: string;
    @Input() longProjects!: boolean;

    users: User[] = [];

    Highcharts: typeof Highcharts = Highcharts;
    chart?: Highcharts.Chart;

    constructor(private pivotalService: PivotalService) {}

    ngOnChanges() {
        this.pivotalService.getUsers(this.token, this.project).subscribe((users: User[]) => this.users = users);
        this.pivotalService.getEpicStories(this.token, this.project).subscribe(this.drawChart.bind(this));
    }

    drawChart(epics: Epic[]) {
        const series: Highcharts.SeriesOptionsType[] = [];
        const includeLongProjects = this.longProjects;
        
        epics.forEach(epic => {
            if (includeLongProjects || (+epic.projected_completion - +epic.start_date) < ( 60 * (1000 * 60 * 60 * 24))) {

                const tasks: Highcharts.GanttPointOptionsObject[] = [];
                const users = this.users;
            
                tasks.push({
                    id: epic.id.toString(),
                    name: epic.name,
                    completed: {
                        amount: parseFloat((epic.completed_points / epic.total_points).toFixed(2))
                    },
                    color: getProjectColor(epic),
                    custom: {
                        points: epic.total_points,
                        epicEstimatedCompletion: epic.estimated_completion,
                        epicProjectedCompletion: epic.projected_completion
                    }
                });
                
                epic.stories.forEach(story => {
                    tasks.push({
                        id: story.id.toString(),
                        parent: epic.id.toString(),
                        // make the task depend on the previous one, if one exists
                        dependency: tasks[-1]?.id?.toString() === epic.id.toString() ? undefined : tasks[-1]?.id?.toString(),
                        name: story.name,
                        start: story.start_date.getTime(),
                        end: story.finish_date?.getTime() || story.estimated_end_date.getTime(),
                        description: `Estimate: ${story.estimate}`,
                        color: getTaskColor(story),
                        custom: {
                            points: story.estimate,
                            status: story.current_state,
                            finished: story.finish_date ? true : false,
                            owner: story.owner_ids.length ? users.find(user => user.id === story.owner_ids[0])?.name : ''
                        }
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
        

        const chartOptions: Highcharts.Options = { 
            series,
            tooltip: {
                pointFormatter: function (): string {
                    const point = this as GanttPoint;
                    const lines: TooltipLine[] = [];
                    const custom = point?.options?.custom;

                    lines.push({
                        value: point.name,
                        style: 'font-weight: bold;'
                    });
                    
                    if (custom?.['points']) {
                        lines.push({
                            title: 'Story Points',
                            value: custom['points']
                        });
                    }
                    
                    lines.push({
                        title: 'Start',
                        value: formatDate(point.start, 'shortDate', 'en-US')
                    });

                    if (custom?.['epicEstimatedCompletion'] && custom?.['epicProjectedCompletion']) {
                        lines.push({
                            title: 'Est. Completion',
                            value: formatDate(custom['epicEstimatedCompletion'], 'shortDate', 'en-US')
                        }, {
                            title: 'Proj. Completion',
                            value: formatDate(custom['epicProjectedCompletion'], 'shortDate', 'en-US')
                        });
                    } else {
                        lines.push({
                            title: custom?.['finished'] ? 'Finished' : 'Est. Completion',
                            value: formatDate(point.end, 'shortDate', 'en-US')
                        });
                    }
                    
                    if (custom?.['owner']) {
                        lines.push({
                            title: 'Owner',
                            value: custom['owner']
                        })
                    }

                    return lines.reduce((str, line: TooltipLine) => {
                        return str + `
                            <span style="${line.style || 'font-size: 0.8em;'}">
                                ${line.title ? line.title + ': ' : ''}
                                ${line.value}
                            </span><br>
                        `
                    }, '');
                }
            },
            title: {
                text: 'Active Projects'
            }
        }

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
