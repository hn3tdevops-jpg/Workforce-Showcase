import { useTasks } from "@/hooks/use-workforce";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { CheckSquare, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function Tasks() {
  const { data: tasks, isLoading, isError } = useTasks();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Monitor operational tasks across the business.</p>
        </div>
        <Button onClick={() => alert("Mutation to be implemented")} className="bg-primary hover:bg-primary/90 text-white font-medium">
          Create Task
        </Button>
      </div>

      <Card className="border-border/50 shadow-md overflow-hidden bg-card/50">
        {isLoading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="p-10 text-center text-destructive">Failed to load tasks.</div>
        ) : !tasks || tasks.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center mb-4">
               <CheckSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">All caught up</h3>
            <p className="text-muted-foreground max-w-sm mt-1">There are no tasks available in the current context.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="w-[300px]">Task</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id} className="border-border/50 hover:bg-accent/20 transition-colors cursor-pointer">
                  <TableCell>
                    <p className="font-medium text-foreground">{task.title}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[280px]">{task.description}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs uppercase text-muted-foreground tracking-wider">{task.task_type}</TableCell>
                  <TableCell>
                    <StatusChip status={task.priority || 'medium'} type="priority" />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.due_date ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="w-3 h-3 opacity-50" />
                        {format(new Date(task.due_date), 'MMM d, h:mm a')}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={task.status || 'pending'} type="task" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
