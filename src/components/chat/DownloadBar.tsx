import { FileSpreadsheet, FileText, Presentation, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { downloadDocx, downloadPptx, downloadTxt, downloadXlsx } from "@/lib/file-export";

const actions = [
  { label: "Baixar como Word (.docx)", icon: FileText, run: downloadDocx },
  { label: "Baixar como Excel (.xlsx)", icon: FileSpreadsheet, run: downloadXlsx },
  { label: "Baixar como PowerPoint (.pptx)", icon: Presentation, run: downloadPptx },
  { label: "Baixar como Bloco de Notas (.txt)", icon: StickyNote, run: downloadTxt },
];

export function DownloadBar({ content }: { content: string }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={async () => {
            try {
              await action.run(content);
              toast.success("Arquivo gerado!");
            } catch (error) {
              console.error(error);
              toast.error("Não foi possível gerar o arquivo");
            }
          }}
          className="glow-ring glow-ring-hover inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-medium"
        >
          <action.icon className="h-3.5 w-3.5 text-neon" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
