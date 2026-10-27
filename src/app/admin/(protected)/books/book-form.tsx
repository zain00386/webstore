"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ImageUp, Save } from "lucide-react";
import { examGroups, umbrellaExams } from "@/config/exams";
import { toSlug } from "@/lib/catalog/lahore-import";
import type { BookFormValues } from "@/lib/admin/book-schema";
import { MAX_COVER_BYTES } from "@/lib/admin/image-type";
import { adminField } from "@/components/admin/field-styles";
import { useUnsavedChangesGuard } from "@/components/admin/use-unsaved-changes-guard";
import { Alert } from "@/components/feedback/alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveBook, type BookFormState } from "./actions";

type Category = { id: string; name: string; is_active: boolean };

type BookFormProps = {
  /** Existing book (edit) or null (new). */
  book: { id: string; updatedAt: string; values: BookFormValues; coverUrl: string | null; galleryUrls: string[] } | null;
  categories: Category[];
};

const select = `${adminField} h-10 w-full px-2`;

export function BookForm({ book, categories }: BookFormProps) {
  const [state, action, pending] = useActionState<BookFormState, FormData>(saveBook, {});
  // After a failed save, re-mount the form with what the admin typed.
  const v = state.values ?? book?.values;
  // Reset by the edit page re-mounting this form (key = updatedAt) after a successful save.
  const [dirty, setDirty] = useState(false);
  const [coverChosen, setCoverChosen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useUnsavedChangesGuard(dirty, formRef);
  return (
    <form
      ref={formRef}
      key={state.attempt ?? "initial"}
      action={action}
      className="space-y-6"
      noValidate
      onChange={(ev) => {
        setDirty(true);
        const t: EventTarget = ev.target;
        if (t instanceof HTMLInputElement && t.type === "file") setCoverChosen(Boolean(t.files?.length));
      }}
    >
      {book && <input type="hidden" name="id" value={book.id} />}
      {book && <input type="hidden" name="updatedAt" value={book.updatedAt} />}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Fields values={v} errors={state.fieldErrors ?? {}} book={book} categories={categories} coverLost={Boolean(state.attempt) && coverChosen} />
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <Button asChild variant="outline" size="pill">
          <Link href="/admin/books">Cancel</Link>
        </Button>
        <SubmitButton size="pill" pending={pending} pendingLabel="Saving…" icon={<Save aria-hidden />}>
          {book ? "Save changes" : "Add book"}
        </SubmitButton>
      </div>
    </form>
  );
}

function Fields({
  values: v,
  errors: e,
  book,
  categories,
  coverLost,
}: {
  values: BookFormValues | undefined;
  errors: NonNullable<BookFormState["fieldErrors"]>;
  book: BookFormProps["book"];
  categories: Category[];
  /** A cover was chosen before a failed save; the browser can't keep the file. */
  coverLost: boolean;
}) {
  const [slug, setSlug] = useState(v?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(book) || Boolean(v?.slug));
  const [preview, setPreview] = useState<string | null>(null);
  const [coverWarning, setCoverWarning] = useState<string | null>(null);
  const selectedTags = new Set(v?.examTags ?? []);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
          <h2 className="font-semibold">Book details</h2>
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
          <FormField label="Subtitle" hint="Extra detail shown under the title" error={e.subtitle}>
            <Input name="subtitle" defaultValue={v?.subtitle} maxLength={500} />
          </FormField>
          <FormField
            label="Web address"
            required
            hint={`Shop link: /books/${slug || "…"}${book ? " — changing it breaks old links" : ""}`}
            error={e.slug}
          >
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
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Author" error={e.author}>
              <Input name="author" defaultValue={v?.author} maxLength={200} />
            </FormField>
            <FormField label="Publisher" hint="e.g. Dogar Publishers, JWT, Caravan" error={e.publisher}>
              <Input name="publisher" defaultValue={v?.publisher ?? (book ? "" : "Dogar Publishers")} maxLength={120} />
            </FormField>
            <FormField label="Edition" hint="e.g. 2026 Edition" error={e.edition}>
              <Input name="edition" defaultValue={v?.edition} maxLength={80} />
            </FormField>
            <FormField label="ISBN" hint="10 or 13 digits; dashes are fine" error={e.isbn}>
              <Input name="isbn" defaultValue={v?.isbn} maxLength={20} inputMode="numeric" />
            </FormField>
          </div>
          <FormField label="Description" hint="Plain text. Start a line with • for a bullet point." error={e.description}>
            <Textarea name="description" defaultValue={v?.description} rows={8} maxLength={20000} />
          </FormField>
        </section>

        <section className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
          <h2 className="font-semibold">Category & exams</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category" error={e.categoryId}>
              <select name="categoryId" defaultValue={v?.categoryId ?? ""} className={select}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.is_active ? "" : " (hidden)"}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Language" error={e.language}>
              <select name="language" defaultValue={v?.language ?? ""} className={select}>
                <option value="">Not set</option>
                <option>English</option>
                <option>Urdu</option>
                <option>Bilingual</option>
              </select>
            </FormField>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Exams this book helps with</legend>
            {e.examTags && <p className="mb-2 text-xs font-medium text-destructive">{e.examTags}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              {[{ slug: "popular", title: "Popular (shop shortcuts)", exams: umbrellaExams }, ...examGroups].map((g) => (
                <div key={g.slug}>
                  <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g.title}</p>
                  {g.exams.map((x) => (
                    <label key={x.slug} className="flex min-h-11 items-center gap-2 text-sm sm:min-h-8">
                      <input
                        type="checkbox"
                        name="examTags"
                        value={x.slug}
                        defaultChecked={selectedTags.has(x.slug)}
                        className="size-4 accent-[var(--primary)]"
                      />
                      {x.label}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </fieldset>
        </section>
      </div>

      <div className="space-y-6">
        <section className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
          <h2 className="font-semibold">Price & stock</h2>
          <FormField label="Price (Rs.)" required error={e.price}>
            <Input name="price" defaultValue={v?.price} inputMode="decimal" />
          </FormField>
          <FormField label="'Was' price (Rs.)" hint="Shown crossed out. Must be higher than the price." error={e.compareAtPrice}>
            <Input name="compareAtPrice" defaultValue={v?.compareAtPrice} inputMode="decimal" />
          </FormField>
          <FormField label="Stock" required hint="How many copies you have. 0 = out of stock." error={e.stockQuantity}>
            <Input name="stockQuantity" defaultValue={v?.stockQuantity ?? "0"} inputMode="numeric" />
          </FormField>
          <FormField label="Low-stock alert at" hint="Show 'Low stock' at this many or fewer. Empty = use the store setting." error={e.lowStockThreshold}>
            <Input name="lowStockThreshold" defaultValue={v?.lowStockThreshold} inputMode="numeric" />
          </FormField>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={v?.isActive ?? true} className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>
              <span className="font-medium">On sale in the shop</span>
              <span className="block text-xs text-muted-foreground">Untick to hide this book without deleting it.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="isNewArrival" defaultChecked={v?.isNewArrival ?? false} className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>
              <span className="font-medium">New arrival</span>
              <span className="block text-xs text-muted-foreground">Shows in &ldquo;New arrivals&rdquo; on the home page.</span>
            </span>
          </label>
        </section>

        <section className="space-y-3 rounded-2xl bg-card p-5 ring-1 ring-border">
          <h2 className="font-semibold">Cover</h2>
          <div className="relative mx-auto aspect-[3/4] w-40 overflow-hidden rounded-xl bg-muted">
            {(preview ?? book?.coverUrl) && (
              // eslint-disable-next-line @next/next/no-img-element -- local preview (blob:) can't go through next/image
              <img src={preview ?? book!.coverUrl!} alt="Cover preview" className="h-full w-full object-contain" />
            )}
          </div>
          <FormField
            label="Upload a new cover"
            hint={coverLost && !preview ? "Please choose the image again: it isn't kept after a failed save. JPG, PNG or WebP, up to 2 MB" : "JPG, PNG or WebP, up to 2 MB"}
            error={e.cover ?? coverWarning ?? undefined}
          >
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
          {book?.coverUrl && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="removeCover" className="size-4 accent-[var(--primary)]" />
              Remove the current cover
            </label>
          )}
          {book && book.galleryUrls.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ImageUp className="size-3.5" aria-hidden /> Plus {book.galleryUrls.length} extra photo
              {book.galleryUrls.length === 1 ? "" : "s"} from the import (shown on the book page).
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
