export interface CompletionQuestState {
  id: string;
  completed: boolean;
}

export function findNewlyCompletedQuest<T extends CompletionQuestState>(
  quests: T[],
  id: string,
  completed: boolean,
): T | undefined {
  if (!completed) return undefined;
  return quests.find((quest) => quest.id === id && !quest.completed);
}
