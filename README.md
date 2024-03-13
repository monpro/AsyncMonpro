# AsyncMonpro

AsyncMonpro is a modern, lightweight asynchronous task execution framework designed for Node.js, built with TypeScript. It simplifies handling asynchronous operations by providing powerful features for task scheduling, concurrency control, error handling, and priority queuing. Whether you're building web applications, microservices, or any backend system that requires advanced async task management, AsyncMonpro offers the tools you need to make your code more efficient and readable.

## Features

- **Task Scheduling**: Schedule tasks to run immediately, after a delay, or at specified intervals, offering fine-grained control over task execution timing.
- **Concurrency Control**: Limit the number of tasks running concurrently to optimize resource utilization and prevent overload.
- **Error Handling**: Robust mechanisms for catching and managing errors from asynchronous tasks, ensuring your application remains stable and reliable.
- **Priority Queuing**: Prioritize tasks based on importance, ensuring critical operations are executed first.
- **Advanced Features**: Includes support for task dependencies, rate limiting, automatic retries, and integrated logging for comprehensive task management and monitoring.

## Usage
Here's a simple example to get you started with AsyncMonpro:

```
   import { Scheduler, ConcurrencyController } from 'asyncmonpro';

// Create a scheduler instance
const scheduler = new Scheduler();

// Schedule a task to run immediately
scheduler.scheduleTask(() => console.log('Task runs immediately'));

// Schedule a task to run after 2 seconds
scheduler.scheduleTask(() => console.log('Task runs after 2 seconds'), 2000);

// Create a concurrency controller with a limit of 3 concurrent tasks
const concurrencyController = new ConcurrencyController(3);

// Function to simulate asynchronous tasks
const asyncTask = (name: string) => new Promise<void>((resolve) =>
  setTimeout(() => {
    console.log(`${name} completed`);
    resolve();
  }, 1000)
);

// Execute multiple tasks with concurrency control
for (let i = 0; i < 5; i++) {
  concurrencyController.executeTask(() => asyncTask(`Task ${i + 1}`), (error) => console.error(error));
}

```
