import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Project, Epic, Story, User } from '../interfaces';

import * as moment from 'moment-business-days';
import holidays from '../ycharts-holidays.json';

const BASE_URL = 'https://www.pivotaltracker.com/services/v5'

moment.updateLocale('us', {
    holidays,
    holidayFormat: 'YYYY-MM-DD'
});

@Injectable({
    providedIn: 'root'
})
export class PivotalService {

    getProjects(token: string): Observable<Project[]> {
        const result = fetch(`${BASE_URL}/projects`, { headers: { 'X-TrackerToken': token } })
            .then(res => res.json())
            .then((res: Project[]) => res as Project[]);

        return from(result);
    }

    getEpics(token: string, project: string): Observable<Epic[]> {
        const result = fetch(`${BASE_URL}/projects/${project}/epics?&fields=${encodeURIComponent('id,name,url,label,completed_at')}`, { headers: { 'X-TrackerToken': token } })
            .then(res => res.json())
            .then((res: Epic[]) => res as Epic[])
            .then(res => res.filter(epic => !epic.hasOwnProperty('completed_at'))); // filter out 'done' epics

        return from(result);
    }

    getStories(token: string, project: string, labels: string[]): Observable<Story[]> {
        const result = fetch(`${BASE_URL}/projects/${project}/stories?filter=${encodeURIComponent(labels.join(' OR '))}&limit=10000&fields=${encodeURIComponent('id,name,url,owner_ids,current_state,estimate,labels,owner_ids,created_at,accepted_at,transitions')}`, { headers: { 'X-TrackerToken': token } })
            .then(res => res.json())
            .then((res: Story[]) => res as Story[]);

        return from(result);
    }

    getEpicStories(token: string, project: string): Observable<Epic[]> {
        return new Observable<Epic[]>((observer) => {
            return this.getEpics(token, project).subscribe(epics => {
                const filters = epics.map(epic => `epic:"${epic.label.name}"`)

                this.getStories(token, project, filters).subscribe(stories => {
                    // use the sorting hat to put each story into its parent epic
                    stories.forEach(story => {

                        // determine when the story was completed, if it has been. 
                        switch(story.current_state) {
                            case 'accepted':
                                story.finish_date = new Date(story.accepted_at)
                                break;
                            case 'delievered':
                                const delivered = story.transitions.find(t => t.state === 'delivered');
                                if (delivered) story.finish_date = new Date(delivered.occurred_at);
                                break;
                            case 'finished':
                                const finished = story.transitions.find(t => t.state === 'finished');
                                if (finished) story.finish_date = new Date(finished.occurred_at);
                                break;
                        }

                        // determine start date of story
                        const startTransition = story.transitions.find(t => ['started','planned'].includes(t.state))
                        if (startTransition) story.start_date = new Date(startTransition.occurred_at);

                        const epic = epics.find(epic => story.labels.some(label => label.id === epic.label.id));
                        
                        if (epic) {
                            if (!epic.stories || !epic.stories.length) epic.stories = [];
                            
                            // if start date wasn't set, set it to the end date of the previous story or today
                            if (!story.start_date) story.start_date = epic.stories[-1]?.finish_date || epic.stories[-1]?.estimated_end_date || new Date()

                            // set the estimated end date based on the start date and the estimate
                            story.estimated_end_date = moment(story.start_date).businessAdd(((story.estimate || 1) * epic.estimate_multiplier) / 3).toDate();

                            epic.stories.push(story);
                        }
                    })

                    // get rid of epics without any stories
                    epics = epics.filter(epic => epic?.stories)

                    // with the stories added to the epics, calculate some stats about the epic
                    epics.forEach(epic => {
                        // set the epic start date to the earliest story's start date, otherwise today is the day
                        epic.start_date =  epic.stories.reduce((val, story) => story?.start_date < val ? story.start_date : val, new Date());

                        // tally up the total points and completed/incomplete in the epic
                        epic.total_points = epic.stories.reduce((val, story) => (story.estimate || 0) + val, 0);
                        epic.completed_points = epic.stories.reduce((val, story) => story.finish_date ? (story.estimate || 0) + val : val, 0);
                        epic.incomplete_points = epic.stories.reduce((val, story) => !story.finish_date ? (story.estimate || 0) + val: val, 0);
                        
                        // determine multiplier and estimated days (https://github.com/ycharts/ycharts/wiki/Project-Planning-Guide#step-5---create-pivotal-tracker-items)
                        if (epic.total_points >= 35) epic.estimate_multiplier = 3.5;
                        else if (epic.total_points >= 25) epic.estimate_multiplier = 2.5;
                        else if (epic.total_points >= 15) epic.estimate_multiplier = 2;
                        else epic.estimate_multiplier = 1.5;

                        epic.estimated_days = (epic.total_points * epic.estimate_multiplier) / 3;
                        epic.remaining_days = (epic.incomplete_points * epic.estimate_multiplier) / 3;

                        // put some dates to these estimates
                        epic.estimated_completion = moment(epic.start_date).businessAdd(epic.estimated_days).toDate();
                        epic.projected_completion = moment().businessAdd(epic.remaining_days).toDate();

                    })

                    observer.next(epics);
                })
            });
        });
    }

    getUsers(token: string, project: string): Observable<User[]> {
        const result = fetch(`${BASE_URL}/projects/${project}/memberships`, { headers: { 'X-TrackerToken': token } })
            .then(res => res.json())
            .then((res) => res.map((item: { person: User; }) => item?.person as User));

        return from(result);
    }

}
