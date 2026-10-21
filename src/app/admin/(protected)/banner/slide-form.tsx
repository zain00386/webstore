"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Save, Trash2 } from "lucide-react";
import { examGroups, umbrellaExams } from "@/config/exams";
import type { BannerSlideValues } from "@/lib/admin/banner-schema";
import { MAX_COVER_BYTES } from "@/lib/admin/image-type";
import { Alert } from "@/components/feedback/alert";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteSlide, saveSlide, type SlideFormState } from "./actions";

const select = "h-10 w-full rounded-lg border border-input bg-surface px-2 text-sm";

type Props = { slide: { id: string; updatedAt: string; values: BannerSlideValues; imageUrl: string | null } | null };

export function SlideForm({ slide }: Props) {
  const [state, action, pending] = useActionState<SlideFormState, FormData>(saveSlide, {});
  const v = state.values ?? slide?.values;
  const e = state.fieldErrors ?? {};
  const [preview, setPreview] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <form key={state.attempt ?? "initial"} action={action} className="space-y-6" noValidate>
      {slide && <input type="hidden" name="id" value={slide.id} />}
      {slide && <input type="hidden" name="updatedAt" value={slide.updatedAt} />}
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
          <h2 className="font-semibold">What the slide says</h2>
          <FormField label="Small label above the title" hint="e.g. New edition, FIA 2026. Leave empty for none." error={e.eyebrow}>
            <Input name="eyebrow" defaultValue={v?.eyebrow} maxLength={40} />
          </FormField>
          <FormField label="Title" required hint="e.g. FIA Test Preparation Starts Here" error={e.title}>
            <Input name="title" defaultValue={v?.title} maxLength={120} />
          </FormField>
          <FormField label="Short text" hint="One or two sentences. Up to 300 characters." error={e.body}>
            <Textarea name="body" defaultValue={v?.body} rows={3} maxLength={300} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Button text" required hint="e.g. Buy now" error={e.buttonLabel}>
              <Input name="buttonLabel" defaultValue={v?.buttonLabel ?? "Buy now"} maxLength={30} />
            </FormField>
            <FormField label="Button link" required hint="A page of this shop, e.g. /books?exam=jobs" error={e.buttonHref}>
              <Input name="buttonHref" defaultValue={v?.buttonHref} maxLength={500} placeholder="/books?exam=jobs" />
            </FormField>
            <FormField label="Second button text" hint="Optional" error={e.secondaryLabel}>
              <Input name="secondaryLabel" defaultValue={v?.secondaryLabel} maxLength={30} />
            </FormField>
            <FormField label="Second button link" hint="Optional, e.g. /blog" error={e.secondaryHref}>
              <Input name="secondaryHref" defaultValue={v?.secondaryHref} maxLength={500} />
            </FormField>
          </div>
          <p className="text-xs text-muted-foreground">
            Every slide also shows &ldquo;To order, call or WhatsApp&rdquo; with your numbers from Settings.
          </p>
        </section>

        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
            <h2 className="font-semibold">Picture</h2>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
              {(preview ?? slide?.imageUrl) && (
                // eslint-disable-next-line @next/next/no-img-element -- local preview (blob:) can't go through next/image
                <img src={preview ?? slide!.imageUrl!} alt="Picture preview" className="h-full w-full object-contain" />
              )}
            </div>
            <FormField label="Upload your own picture" hint="JPG, PNG or WebP, up to 2 MB. Or leave empty and pick an exam below." error={e.image ?? warning ?? undefined}>
              <input
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  setWarning(f && f.size > MAX_COVER_BYTES ? "This file is over 2 MB. Choose a smaller picture." : null);
                  setPreview(f ? URL.createObjectURL(f) : null);
                }}
              />
            </FormField>
            {slide?.imageUrl && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="removeImage" className="size-4 accent-[var(--primary)]" />
                Remove the current picture
              </label>
            )}
            <FormField label="Or show books for an exam" hint="Without a picture, the covers of the 2 newest books for this exam are shown." error={e.examTag}>
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

          <section className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
            <h2 className="font-semibold">Showing</h2>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={v?.isActive ?? true} className="mt-0.5 size-5 accent-[var(--primary)]" />
              <span>
                <span className="font-medium">Show on the home page</span>
                <span className="block text-xs text-muted-foreground">Untick to hide it without deleting.</span>
              </span>
            </label>
            <FormField label="Order" hint="Lower numbers show first, e.g. 10, 20, 30." error={e.sortOrder}>
              <Input name="sortOrder" defaultValue={v?.sortOrder ?? "100"} inputMode="numeric" maxLength={5} className="max-w-28" />
            </FormField>
          </section>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <Button asChild variant="outline">
          <Link href="/admin/banner">Cancel</Link>
        </Button>
        <Button type="submit" size="pill" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          {pending ? "Saving…" : "Save slide"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteSlide({ id, title }: { id: string; title: string }) {
  const [state, action, pending] = useActionState(deleteSlide, {});
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 aria-hidden /> Delete slide…
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="confirm" value="yes" />
          <DialogHeader>
            <DialogTitle>Delete “{title}”?</DialogTitle>
            <DialogDescription>
              The slide and its picture are removed permanently. To hide it for now, untick &ldquo;Show on the home page&rdquo;
              instead.
            </DialogDescription>
          </DialogHeader>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" aria-hidden />} Delete slide
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
