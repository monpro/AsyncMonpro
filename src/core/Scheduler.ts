export class Scheduler {
  static scheduleTask(task: () => void, delay: number = 0): NodeJS.Timeout {
    if (delay === 0) {
      task();
      return
    }
    return setTimeout(task, delay);
  }

  static scheduleRecurringTask(task: () => void, interval: number): NodeJS.Timeout {
    return setInterval(task, interval);
  }
}
