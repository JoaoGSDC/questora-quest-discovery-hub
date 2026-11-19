import { Badge } from "@/components/ui/badge";
import type { Difficulty, QuestionStatus } from "@/lib/types";
import { DIFF_LABEL, STATUS_LABEL } from "@/services/questionService";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<QuestionStatus, string> = {
  unanswered: "border-border text-muted-foreground",
  correct: "border-success/40 bg-success/10 text-success",
  incorrect: "border-destructive/40 bg-destructive/10 text-destructive",
  review: "border-warning/40 bg-warning/10 text-warning",
  mastered: "border-primary/40 bg-primary/10 text-primary",
};

const DIFF_CLASS: Record<Difficulty, string> = {
  easy: "border-success/30 text-success",
  medium: "border-warning/30 text-warning",
  hard: "border-destructive/30 text-destructive",
};

export function StatusBadge({ status }: { status: QuestionStatus }) {
  return (
    <Badge variant="outline" className={cn("font-normal", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function DiffBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <Badge variant="outline" className={cn("font-normal", DIFF_CLASS[difficulty])}>
      {DIFF_LABEL[difficulty]}
    </Badge>
  );
}
