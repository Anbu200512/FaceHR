import { FileUp, Camera, FileText, Eye, Download } from 'lucide-react';
import { SectionCard } from './shared';
import Button from '../../ui/Button';
import Avatar from '../../Avatar';
import { DOCUMENT_KINDS } from '../constants';
import { formatDate, resolveAsset } from '../../../services/format';

export function DocumentsStep({ photoFile, photoPreview, getDoc, setDoc, clearDoc, onPhotoSelect, onPhotoRemove }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Profile Photo" subtitle="Used for the profile card and reports." icon={Camera}>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <Avatar name="Employee" src={photoPreview} size="xl" />
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {photoFile ? 'New photo selected' : 'No photo selected'}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">JPG, PNG or WebP up to 5 MB.</p>
            <div className="mt-3 flex justify-center gap-2 sm:justify-start">
              <label className="btn-secondary cursor-pointer text-xs">
                <Camera className="h-4 w-4" />
                {photoFile ? 'Change photo' : 'Upload photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPhotoSelect(f);
                    e.target.value = '';
                  }}
                />
              </label>
              {photoFile && (
                <Button type="button" variant="ghost" size="sm" onClick={onPhotoRemove}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Documents" subtitle="Government IDs, letters and other documents for the employee file." icon={FileUp}>
        <div className="space-y-3">
          {DOCUMENT_KINDS.map(({ value, label }) => {
            const doc = getDoc(value);
            const uploadDate = doc?.file?.uploadedAt || doc?.file?.updatedAt || doc?.file?.createdAt;
            const filePath = doc?.file?.path;
            return (
              <div
                key={value}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
                    {doc?.file ? (
                      <>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-300">
                          {doc.file.originalName}
                          {doc.file.size ? ` · ${formatFileSize(doc.file.size)}` : ''}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {doc.status === 'new' ? 'Pending upload' : uploadDate ? `Uploaded ${formatDate(uploadDate)}` : ''}
                        </p>
                      </>
                    ) : (
                      <p className="truncate text-xs text-slate-400">PDF or image, up to 10 MB.</p>
                    )}
                  </div>
                </div>
                {doc?.file ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {filePath && doc.status !== 'removed' && (
                      <>
                        <a
                          href={resolveAsset(filePath)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                          title="View / preview"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </a>
                        <a
                          href={resolveAsset(filePath)}
                          download={doc.file.originalName || true}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      </>
                    )}
                    {doc.status !== 'removed' && (
                      <label className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                        {doc.status === 'new' ? 'Change' : 'Replace'}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setDoc(value, f, doc);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={() => clearDoc(value, doc)}>
                      {doc.status === 'removed' ? 'Restore' : 'Delete'}
                    </Button>
                  </div>
                ) : (
                  <label className="btn-secondary shrink-0 cursor-pointer text-xs">
                    Upload
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setDoc(value, f, null);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}