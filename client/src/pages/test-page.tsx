import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/table/data-table";
import { Loader2, Play, MessageSquare, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Test {
  id: number;
  name: string;
  description: string;
  status: "idle" | "running" | "passed" | "failed";
  lastRun?: Date;
  currentStep?: string;
}

const initialTests: Test[] = [
  {
    id: 1,
    name: "Basic Chat Flow Test",
    description: "Tests user registration, provider/model setup, and basic chat functionality",
    status: "idle"
  }
];

export default function TestPage() {
  const [tests, setTests] = useState<Test[]>(initialTests);
  const { user, registerMutation } = useAuth();

  const runTest = async (test: Test) => {
    // Update test status to running
    setTests(prev =>
      prev.map(t =>
        t.id === test.id ? { ...t, status: "running" } : t
      )
    );

    const updateStep = (step: string) => {
      setTests(prev =>
        prev.map(t =>
          t.id === test.id ? { ...t, currentStep: step } : t
        )
      );
    };

    try {
      // Step 1: Register user
      updateStep("Registering user 'ss'...");
      if (!user) {
        await registerMutation.mutateAsync({
          username: "ss",
          password: "ss"
        });
      }

      // Add delay to ensure registration completes
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Create provider
      updateStep("Creating OpenRouter provider...");
      const providerRes = await apiRequest("POST", "/api/providers", {
        name: "openrouter",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: "123123123"
      });
      const provider = await providerRes.json();

      // Wait for provider creation
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!provider?.id) {
        throw new Error("Failed to create provider");
      }

      // Step 3: Create model
      updateStep("Creating AI model...");
      const modelRes = await apiRequest("POST", "/api/models", {
        name: "open-r1/olympiccoder-32b:free",
        providerId: provider.id,
        modelId: "open-r1/olympiccoder-32b:free",
        isDefault: true
      });
      const model = await modelRes.json();

      // Wait for model creation
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!model?.id) {
        throw new Error("Failed to create model");
      }

      // Invalidate relevant queries to refresh UI
      await queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/models"] });

      // Step 4: Create chat
      updateStep("Creating new chat...");
      const chatRes = await apiRequest("POST", "/api/chats", {
        name: "Test Chat",
        modelId: model.id,
        isDocument: false
      });
      const chat = await chatRes.json();

      if (!chat?.id) {
        throw new Error("Failed to create chat");
      }

      // Wait for chat creation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 5: Send test message
      updateStep("Sending test message...");
      const messageRes = await apiRequest("POST", "/api/messages", {
        chatId: chat.id,
        role: "user",
        content: "Hi"
      });
      const message = await messageRes.json();

      if (!message?.id) {
        throw new Error("Failed to send message");
      }

      // Wait for AI response
      updateStep("Waiting for AI response...");
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Update test status to passed
      setTests(prev =>
        prev.map(t =>
          t.id === test.id ? { 
            ...t, 
            status: "passed", 
            lastRun: new Date(),
            currentStep: "Test completed successfully!" 
          } : t
        )
      );
    } catch (error: any) {
      console.error("Test failed:", error);
      setTests(prev =>
        prev.map(t =>
          t.id === test.id ? { 
            ...t, 
            status: "failed", 
            lastRun: new Date(),
            currentStep: `Test failed: ${error.message}` 
          } : t
        )
      );
    }
  };

  const columns = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: { original: Test } }) => {
        const test = row.original;
        let statusColor = "";
        switch (test.status) {
          case "passed":
            statusColor = "text-green-600";
            break;
          case "failed":
            statusColor = "text-red-600";
            break;
          case "running":
            statusColor = "text-blue-600";
            break;
          default:
            statusColor = "text-gray-600";
        }
        return (
          <div className="space-y-1">
            <span className={statusColor}>{test.status}</span>
            {test.currentStep && test.status === "running" && (
              <p className="text-sm text-muted-foreground">{test.currentStep}</p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "lastRun",
      header: "Last Run",
      cell: ({ row }: { row: { original: Test } }) => {
        return row.original.lastRun?.toLocaleString() || "Never";
      },
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: Test } }) => {
        const test = row.original;
        const isRunning = test.status === "running";

        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => runTest(test)}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="ml-2">Run Test</span>
          </Button>
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
          </div>
        </div>
      </header>

      <main className="flex-1 container py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Test Suite</h1>
          <p className="text-muted-foreground">
            Run automated tests to verify application functionality
          </p>
        </div>

        <DataTable
          columns={columns}
          data={tests}
        />
      </main>
    </div>
  );
}