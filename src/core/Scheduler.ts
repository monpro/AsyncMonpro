type ScheduledTaskMetadata = {
  id: string
  name: string
  scheduledId: NodeJS.Timeout | null // Timeout for setTimeout and Interval for setInterval
  // status: 'scheduled' | 'executing' | 'completed' | 'canceled'
  [key: string]: any // additional metadata
}


export class Scheduler {
  private static scheduledTasks: Map<string, ScheduledTaskMetadata> = new Map<string, ScheduledTaskMetadata>()
  static scheduleTask(task: () => void, delay: number = 0, name: string, metadata: Object = {}): string {
    const id = this.generateUniqueId()
    const scheduledId = delay === 0 ? null : setTimeout(() => {
      task()
    }, delay)

    const taskMetadata: ScheduledTaskMetadata = { id, name, scheduledId, ...metadata };
    this.scheduledTasks.set(id, taskMetadata)
    if (delay === 0) {
      task();
    }
    return id
  }

  static scheduleRecurringTask(task: () => void, interval: number, name: string, metadata: Object = {}): string {
    const id = this.generateUniqueId()
    const scheduledId = setInterval(task, interval)
    const taskMetadata: ScheduledTaskMetadata = {
      id,
      name,
      scheduledId,
      ...metadata
    }
    this.scheduledTasks.set(id, taskMetadata)
    return id
  }

  static cancelScheduledTask(id: string) : boolean {
    const task = this.scheduledTasks.get(id)

    if (task && task.scheduledId) {
      clearTimeout(task.scheduledId)
      clearInterval(task.scheduledId)
      this.scheduledTasks.delete(id)
      return true
    }

    return false
  }

  // TODO: refactor the algorithm to snowflake
  private static generateUniqueId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
