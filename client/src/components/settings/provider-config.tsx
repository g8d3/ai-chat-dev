import { useQuery, useMutation } from "@tanstack/react-query";
import { AIProvider, insertProviderSchema } from "@shared/schema";
import { DataTable } from "@/components/table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Pencil } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

export default function ProviderConfig() {
  const { data: providers = [], isLoading } = useQuery<AIProvider[]>({
    queryKey: ["/api/providers"],
  });

  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);

  const form = useForm({
    resolver: zodResolver(insertProviderSchema),
    defaultValues: {
      name: "",
      baseUrl: "",
      apiKey: "",
    },
  });

  const createProviderMutation = useMutation({
    mutationFn: async (data: { name: string; baseUrl: string; apiKey: string }) => {
      const res = await apiRequest("POST", "/api/providers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      form.reset();
    },
  });

  const updateProviderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<AIProvider> }) => {
      const res = await apiRequest("PATCH", `/api/providers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      setSelectedProvider(null);
      form.reset();
    },
  });

  const deleteProviderMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/providers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
    },
  });

  const columns = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "baseUrl",
      header: "Base URL",
    },
    {
      accessorKey: "apiKey",
      header: "API Key",
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: AIProvider } }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedProvider(row.original);
              form.reset({
                name: row.original.name,
                baseUrl: row.original.baseUrl,
                apiKey: row.original.apiKey,
              });
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteProviderMutation.mutate(row.original.id)}
            disabled={deleteProviderMutation.isPending}
          >
            {deleteProviderMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Delete"
            )}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog
          open={!!selectedProvider}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProvider(null);
              form.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {selectedProvider ? "Edit Provider" : "Add AI Provider"}
              </DialogTitle>
              <DialogDescription>
                Configure an AI provider for your chat application.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => {
                  if (selectedProvider) {
                    updateProviderMutation.mutate({
                      id: selectedProvider.id,
                      data,
                    });
                  } else {
                    createProviderMutation.mutate(data);
                  }
                })}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="baseUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createProviderMutation.isPending || updateProviderMutation.isPending}
                >
                  {(createProviderMutation.isPending || updateProviderMutation.isPending) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {selectedProvider ? "Update Provider" : "Add Provider"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={providers}
      />
    </div>
  );
}