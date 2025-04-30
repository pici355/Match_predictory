import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { predictSchema } from "@shared/schema";

const formSchema = predictSchema.extend({
  name: z.string().min(1, { message: "Il nome è obbligatorio" }),
  prediction: z.enum(["1", "X", "2"], {
    required_error: "Seleziona un pronostico",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function PredictionForm() {
  const [submissionResult, setSubmissionResult] = useState<{ name: string; prediction: string } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      prediction: undefined,
    },
  });

  const submitPrediction = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/predictions", data);
      return response.json();
    },
    onSuccess: (data) => {
      setSubmissionResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
    },
  });

  function onSubmit(data: FormValues) {
    submitPrediction.mutate(data);
  }

  const predictionOptions = [
    { value: "1", label: "Vince Newell's" },
    { value: "X", label: "Pareggio" },
    { value: "2", label: "Vince Como" },
  ];

  return (
    <Card className="mb-8 shadow-md">
      <CardContent className="pt-6">
        <div className="mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-center text-primary">FantaSchedina</h1>
          <h2 className="text-xl font-semibold text-center mt-2">Pronostico Finale Newell's - Como</h2>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-medium">Il tuo nome</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Inserisci il tuo nome" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 text-sm" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prediction"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="font-medium">Il tuo pronostico</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="space-y-3"
                    >
                      {predictionOptions.map((option) => (
                        <div key={option.value} className="prediction-option">
                          <label className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition group">
                            <FormControl>
                              <RadioGroupItem 
                                value={option.value} 
                                id={option.value}
                                className="sr-only peer"
                              />
                            </FormControl>
                            <div className="relative">
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full peer-checked:border-primary peer-checked:border-4"></div>
                            </div>
                            <span className="ml-3 font-medium group-hover:text-primary peer-checked:text-primary">
                              {option.label}
                            </span>
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className="text-red-500 text-sm" />
                </FormItem>
              )}
            />

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full py-3 px-4 bg-primary text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition shadow-sm"
                disabled={submitPrediction.isPending}
              >
                {submitPrediction.isPending ? "Invio in corso..." : "Invia il pronostico"}
              </Button>
            </div>
          </form>
        </Form>

        {submissionResult && (
          <div className="mt-8">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800">Pronostico Registrato</h3>
              <div className="mt-2 text-green-700">
                <span>{submissionResult.name}</span>: <span className="font-bold">{submissionResult.prediction}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
