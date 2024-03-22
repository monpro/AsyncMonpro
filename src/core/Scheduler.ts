type ScheduledTaskMetadata = {
  id: string
  name: string
  scheduledId: NodeJS.Timeout | null // Timeout for setTimeout and Interval for setInterval
  task: () => void,
  status: ScheduledTaskStatus
  dependencies?: string[] // list of dependency task ids
  retryCount?: number;
  maxRetries?: number;
  delay?: number; // Consider storing the original delay for retry purposes
  [key: string]: any // additional metadata
}

type ScheduledTaskStatus = 'scheduled' | 'waiting' |'executing' | 'completed' | 'canceled' | 'failed' | 'retrying'

export class Scheduler {
  private static scheduledTasks: Map<string, ScheduledTaskMetadata> = new Map<string, ScheduledTaskMetadata>()
  private static lastTimestamp = -1;
  private static sequence = 0;

  static onTaskStart: (id: string, name: string) => void = () => {};
  static onTaskComplete: (id: string, name: string) => void = () => {};
  static onTaskFail: (id: string, name: string, error: unknown) => void = () => {};
  static onTaskRetry: (id: string, name: string, attempt: number, limit: number) => void = () => {};

  /**
   * Schedules a task for execution.
   * @param {Function} task The task function to be executed.
   * @param {number} delay The delay in milliseconds before the task is executed.
   * @param {string} name The name of the task.
   * @param {Object} metadata Additional metadata for the task.
   * @param {string[]} dependencies Task IDs that this task depends on.
   * @param {number} [maxRetries=0] The maximum number of retries for the task upon failure.
   */
  static scheduleTask(
    task: () => void,
    delay: number = 0,
    name: string,
    metadata: Object = {},
    dependencies: string[] = [],
    maxRetries: number = 0): string {
    const id = this.generateUniqueId();
    const taskMetadata: ScheduledTaskMetadata = {
      id,
      name,
      scheduledId: null,
      task: task,
      status: 'scheduled',
      retryCount: 0,
      maxRetries,
      delay,
      ...metadata,
      dependencies,
    };

    this.scheduledTasks.set(id, taskMetadata);
    // Check dependencies before scheduling
    if (dependencies.length === 0 || this.allDependenciesMet(dependencies)) {
      this.executeOrDelayTask(id);
    } else {
      // If dependencies are not met, monitor and wait
      taskMetadata.status = 'waiting';
      const dependencyCheckInterval = setInterval(() => {
        if (this.allDependenciesMet(dependencies)) {
          clearInterval(dependencyCheckInterval);
          this.executeOrDelayTask(id);
        }
      }, 100); // Check every 100ms
    }

    return id;
  }

  private static executeOrDelayTask(id: string) {
    const taskMetadata = this.scheduledTasks.get(id);
    if (!taskMetadata) return;
    const { task, delay, name } = taskMetadata;

    const execute = () => {
      this.onTaskStart(id, taskMetadata.name);
      this.updateTaskStatus(id, 'executing');
      try {
        task();
        this.updateTaskStatus(id, 'completed');
        this.onTaskComplete(id, taskMetadata.name);
      } catch (error) {
        this.handleTaskFailure(id, error);
      }
    };

    if (delay === 0) {
      execute();
    } else {
      taskMetadata.scheduledId = setTimeout(execute, delay);
      this.scheduledTasks.set(id, taskMetadata);
    }
  }

  private static handleTaskFailure(id: string, error: any) {
    const taskMetadata = this.scheduledTasks.get(id);
    if (!taskMetadata) return;

    const { name, retryCount = 0, maxRetries = 0, delay = 0 } = taskMetadata;

    if (retryCount < maxRetries) {
      taskMetadata.retryCount = retryCount + 1;
      this.updateTaskStatus(id, 'retrying');
      setTimeout(() => this.executeOrDelayTask(id), delay);
      this.onTaskRetry(id, name, taskMetadata.retryCount, maxRetries);
    } else {
      this.updateTaskStatus(id, 'failed');
      this.onTaskFail(id, name, error);
    }

    this.scheduledTasks.set(id, taskMetadata);
  }

  public static updateTaskStatus(id: string, status: ScheduledTaskStatus) {
    const taskMetadata = this.scheduledTasks.get(id);
    if (taskMetadata) {
      taskMetadata.status = status;
      this.scheduledTasks.set(id, taskMetadata);
    }
  }

  private static allDependenciesMet(dependencies: string[]): boolean {
    return dependencies.every(depId => {
      const depTask = this.scheduledTasks.get(depId);
      return depTask && depTask.status === 'completed';
    });
  }

  // TODO: Add retry for scheduleRecurringTask
  static scheduleRecurringTask(
    task: () => void,
    interval: number,
    name: string,
    metadata: Object = {},
    maxRetries: number = 0
  ): string {
    const id = this.generateUniqueId();
    let retryCount = 0;
    let scheduledId;

    const executeTask = () => {
      this.onTaskStart(id, name);
      try {
        task();
        retryCount = 0; // Reset retry count on successful execution
        this.onTaskComplete(id, name);
        // Task succeeded; schedule the next execution after the specified interval
        setTimeout(executeTask, interval);
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++;
          this.onTaskRetry(id, name, retryCount, maxRetries);
          // Task failed but has retries left; retry immediately
          setTimeout(executeTask, interval);
        } else {
          // Task failed and exhausted all retries; report failure
          this.onTaskFail(id, name, error);
          retryCount = 0; // Reset retry count
          // Do not schedule the next execution; the task cycle ends here until manually restarted
        }
      }
    };

    // Initially schedule the task execution
    scheduledId = setTimeout(executeTask, interval);

    // Update task metadata with the scheduledId for potential cancellation
    const taskMetadata: ScheduledTaskMetadata = {
      id,
      name,
      scheduledId,
      status: 'scheduled',
      task,
      retryCount: 0,
      maxRetries,
      delay: interval,
      ...metadata,
    };

    this.scheduledTasks.set(id, taskMetadata);

    return id;
  }

  static cancelScheduledTask(id: string): boolean {
    const task = this.scheduledTasks.get(id)

    if (task && task.scheduledId) {
      clearTimeout(task.scheduledId)
      clearInterval(task.scheduledId)
      task.status = 'canceled'
      return true
    }
    return false
  }
  // TODO: refactor the algorithm to snowflake
  public static generateUniqueId(): string {
    const timestamp = Date.now()
    if (this.lastTimestamp === timestamp) {
      this.sequence = (this.sequence + 1) & 4095
      if (this.sequence === 0) {
        // wait for next mills
        while (Date.now() <= timestamp){}
      }
    } else {
      this.sequence = 0;
    }
    this.lastTimestamp = timestamp;

    return `${timestamp}-${this.sequence}`
  }

}
