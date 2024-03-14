import { Scheduler } from './Scheduler'; // Adjust the import path as necessary

describe('Scheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    // Clear scheduledTasks before each test to ensure a clean state
    Scheduler["scheduledTasks"].clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('scheduleTask immediately executes and completes the task', () => {
    const task = jest.fn();

    const taskId = Scheduler.scheduleTask(task, 0, 'immediateTask');

    expect(task).toHaveBeenCalled();

    const taskMetadata = Scheduler['scheduledTasks'].get(taskId);

    expect(taskMetadata?.status).toBe('completed');
    expect(taskMetadata?.id).toBe(taskId)
    expect(taskMetadata?.scheduledId).toBe(null)
  });

  test('scheduleTask with delay will execute and complete the task', () => {
    const task = jest.fn();

    const taskId = Scheduler.scheduleTask(task, 100, 'immediateTask');
    let taskMetadata = Scheduler['scheduledTasks'].get(taskId);
    expect(taskMetadata?.status).toBe('scheduled')
    jest.advanceTimersByTime(1000)
    expect(task).toHaveBeenCalled();

    taskMetadata = Scheduler['scheduledTasks'].get(taskId);

    expect(taskMetadata?.status).toBe('completed');
    expect(taskMetadata?.id).toBe(taskId)
    expect(taskMetadata?.scheduledId).toBeTruthy()
  });

  test('scheduleRecurringTask schedules and executes the task repeatedly', done => {
    const task = jest.fn(() => console.log("test"))

    const result = Scheduler.scheduleRecurringTask(task, 500, 'recurringTask');
    // Verify the task is scheduled with 'scheduled' status initially
    expect(Scheduler['scheduledTasks'].get(result)?.status).toBe('scheduled');

    jest.runOnlyPendingTimers();

    jest.advanceTimersByTime(600); // Advance time by 600 to trigger the task twice

    expect(task).toHaveBeenCalledTimes(2);

    // Cleanup: Cancel the recurring task to prevent further executions
    Scheduler.cancelScheduledTask(result);

    done(); // Signal Jest that the test is complete
  });

  test('cancelScheduledTask cancels a scheduled task', () => {
    const task = jest.fn()

    const taskId = Scheduler.scheduleTask(task, 200, "testTask")

    const cancel = Scheduler.cancelScheduledTask(taskId)

    expect(cancel).toBe(true)
    expect(Scheduler['scheduledTasks'].get(taskId)?.status).toBe('canceled')
    expect(task).not.toHaveBeenCalled()
  })
})
