import notifier from 'node-notifier';
import { isFlowActive } from './flow-protection.js';

function formatRipple(minutes: number, totalMinutes: number): string {
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMin = totalMinutes % 60;
  return `++ ${minutes}분 집중 완료! 오늘 총 ${totalHours}시간 ${totalMin}분 ++`;
}

export function notifyTimerComplete(minutes: number, sessionCount: number, totalMinutes: number): void {
  if (isFlowActive()) {
    return;
  }

  // Terminal bell
  process.stdout.write('\u0007');

  const message = formatRipple(minutes, totalMinutes);

  notifier.notify({
    title: 'ADHD-Dev Focus Complete',
    message,
    sound: true,
  });
}
