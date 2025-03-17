import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/table/data-table";
import { Loader2, MessageSquare, Settings, Beaker, Database } from "lucide-react";
import { Link } from "wouter";

interface AILog {
  id: number;
  timestamp: Date;
  username: string;
  modelName: string;
  providerUrl: string;
  chatTitle: string;
  messageSent: string;
  messageReceived: string;
  status: "success" | "error";
  errorMessage?: string;
}

export default function LogsPage() {
  const { data: logs = [], isLoading } = useQuery<AILog[]>({
    queryKey: ["/api/logs"],
  });

  const columns = [
    {
      accessorKey: "timestamp",
      header: "Time",
      cell: ({ row }: { row: { original: AILog } }) => {
        return new Date(row.original.timestamp).toLocaleString();
      },
    },
    {
      accessorKey: "username",
      header: "User",
    },
    {
      accessorKey: "modelName",
      header: "Model",
    },
    {
      accessorKey: "providerUrl",
      header: "Provider URL",
    },
    {
      accessorKey: "chatTitle",
      header: "Chat",
    },
    {
      accessorKey: "messageSent",
      header: "Message Sent",
    },
    {
      accessorKey: "messageReceived",
      header: "Response",
      cell: ({ row }: { row: { original: AILog } }) => {
        return (
          <div className="space-y-1">
            <span className={row.original.status === "error" ? "text-red-500" : ""}>
              {row.original.messageReceived}
            </span>
            {row.original.errorMessage && (
              <p className="text-sm text-red-500">{row.original.errorMessage}</p>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold">AI Chat</span>
            </Link>
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <MessageSquare className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/test">
                <Beaker className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Interaction Logs</h1>
          <p className="text-muted-foreground">
            View detailed logs of AI model interactions
          </p>
        </div>

        <DataTable
          columns={columns}
          data={logs}
        />
      </main>
    </div>
  );
}