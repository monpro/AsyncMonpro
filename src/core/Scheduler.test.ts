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

describe('Scheduler.generateUniqueId', () => {
  test('generates unique IDs', () => {
    const ids = new Set();
    const iterations = 5000; // Generate a large number of IDs

    for (let i = 0; i < iterations; i++) {
      // Assuming generateUniqueId is accessible for testing
      const id = Scheduler.generateUniqueId();
      ids.add(id);
    }

    expect(ids.size).toBe(iterations); // Expect all generated IDs to be unique
  });

  test('IDs follow the expected format', () => {
    const id = Scheduler.generateUniqueId();
    expect(id).toMatch(/^\d+-\d+$/); // Matches '{timestamp}-{sequence}'
  });

  test('sequence resets when the timestamp changes', async () => {
    // This test assumes you can simulate or control time progression
    const firstId = Scheduler.generateUniqueId();
    const [firstTimestamp, _] = firstId.split('-').map(Number);

    jest.advanceTimersByTime(1); // Advance time by 1ms to trigger the task twice

    const secondId = Scheduler.generateUniqueId();
    const [secondTimestamp, secondSequence] = secondId.split('-').map(Number);

    expect(secondTimestamp).toBeGreaterThan(firstTimestamp); // Ensure timestamp increased
    expect(secondSequence).toBe(0); // Ensure sequence reset for the new timestamp
  });

  describe('Scheduler Dependency Checks', () => {
    const createMockTask = () => jest.fn(() => {});
    test('Task without dependencies executes immediately', () => {
      jest.useFakeTimers();
      const task = createMockTask();
      const taskId = Scheduler.scheduleTask(task, 0, 'noDepsTask', {});

      jest.runAllTimers();
      const taskMetadata = Scheduler['scheduledTasks'].get(taskId);
      expect(task).toHaveBeenCalled();
      expect(taskMetadata?.status).toBe('completed');
    });

    test('Task with met dependencies executes', () => {
      const depTask = createMockTask();
      const taskIdWithDeps = Scheduler.scheduleTask(depTask, 0, 'depTask', {});
      Scheduler.updateTaskStatus(taskIdWithDeps, 'completed'); // Manually set dependency as completed

      const mainTask = createMockTask();
      const taskId = Scheduler.scheduleTask(mainTask, 0, 'mainTask', {}, [taskIdWithDeps]);

      expect(mainTask).toHaveBeenCalled();
      const mainTaskMetadata = Scheduler['scheduledTasks'].get(taskId);
      expect(mainTaskMetadata?.status).toBe('completed');
    });

    test('Task with unmet dependencies waits', () => {
      const depTask = createMockTask();
      const taskIdWithUnmetDeps = Scheduler.scheduleTask(depTask, 100000, 'unmetDepTask', {});

      const waitingTask = createMockTask();
      const taskId = Scheduler.scheduleTask(waitingTask, 0, 'waitingTask', {}, [taskIdWithUnmetDeps]);

      expect(waitingTask).not.toHaveBeenCalled();
      const waitingTaskMetadata = Scheduler['scheduledTasks'].get(taskId);
      expect(waitingTaskMetadata?.status).toBe('waiting');
    });
  })
});
