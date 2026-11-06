/** Progreso hacia el objetivo de peso (sirve tanto para bajar como para subir). */
export interface GoalProgress {
  goal: number;
  /** kg que faltan (0 si ya se ha llegado). */
  left: number;
  /** 0..1 desde el primer peso anotado hasta el objetivo. */
  done: number;
  reached: boolean;
  /** true si el objetivo es bajar de peso. */
  losing: boolean;
}

export function goalProgress(firstKg: number, currentKg: number, goal: number): GoalProgress {
  const losing = goal <= firstKg;
  const reached = losing ? currentKg <= goal : currentKg >= goal;
  const total = Math.abs(firstKg - goal);
  const moved = losing ? firstKg - currentKg : currentKg - firstKg;
  const done = reached ? 1 : total > 0 ? Math.max(0, Math.min(1, moved / total)) : 1;
  return { goal, left: reached ? 0 : Math.round(Math.abs(currentKg - goal) * 10) / 10, done, reached, losing };
}
