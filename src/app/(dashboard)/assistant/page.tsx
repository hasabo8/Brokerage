import { AssistantChat } from "@/components/assistant/chat";

export default function AssistantPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">AI Assistant</h1>
      <p className="mt-1 text-sm text-slate-500">
        Ask about your own listings in plain language — in Arabic or English.
      </p>
      <div className="mt-6">
        <AssistantChat />
      </div>
    </div>
  );
}
