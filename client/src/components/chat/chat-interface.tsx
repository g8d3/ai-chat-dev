import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Chat, Message, InsertMessage, InsertChat, AIModel } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, Plus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatInterfaceProps {
  chats: Chat[];
}

export default function ChatInterface({ chats }: ChatInterfaceProps) {
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { toast } = useToast();

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/chats", selectedChat, "messages"],
    enabled: !!selectedChat,
  });

  // Get the first available model to use for new chats
  const { data: providers = [] } = useQuery<any[]>({
    queryKey: ["/api/providers"],
  });

  const firstProvider = providers[0];
  const { data: models = [] } = useQuery<AIModel[]>({
    queryKey: ["/api/providers", firstProvider?.id, "models"],
    enabled: !!firstProvider,
  });

  // WebSocket setup
  useEffect(() => {
    if (!selectedChat) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
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

  const createNewChat = () => {
    if (!models.length) {
      toast({
        title: "Cannot create chat",
        description: "Please add an AI model in the settings first",
        variant: "destructive",
      });
      return;
    }

    createChatMutation.mutate({
      name: "New Chat",
      modelId: models[0].id,
      isDocument: false,
    });
  };

  return (
    <div className="grid grid-cols-4 gap-6 h-[calc(100vh-8rem)]">
      <div className="col-span-1 space-y-4">
        <Button 
          className="w-full"
          onClick={createNewChat}
          disabled={createChatMutation.isPending}
        >
          {createChatMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          New Chat
        </Button>

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