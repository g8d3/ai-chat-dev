import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Chat, Message, InsertMessage, InsertChat, AIModel } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Send, Plus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface ChatInterfaceProps {
  chats: Chat[];
}

export default function ChatInterface({ chats }: ChatInterfaceProps) {
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { toast } = useToast();

  const form = useForm<InsertChat>({
    defaultValues: {
      name: "New Chat",
      modelId: undefined,
      isDocument: false,
    },
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/chats", selectedChat, "messages"],
    enabled: !!selectedChat,
  });

  // Get the models for the chat
  const { data: providers = [] } = useQuery<any[]>({
    queryKey: ["/api/providers"],
  });

  const { data: models = [] } = useQuery<AIModel[]>({
    queryKey: ["/api/providers", providers[0]?.id, "models"],
    enabled: !!providers[0],
  });

  // WebSocket setup
  useEffect(() => {
    if (!selectedChat) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws`;

    try {
      const socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "document_update" && data.chatId === selectedChat) {
          queryClient.invalidateQueries({ queryKey: ["/api/chats", selectedChat, "messages"] });
        }
      };

      setWs(socket);

      return () => {
        socket.close();
      };
    } catch (error) {
      console.error("WebSocket connection error:", error);
    }
  }, [selectedChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createChatMutation = useMutation({
    mutationFn: async (data: InsertChat) => {
      const res = await apiRequest("POST", "/api/chats", data);
      return res.json();
    },
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setSelectedChat(newChat.id);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create chat",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: InsertMessage) => {
      const res = await apiRequest("POST", "/api/messages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", selectedChat, "messages"] });
      setMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSend = async () => {
    if (!selectedChat || !message.trim()) return;

    sendMessageMutation.mutate({
      chatId: selectedChat,
      role: "user",
      content: message,
    });
  };

  return (
    <div className="grid grid-cols-4 gap-6 h-[calc(100vh-8rem)]">
      <div className="col-span-1 space-y-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full">
              {createChatMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              New Chat
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Chat</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => createChatMutation.mutate(data))}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="modelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {models.map((model) => (
                            <SelectItem
                              key={model.id}
                              value={model.id.toString()}
                            >
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createChatMutation.isPending || !models.length}
                >
                  {createChatMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create Chat
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <div className="space-y-2">
          {chats.map((chat) => (
            <Button
              key={chat.id}
              variant={selectedChat === chat.id ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedChat(chat.id)}
            >
              {chat.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="col-span-3 flex flex-col">
        {selectedChat ? (
          <>
            <Card className="flex-1 mb-4 overflow-y-auto">
              <CardContent className="p-4 space-y-4">
                {messagesLoading ? (
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-border" />
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
              />
              <Button
                onClick={handleSend}
                disabled={sendMessageMutation.isPending || !message.trim()}
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select or create a chat to get started
          </div>
        )}
      </div>
    </div>
  );
}