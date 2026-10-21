/**
 * TypeScript description of the database (matches supabase/migrations).
 * Hand-written for now; once your project is linked you can regenerate it with:
 *   npx supabase gen types typescript --project-id <your-project-ref> > src/lib/supabase/database.types.ts
 */

type Timestamps = { created_at: string; updated_at: string };
/** Columns with defaults (or generated) become optional on insert. */
type Insertable<Row, Required extends keyof Row, Generated extends keyof Row = never> = Pick<Row, Required> &
  Partial<Omit<Row, Required | Generated>>;

export type PostKind = "blog" | "vacancy";
export type PostStatus = "draft" | "published" | "archived";
export type DeliveryMethodDb = "pakistan_post" | "courier";
export type PaymentMethodDb = "jazzcash" | "easypaisa" | "bank_transfer" | "cod";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "not_applicable";
export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

export type CategoryRow = Timestamps & {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type BookRow = Timestamps & {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  publisher: string | null;
  edition: string | null;
  isbn: string | null;
  description: string;
  category_id: string | null;
  exam_tags: string[];
  language: "English" | "Urdu" | "Bilingual" | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number | null;
  cover_image_path: string | null;
  gallery_paths: string[];
  is_active: boolean;
  is_new_arrival: boolean;
  source_ref: string | null;
  search: unknown;
};

export type PostRow = Timestamps & {
  id: string;
  slug: string;
  title: string;
  kind: PostKind;
  excerpt: string;
  body: string;
  cover_image_path: string | null;
  status: PostStatus;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  vacancy_organisation: string | null;
  vacancy_positions: string | null;
  vacancy_location: string | null;
  vacancy_last_date: string | null;
  apply_url: string | null;
  exam_tag: string | null;
};

export type StoreSettingsRow = {
  id: boolean;
  store_name: string;
  phone: string;
  whatsapp_e164: string;
  address: string;
  hours_text: string;
  currency: string;
  low_stock_threshold: number | null;
  pakistan_post_enabled: boolean;
  pakistan_post_fee: number;
  courier_enabled: boolean;
  courier_fee: number;
  cod_enabled: boolean;
  jazzcash_enabled: boolean;
  jazzcash_account_title: string | null;
  jazzcash_number: string | null;
  easypaisa_enabled: boolean;
  easypaisa_account_title: string | null;
  easypaisa_number: string | null;
  bank_enabled: boolean;
  bank_name: string | null;
  bank_account_title: string | null;
  bank_account_number: string | null;
  bank_iban: string | null;
  payment_instructions: string;
  updated_at: string;
};

export type PublicSettings = Pick<
  StoreSettingsRow,
  | "store_name"
  | "phone"
  | "whatsapp_e164"
  | "address"
  | "hours_text"
  | "currency"
  | "low_stock_threshold"
  | "pakistan_post_enabled"
  | "pakistan_post_fee"
  | "courier_enabled"
  | "courier_fee"
  | "cod_enabled"
  | "jazzcash_enabled"
  | "easypaisa_enabled"
  | "bank_enabled"
>;

export type AdminUserRow = { user_id: string; note: string | null; created_at: string };

export type OrderRow = Timestamps & {
  id: string;
  order_number: string;
  access_token_hash: string;
  idempotency_key: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address: string;
  city: string;
  notes: string | null;
  delivery_method: DeliveryMethodDb;
  delivery_fee: number;
  payment_method: PaymentMethodDb;
  payment_status: PaymentStatus;
  status: OrderStatus;
  subtotal: number;
  total: number;
  stock_restored_at: string | null;
  paid_at: string | null;
  paid_verified_by: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  book_id: string | null;
  title_snapshot: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type OrderEventRow = {
  id: number;
  order_id: string;
  actor_id: string | null;
  event: string;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  created_at: string;
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      categories: Table<CategoryRow, Insertable<CategoryRow, "slug" | "name">>;
      books: Table<BookRow, Insertable<BookRow, "slug" | "title" | "price", "search">>;
      posts: Table<PostRow, Insertable<PostRow, "slug" | "title" | "kind">>;
      store_settings: Table<StoreSettingsRow, Insertable<StoreSettingsRow, never>>;
      admin_users: Table<AdminUserRow, Insertable<AdminUserRow, "user_id">>;
      orders: Table<
        OrderRow,
        Insertable<
          OrderRow,
          | "access_token_hash"
          | "customer_name"
          | "customer_phone"
          | "address"
          | "city"
          | "delivery_method"
          | "delivery_fee"
          | "payment_method"
          | "subtotal"
          | "total"
        >
      >;
      order_items: Table<
        OrderItemRow,
        Insertable<OrderItemRow, "order_id" | "title_snapshot" | "unit_price" | "quantity", "line_total">
      >;
      order_events: Table<OrderEventRow, Insertable<OrderEventRow, "order_id" | "event", "id">>;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      get_public_settings: { Args: Record<string, never>; Returns: PublicSettings[] };
      place_order: {
        Args: {
          p_idempotency_key: string;
          p_access_token_hash: string;
          p_customer: { name: string; phone: string; email: string; address: string; city: string; notes: string };
          p_delivery_method: DeliveryMethodDb;
          p_payment_method: PaymentMethodDb;
          p_items: { book_id: string; quantity: number }[];
        };
        Returns: { order_id: string; order_number: string; total: number; created: boolean }[];
      };
    };
    Enums: {
      post_kind: PostKind;
      post_status: PostStatus;
      delivery_method: DeliveryMethodDb;
      payment_method: PaymentMethodDb;
      payment_status: PaymentStatus;
      order_status: OrderStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
