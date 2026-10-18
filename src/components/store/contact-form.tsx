"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { whatsappLink } from "@/lib/format";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Contact form that opens WhatsApp with the message filled in.
 * Nothing is stored on our servers; the customer sends it themselves.
 */
export function ContactForm() {
  const [errors, setErrors] = useState<{ name?: string; message?: string }>({});

  return (
    <form
      noValidate
      className="not-prose space-y-4 rounded-3xl bg-card p-6 ring-1 ring-border"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const name = String(data.get("name") ?? "").trim();
        const message = String(data.get("message") ?? "").trim();
        const next = {
          name: name.length < 2 ? "Please enter your name" : undefined,
          message: message.length < 5 ? "Please write your message" : undefined,
        };
        setErrors(next);
        if (next.name || next.message) return;
        const text = `Assalam-o-Alaikum, I am ${name}.\n\n${message.slice(0, 1500)}`;
        window.open(whatsappLink(siteConfig.phoneE164, text), "_blank", "noopener,noreferrer");
      }}
    >
      <h2 className="text-lg font-semibold">Send us a message</h2>
      <FormField label="Your name" required error={errors.name}>
        <Input name="name" autoComplete="name" maxLength={80} />
      </FormField>
      <FormField label="Message" required hint="Which book are you looking for?" error={errors.message}>
        <Textarea name="message" rows={4} maxLength={1500} />
      </FormField>
      <Button type="submit" size="pill" className="w-full sm:w-auto">
        <MessageCircle aria-hidden /> Send on WhatsApp
      </Button>
    </form>
  );
}
