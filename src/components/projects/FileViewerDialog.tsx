import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, X } from 'lucide-react';

interface FileViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    id: number;
    name: string;
    url: string;
    mimeType: string | null;
  } | null;
}

export function FileViewerDialog({ open, onOpenChange, file }: FileViewerDialogProps) {
  if (!file) return null;

  const isImage = file.mimeType?.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <div className="flex items-center justify-between p-4 border-b">
          <DialogTitle className="text-lg font-medium truncate flex-1 mr-4">
            {file.name}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              asChild
              className="h-8 w-8"
              title="Open in new tab"
            >
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="icon"
              asChild
              className="h-8 w-8"
              title="Download"
            >
              <a href={file.url} download={file.name}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
            >
                <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-muted/20 p-4 flex items-center justify-center min-h-[50vh]">
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-[70vh] object-contain rounded-md shadow-sm"
            />
          )}

          {isPdf && (
            <iframe
              src={`${file.url}#toolbar=0`}
              className="w-full h-[70vh] rounded-md border shadow-sm bg-white"
              title={file.name}
            />
          )}

          {!isImage && !isPdf && (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                This file type cannot be previewed.
              </p>
              <Button asChild>
                <a href={file.url} download={file.name}>
                  Download File
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
