"use client";

import { SlidersHorizontal } from "lucide-react";
import type { CatalogQuery } from "@/lib/catalog/query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FilterForm, type FilterGroup, type FilterOption } from "./filter-form";

export function MobileFilters(props: {
  query: CatalogQuery;
  exams: FilterGroup[];
  categories: FilterOption[];
  publishers?: FilterOption[];
  activeCount: number;
}) {
  const { activeCount, ...formProps } = props;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontal aria-hidden />
          Filters{activeCount > 0 && ` (${activeCount})`}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle>Filter books</SheetTitle>
          <SheetDescription>Choose filters, then tap Apply.</SheetDescription>
        </SheetHeader>
        <div className="px-5">
          <FilterForm {...formProps} idPrefix="mobile-filter" stickyActions />
        </div>
      </SheetContent>
    </Sheet>
  );
}
