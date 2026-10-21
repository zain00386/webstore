"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Save } from "lucide-react";
import { examGroups, umbrellaExams } from "@/config/exams";
import { toSlug } from "@/lib/catalog/lahore-import";
import type { PostFormValues } from "@/lib/admin/post-schema";
import { MAX_COVER_BYTES } from "@/lib/admin/image-type";
import { PostBody } from "@/components/blog/post-body";
import { Alert } from "@/components/feedback/alert";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { savePost, type PostFormState } from "./actions";

type PostFormProps = {
  post: { id: string; updatedAt: string; values: PostFormValues; coverUrl: string | null } | null;
};

const select = "h-10 w-full rounded-lg border border-input bg-surface px-2 text-sm";

export function PostForm({ post }: PostFormProps) {
  const [state, action, pending] = useActionState<PostFormState, FormData>(savePost, {});
  const v = state.values ?? post?.values;
  return (
    <form key={state.attempt ?? "initial"} action={action} className="space-y-6" noValidate>
      {post && <input type="hidden" name="id" value={post.id} />}
      {post && <input type="hidden" name="updatedAt" value={post.updatedAt} />}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Fields values={v} errors={state.fieldErrors ?? {}} post={post} />
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <Button asChild variant="outline">
          <Link href="/admin/posts">Cancel</Link>
        </Button>
        <Button type="submit" size="pill" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          {pending ? "Saving…" : "Save post"}
        </Button>
      </div>
    </form>
  );
}

