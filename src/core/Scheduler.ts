type ScheduledTaskMetadata = {
  id: string
  name: string
  scheduledId: NodeJS.Timeout | null // Timeout for setTimeout and Interval for setInterval
  status: ScheduledTaskStatus
  dependencies?: string[] // list of dependency task ids
  [key: string]: any // additional metadata
}

type ScheduledTaskStatus = 'scheduled' | 'waiting' |'executing' | 'completed' | 'canceled' | 'failed'

export class Scheduler {
  private static scheduledTasks: Map<string, ScheduledTaskMetadata> = new Map<string, ScheduledTaskMetadata>()
  private static lastTimestamp = -1;
  private static sequence = 0;

  static onTaskStart: (id: string, name: string) => void = () => {};
  static onTaskComplete: (id: string, name: string) => void = () => {};
  static onTaskFail: (id: string, name: string, error: unknown) => void = () => {};


  static scheduleTask(task: () => void, delay: number = 0, name: string, metadata: Object = {}, dependencies: string[] = []): string {
    const id = this.generateUniqueId();
    const taskMetadata: ScheduledTaskMetadata = {
      id,
      name,
      scheduledId: null,
      status: 'scheduled',
      ...metadata,
      dependencies,
    };

    this.scheduledTasks.set(id, taskMetadata);
    // Check dependencies before scheduling
    if (dependencies.length === 0 || this.allDependenciesMet(dependencies)) {
      this.executeOrDelayTask(task, delay, id, taskMetadata);
    } else {
      // If dependencies are not met, monitor and wait
      taskMetadata.status = 'waiting';
      const dependencyCheckInterval = setInterval(() => {
        if (this.allDependenciesMet(dependencies)) {
          clearInterval(dependencyCheckInterval);
          this.executeOrDelayTask(task, delay, id, taskMetadata);
        }
      }, 100); // Check every 100ms
    }

    return id;
  }

  private static executeOrDelayTask(task: () => void, delay: number, id: string, taskMetadata: ScheduledTaskMetadata) {
    const execute = () => {
      this.onTaskStart(id, taskMetadata.name);
      this.updateTaskStatus(id, 'executing');
      try {
        task();
        this.updateTaskStatus(id, 'completed');
        this.onTaskComplete(id, taskMetadata.name);
      } catch (error) {
        this.updateTaskStatus(id, 'failed');
        this.onTaskFail(id, taskMetadata.name, error)
      }
    };

    if (delay === 0) {
      execute();
    } else {
      taskMetadata.scheduledId = setTimeout(execute, delay);
      this.scheduledTasks.set(id, taskMetadata);
    }
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

  static scheduleRecurringTask(task: () => void, interval: number, name: string, metadata: Object = {}): string {
    const id = this.generateUniqueId()
    const scheduledId = setInterval(() => {
      const currentTask = this.scheduledTasks.get(id)
      if (currentTask) {
        currentTask.status = 'executing'
      }
      task()
    }, interval)

    const taskMetadata: ScheduledTaskMetadata = {
      id,
      name,
      scheduledId,
      status: 'scheduled', ...metadata
    };
    this.scheduledTasks.set(id, taskMetadata)
    return id
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
