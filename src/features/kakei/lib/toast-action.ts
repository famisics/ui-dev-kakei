import { toast } from "sonner";

type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export function withToast<TState extends ActionState>(
  action: (prevState: TState, formData: FormData) => Promise<TState>,
  messages: {
    loading: string;
    success: string;
    error: string;
    onSuccess?: (result: TState) => void;
  },
) {
  return async (prevState: TState, formData: FormData): Promise<TState> => {
    const toastId = toast.loading(messages.loading);
    const result = await action(prevState, formData);
    if (result.status === "success") {
      toast.success(messages.success, { id: toastId });
      messages.onSuccess?.(result);
    } else {
      toast.error(result.message ?? messages.error, { id: toastId });
    }
    return result;
  };
}

export async function runActionWithToast(
  action: () => Promise<void>,
  messages: { success: string; error: string },
): Promise<void> {
  try {
    await action();
    toast.success(messages.success);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : messages.error);
  }
}
