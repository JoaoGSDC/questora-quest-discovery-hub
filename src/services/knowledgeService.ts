import type { NotebookEntry, Question } from "@/lib/types";

export const emptyEntry = (questionId: string): NotebookEntry => ({ questionId, chat: [], formulas: [], concepts: [], updatedAt: new Date().toISOString() });

export function searchNotebook(entries: NotebookEntry[], qs: Map<string, Question>, f: { subject?: string; topic?: string; text?: string }) {
  const t = f.text?.toLowerCase();
  return entries.filter((e) => {
    const q = qs.get(e.questionId);
    if (!q) return false;
    if (f.subject && q.subject !== f.subject) return false;
    if (f.topic && q.topic !== f.topic) return false;
    if (t) {
      const hay = [q.statement, e.personalNotes, ...e.formulas, ...e.concepts, ...e.chat.map((c) => c.content), e.explanation?.summary].join(" ").toLowerCase();
      if (!hay.includes(t)) return false;
    }
    return true;
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
