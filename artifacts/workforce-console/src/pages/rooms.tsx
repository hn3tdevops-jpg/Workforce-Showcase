import { useRooms } from "@/hooks/use-workforce";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { DoorOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Rooms() {
  const { data: rooms, isLoading, isError } = useRooms();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rooms</h1>
          <p className="text-muted-foreground">Manage physical spaces and their statuses.</p>
        </div>
        <Button onClick={() => alert("Mutation to be implemented")} className="bg-primary hover:bg-primary/90 text-white font-medium">
          Add Room
        </Button>
      </div>

      <Card className="border-border/50 shadow-md overflow-hidden bg-card/50">
        {isLoading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="p-10 text-center text-destructive">Failed to load rooms.</div>
        ) : !rooms || rooms.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center mb-4">
               <DoorOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No rooms found</h3>
            <p className="text-muted-foreground max-w-sm mt-1">This business context doesn't have any rooms configured yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id} className="border-border/50 hover:bg-accent/20 transition-colors cursor-pointer">
                  <TableCell className="font-medium text-foreground">{room.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{room.room_number || '-'}</TableCell>
                  <TableCell className="capitalize">{room.room_type || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {room.building ? `${room.building} ${room.floor ? `(Fl ${room.floor})` : ''}` : '-'}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={room.status || 'unknown'} type="room" />
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