function Fields({
  values: v,
  errors: e,
  post,
}: {
  values: PostFormValues | undefined;
  errors: NonNullable<PostFormState["fieldErrors"]>;
  post: PostFormProps["post"];
}) {
  const [kind, setKind] = useState<"blog" | "vacancy">(v?.kind ?? "vacancy");
  const [slug, setSlug] = useState(v?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post) || Boolean(v?.slug));
  const [body, setBody] = useState(v?.body ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [preview, setPreview] = useState<string | null>(null);
  const [coverWarning, setCoverWarning] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Type of post</legend>
            <div className="flex gap-2">
              {(["vacancy", "blog"] as const).map((k) => (
                <label
                  key={k}
                  className={cn(
                    "flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium ring-1 ring-border",
                    kind === k && "bg-primary text-primary-foreground ring-primary",
                  )}
                >
                  <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
                  {k === "vacancy" ? "Job vacancy" : "Blog / guide"}
                </label>
              ))}
            </div>
          </fieldset>
          <FormField label="Title" required error={e.title}>
            <Input
              name="title"
              defaultValue={v?.title}
              maxLength={300}
              onChange={(ev) => {
                if (!slugTouched) setSlug(toSlug(ev.target.value));
              }}
            />
          </FormField>
          <FormField label="Web address" required hint={`Link: /blog/${slug || "…"}${post ? " — changing it breaks old links" : ""}`} error={e.slug}>
            <Input
              name="slug"
              value={slug}
              maxLength={200}
              onChange={(ev) => {
                setSlugTouched(true);
                setSlug(ev.target.value.toLowerCase());
              }}
            />
          </FormField>
          <FormField label="Short summary" hint="Shown on cards and in Google. Leave empty to use the start of the text." error={e.excerpt}>
            <Textarea name="excerpt" defaultValue={v?.excerpt} rows={2} maxLength={500} />
          </FormField>

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <span className="text-sm font-medium" id="body-label">
                Text
              </span>
              <div role="tablist" aria-label="Text editor" className="flex gap-1 rounded-full bg-muted p-1 text-sm">
                {(["write", "preview"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={cn("min-h-8 rounded-full px-3 font-medium", tab === t && "bg-card shadow-sm")}
                  >
                    {t === "write" ? "Write" : "Preview"}
                  </button>
                ))}
              </div>
            </div>
            {/* The textarea stays in the form (hidden on Preview) so its text is always saved. */}
            <Textarea
              name="body"
              aria-labelledby="body-label"
              aria-invalid={Boolean(e.body) || undefined}
              value={body}
              onChange={(ev) => setBody(ev.target.value)}
              rows={16}
              maxLength={50000}
              className={cn("font-mono text-sm", tab === "preview" && "hidden")}
            />
            {tab === "preview" && (
              <div role="tabpanel" aria-label="Preview" className="min-h-64 rounded-xl bg-surface p-4 ring-1 ring-border">
                {body.trim() ? <PostBody markdown={body} /> : <p className="text-sm text-muted-foreground">Nothing written yet.</p>}
              </div>
            )}
            {e.body && <p className="text-xs font-medium text-destructive">{e.body}</p>}
            <p className="text-xs text-muted-foreground">
              Formatting: <code>## Heading</code> · <code>- bullet</code> · <code>1. numbered</code> · <code>**bold**</code> ·{" "}
              <code>[link text](https://…)</code>. Leave an empty line between paragraphs.
            </p>
          </div>
        </section>

        {kind === "vacancy" && (
          <section className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
            <h2 className="font-semibold">Vacancy details</h2>
            <FormField label="Organisation" required hint="e.g. Punjab Public Service Commission (PPSC)" error={e.vacancyOrganisation}>
              <Input name="vacancyOrganisation" defaultValue={v?.vacancyOrganisation} maxLength={200} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Positions" hint="e.g. Lecturers (various subjects)" error={e.vacancyPositions}>
                <Input name="vacancyPositions" defaultValue={v?.vacancyPositions} maxLength={300} />
              </FormField>
              <FormField label="Location" hint="e.g. Punjab, Islamabad" error={e.vacancyLocation}>
                <Input name="vacancyLocation" defaultValue={v?.vacancyLocation} maxLength={120} />
              </FormField>
              <FormField label="Last date to apply" error={e.vacancyLastDate}>
                <Input name="vacancyLastDate" type="date" defaultValue={v?.vacancyLastDate} />
              </FormField>
            </div>
            <FormField label="Official apply link" hint="Must start with https:// — copy it from the official website." error={e.applyUrl}>
              <Input name="applyUrl" type="url" inputMode="url" defaultValue={v?.applyUrl} maxLength={2000} placeholder="https://" />
            </FormField>
          </section>
        )}
      </div>

      <div className="space-y-6">
        <section className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
          <h2 className="font-semibold">Publishing</h2>
          <FormField label="Status" required error={e.status}>
            <select name="status" defaultValue={v?.status ?? "draft"} className={select}>
              <option value="draft">Draft (only admins see it)</option>
              <option value="published">Published</option>
              <option value="archived">Archived (hidden)</option>
            </select>
          </FormField>
          <FormField
            label="Publish date & time"
            hint="Pakistan time. Empty = now. A future time means it appears then."
            error={e.publishedAt}
          >
            <Input name="publishedAt" type="datetime-local" defaultValue={v?.publishedAt} />
          </FormField>
          <FormField label="Books to show under the post" hint="Shows books for this exam below the text." error={e.examTag}>
            <select name="examTag" defaultValue={v?.examTag ?? ""} className={select}>
              <option value="">None</option>
              {[{ slug: "popular", title: "Popular", exams: umbrellaExams }, ...examGroups].map((g) => (
                <optgroup key={g.slug} label={g.title}>
                  {g.exams.map((x) => (
                    <option key={x.slug} value={x.slug}>
                      {x.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </FormField>
        </section>

        <section className="space-y-3 rounded-2xl bg-card p-5 ring-1 ring-border">
          <h2 className="font-semibold">Image</h2>
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
            {(preview ?? post?.coverUrl) && (
              // eslint-disable-next-line @next/next/no-img-element -- local preview (blob:) can't go through next/image
              <img src={preview ?? post!.coverUrl!} alt="Image preview" className="h-full w-full object-cover" />
            )}
          </div>
          <FormField label="Upload an image" hint="Optional. JPG, PNG or WebP, up to 2 MB" error={e.cover ?? coverWarning ?? undefined}>
            <input
              name="cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                setCoverWarning(f && f.size > MAX_COVER_BYTES ? "This file is over 2 MB. Choose a smaller image." : null);
                setPreview(f ? URL.createObjectURL(f) : null);
              }}
            />
          </FormField>
          {post?.coverUrl && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="removeCover" className="size-4 accent-[var(--primary)]" />
              Remove the current image
            </label>
          )}
        </section>

        <section className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
          <h2 className="font-semibold">Google (optional)</h2>
          <FormField label="Search title" hint="Up to 120 characters. Empty = the post title." error={e.seoTitle}>
            <Input name="seoTitle" defaultValue={v?.seoTitle} maxLength={120} />
          </FormField>
          <FormField label="Search description" hint="Up to 300 characters. Empty = the summary." error={e.seoDescription}>
            <Textarea name="seoDescription" defaultValue={v?.seoDescription} rows={3} maxLength={300} />
          </FormField>
        </section>
      </div>
    </div>
  );
}
