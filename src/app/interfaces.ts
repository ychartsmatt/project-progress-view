export interface Project {
    id: number;
    name: string;
}

export interface Epic {
    id: number;
    name: string;
    url: string;
    label: {
        id: number;
        kind: string;
        name: string;
    }
    stories: Story[];
    start_date: Date;
    total_points: number;
    completed_points: number;
    incomplete_points: number;
    estimate_multiplier: number;
    estimated_days: number;
    remaining_days: number;
    estimated_completion: Date;
    projected_completion: Date;
}

export interface Story {
    id: Number;
    accepted_at: string;
    current_state: string;
    description: string;
    estimate: number;
    name: string;
    labels: [{
        id: Number;
        kind: string;
        name: string;
    }],
    owned_by_id:number;
    owner_ids: number[];
    requested_by_id: number;
    story_priority: string;
    story_type: string;
    url: string;
    transitions: [{
        occurred_at: string;
        state: string;
    }];
    start_date: Date;
    finish_date: Date;
    estimated_end_date: Date;
}

export interface User {
    id: number;
}