import { useAssignments } from "@/hooks/use-workforce";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { Users, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Assignments() {
  const { data: assignments, isLoading, isError } = useAssignments();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between items-start gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Staff Assignments</h1>
        <p className="text-muted-foreground">View worker shift assignments and their current status.</p>
      </div>

      <Card className="border-border/50 shadow-md overflow-hidden bg-card/50">
        {isLoading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="p-10 text-center text-destructive">Failed to load assignments.</div>
        ) : !assignments || assignments.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center mb-4">
               <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No assignments yet</h3>
            <p className="text-muted-foreground max-w-sm mt-1">Staff assignments will appear here once scheduled.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Shift Ref</TableHead>
                <TableHead>Created On</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id} className="border-border/50 hover:bg-accent/20 transition-colors cursor-pointer">
                  <TableCell className="font-medium text-foreground">{assignment.employee_name || 'Unknown User'}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{assignment.role || '-'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{assignment.shift_id.substring(0,8)}...</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {assignment.created_at ? format(new Date(assignment.created_at), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={assignment.status || 'draft'} type="assignment" />
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
