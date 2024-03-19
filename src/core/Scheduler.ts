type ScheduledTaskMetadata = {
  id: string
  name: string
  scheduledId: NodeJS.Timeout | null // Timeout for setTimeout and Interval for setInterval
  status: 'scheduled' | 'executing' | 'completed' | 'canceled'
  [key: string]: any // additional metadata
}


export class Scheduler {
  private static scheduledTasks: Map<string, ScheduledTaskMetadata> = new Map<string, ScheduledTaskMetadata>()
  private static lastTimestamp = -1;
  private static sequence = 0;
  static scheduleTask(task: () => void, delay: number = 0, name: string, metadata: Object = {}): string {
    const id = this.generateUniqueId()
    const taskMetadata: ScheduledTaskMetadata = {
      id,
      name,
      scheduledId: null, // This will be updated below
      status: 'scheduled', // Initial status
      ...metadata
    };

    if (delay === 0) {
      taskMetadata.status = 'executing'
      this.scheduledTasks.set(id, taskMetadata)
      task()
      taskMetadata.status = 'completed'
      return id
    } else {
      taskMetadata.scheduledId = setTimeout(() => {
        taskMetadata.status = 'executing'
        task()
        taskMetadata.status = 'completed'
      }, delay);
      this.scheduledTasks.set(id, taskMetadata)
      return id
    }
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
