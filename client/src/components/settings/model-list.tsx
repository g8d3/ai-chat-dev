import { useQuery, useMutation } from "@tanstack/react-query";
import { AIModel, AIProvider, insertModelSchema } from "@shared/schema";
import { DataTable } from "@/components/table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";

type FormValues = z.infer<typeof insertModelSchema>;

export default function ModelList() {
  const { data: providers = [], isLoading: providersLoading } = useQuery<AIProvider[]>({
    queryKey: ["/api/providers"],
  });

  const providersWithModels = providers.map(p => ({
    ...p,
    models: useQuery<AIModel[]>({
      queryKey: ["/api/providers", p.id, "models"],
      enabled: providers.length > 0,
    }).data || []
  }));

  const allModels = providersWithModels.flatMap(p => p.models);

  const form = useForm<FormValues>({
    resolver: zodResolver(insertModelSchema),
    defaultValues: {
      name: "",
      providerId: undefined,
      modelId: "",
      isDefault: false,
    },
  });

  const createModelMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/models", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      form.reset();
    },
  });

  const deleteModelMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/models/${id}`);
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
      accessorKey: "modelId",
      header: "Model ID",
    },
    {
      accessorKey: "provider",
      header: "Provider",
      cell: ({ row }: { row: { original: AIModel } }) => {
        const provider = providers.find(p => p.id === row.original.providerId);
        return provider?.name || "-";
      },
    },
    {
      accessorKey: "isDefault",
      header: "Default",
      cell: ({ row }: { row: { original: AIModel } }) => (
        <Switch checked={row.original.isDefault || false} disabled />
      ),
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: AIModel } }) => (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => deleteModelMutation.mutate(row.original.id)}
          disabled={deleteModelMutation.isPending}
        >
          {deleteModelMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Delete"
          )}
        </Button>
      ),
    },
  ];

  if (providersLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Model
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add AI Model</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => createModelMutation.mutate(data))}
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
                  name="providerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {providers.map((provider) => (
                            <SelectItem
                              key={provider.id}
                              value={provider.id.toString()}
                            >
                              {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="modelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel>Set as Default</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createModelMutation.isPending}
                >
                  {createModelMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Add Model
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={allModels}
      />
    </div>
  );
}