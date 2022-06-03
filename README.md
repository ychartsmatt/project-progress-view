# Project Progress View

Have you ever wished that you could see a current status snapshot of your in-flight projects, but Pivotal is too limiting for that? Well, wish no more! 

This app uses the Pivotal API to fetch epic/story data, and runs it through our estimation algorithm to generate estimated delivery dates for the project. It also consideres complete tasks and extrapolates out incomplete work to give an updated estimation of when the project is projected to finish based on current progress. 

## Getting Started

Clone this repository to your local. Copy `.env.default` to a file named `.env` and add your [Pivotal API token](https://www.pivotaltracker.com/help/articles/api_token/) value to the file. 

## Development Server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.
