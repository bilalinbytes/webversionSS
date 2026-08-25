/**
 * O2Plus Mobile Notification Schedule & Manager
 *
 * Handles:
 * 1. Doctor advice received (immediate)
 * 2. Daily AQI alerts (8:00 AM & 5:00 PM)
 * 3. Medication reminders (Morning: 8am–10am, Afternoon: 1pm–3pm, Night: 8pm–10pm)
 * 4. Daily log reminders (9:00 AM & 9:00 PM if not logged yet)
 */

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  category: "advice" | "aqi" | "medication" | "log_reminder";
  scheduledHour: number;
  scheduledMinute: number;
}

export const NOTIFICATION_SCHEDULES: ScheduledNotification[] = [
  {
    id: "aqi_morning",
    title: "🌤️ O2Plus · Morning Air Quality Alert",
    body: "Check today's AQI and weather forecast to plan outdoor breathing precautions.",
    timeLabel: "8:00 AM",
    category: "aqi",
    scheduledHour: 8,
    scheduledMinute: 0,
  },
  {
    id: "med_morning",
    title: "💊 Morning Medication Reminder",
    body: "Time for your morning dose (8:00 AM – 10:00 AM). Please take as prescribed by your doctor.",
    timeLabel: "8:30 AM",
    category: "medication",
    scheduledHour: 8,
    scheduledMinute: 30,
  },
  {
    id: "log_reminder_morning",
    title: "📝 Daily Health Log Reminder",
    body: "Please record your morning SpO₂, breathlessness score, and symptoms in O2Plus.",
    timeLabel: "9:00 AM",
    category: "log_reminder",
    scheduledHour: 9,
    scheduledMinute: 0,
  },
  {
    id: "med_afternoon",
    title: "💊 Afternoon Medication Reminder",
    body: "Time for your afternoon dose (1:00 PM – 3:00 PM). Stay consistent with your schedule.",
    timeLabel: "1:30 PM",
    category: "medication",
    scheduledHour: 13,
    scheduledMinute: 30,
  },
  {
    id: "aqi_evening",
    title: "🌆 O2Plus · Evening AQI Update",
    body: "Evening air quality update. If AQI is elevated, keep windows closed and avoid peak smog.",
    timeLabel: "5:00 PM",
    category: "aqi",
    scheduledHour: 17,
    scheduledMinute: 0,
  },
  {
    id: "med_night",
    title: "💊 Night Medication Reminder",
    body: "Time for your night dose (8:00 PM – 10:00 PM). Ensure inhaler/nebulizer is completed before sleep.",
    timeLabel: "8:30 PM",
    category: "medication",
    scheduledHour: 20,
    scheduledMinute: 30,
  },
  {
    id: "log_reminder_evening",
    title: "🌙 Evening Log Check-in",
    body: "Have you logged your health today? Complete your 2-minute daily check-in before sleep.",
    timeLabel: "9:00 PM",
    category: "log_reminder",
    scheduledHour: 21,
    scheduledMinute: 0,
  },
];

/**
 * Returns active reminder notifications based on current time and whether today's log was submitted.
 */
export function getActiveReminders(hasTodayLog: boolean): ScheduledNotification[] {
  const currentHour = new Date().getHours();

  return NOTIFICATION_SCHEDULES.filter((item) => {
    // If patient already logged, suppress log reminders for past hours
    if (hasTodayLog && item.category === "log_reminder") {
      return false;
    }
    return true;
  });
}
