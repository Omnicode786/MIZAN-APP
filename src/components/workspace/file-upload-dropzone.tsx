"use client";

import { UploadCloud } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function FileUploadDropzone() {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <UploadCloud className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Upload-to-Insight intake flow</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        Drop PDFs, screenshots, DOCX files, or emails. The system will classify, extract entities, group by case, and suggest risks, deadlines, and drafts.
      </p>

      <label className="mt-6 inline-flex cursor-pointer">
        <input
          type="file"
          className="hidden"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files || []))}
        />
        <span className="inline-flex h-10 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-soft">
          Select files
        </span>
      </label>

      {files.length ? (
        <div className="mt-6 text-left">
          <p className="mb-3 text-sm font-medium">Ready to upload</p>
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.name} className="rounded-2xl border border-border/70 px-4 py-3 text-sm">
                {file.name}
              </div>
            ))}
          </div>
          <Button className="mt-4">Process intake</Button>
        </div>
      ) : null}
    </div>
  );
}
