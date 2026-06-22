export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      accessories: {
        Row: {
          cost: number;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          price: number;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          cost?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          price?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          cost?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          price?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      addresses: {
        Row: {
          created_at: string;
          district: string | null;
          id: string;
          is_default: boolean;
          line1: string;
          line2: string | null;
          phone: string;
          postal_code: string;
          province: string;
          recipient_name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          district?: string | null;
          id?: string;
          is_default?: boolean;
          line1: string;
          line2?: string | null;
          phone: string;
          postal_code: string;
          province: string;
          recipient_name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          district?: string | null;
          id?: string;
          is_default?: boolean;
          line1?: string;
          line2?: string | null;
          phone?: string;
          postal_code?: string;
          province?: string;
          recipient_name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      attribute_groups: {
        Row: {
          created_at: string;
          description: string | null;
          display_type: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_type?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_type?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      attribute_options: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          image_url: string | null;
          is_active: boolean;
          label: string;
          price_delta: number;
          sort_order: number;
          swatch_color: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          label: string;
          price_delta?: number;
          sort_order?: number;
          swatch_color?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          label?: string;
          price_delta?: number;
          sort_order?: number;
          swatch_color?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attribute_options_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "attribute_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      banners: {
        Row: {
          created_at: string;
          ends_at: string | null;
          id: string;
          image_url: string;
          is_active: boolean;
          link_url: string | null;
          sort_order: number;
          starts_at: string | null;
          title: string;
        };
        Insert: {
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          image_url: string;
          is_active?: boolean;
          link_url?: string | null;
          sort_order?: number;
          starts_at?: string | null;
          title: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          image_url?: string;
          is_active?: boolean;
          link_url?: string | null;
          sort_order?: number;
          starts_at?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          expires_at: string | null;
          id: string;
          is_active: boolean;
          max_discount: number | null;
          min_order: number;
          starts_at: string | null;
          title: string;
          type: Database["public"]["Enums"]["coupon_type"];
          usage_limit: number | null;
          used_count: number;
          value: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_discount?: number | null;
          min_order?: number;
          starts_at?: string | null;
          title: string;
          type?: Database["public"]["Enums"]["coupon_type"];
          usage_limit?: number | null;
          used_count?: number;
          value?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_discount?: number | null;
          min_order?: number;
          starts_at?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["coupon_type"];
          usage_limit?: number | null;
          used_count?: number;
          value?: number;
        };
        Relationships: [];
      };
      fabrics: {
        Row: {
          code: string;
          color: string;
          cost_per_meter: number;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          price_per_meter: number;
          roll_width_cm: number;
          stock_meters: number;
          swatch: string | null;
        };
        Insert: {
          code: string;
          color: string;
          cost_per_meter?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          price_per_meter: number;
          roll_width_cm?: number;
          stock_meters?: number;
          swatch?: string | null;
        };
        Update: {
          code?: string;
          color?: string;
          cost_per_meter?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          price_per_meter?: number;
          roll_width_cm?: number;
          stock_meters?: number;
          swatch?: string | null;
        };
        Relationships: [];
      };
      favorites: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      flash_sale_items: {
        Row: {
          flash_sale_id: string;
          id: string;
          product_id: string;
          sale_price: number;
          sold_count: number;
          stock_limit: number | null;
        };
        Insert: {
          flash_sale_id: string;
          id?: string;
          product_id: string;
          sale_price: number;
          sold_count?: number;
          stock_limit?: number | null;
        };
        Update: {
          flash_sale_id?: string;
          id?: string;
          product_id?: string;
          sale_price?: number;
          sold_count?: number;
          stock_limit?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "flash_sale_items_flash_sale_id_fkey";
            columns: ["flash_sale_id"];
            isOneToOne: false;
            referencedRelation: "flash_sales";
            referencedColumns: ["id"];
          },
        ];
      };
      flash_sales: {
        Row: {
          created_at: string;
          ends_at: string;
          id: string;
          is_active: boolean;
          starts_at: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          ends_at: string;
          id?: string;
          is_active?: boolean;
          starts_at: string;
          title: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          id?: string;
          is_active?: boolean;
          starts_at?: string;
          title?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          category: string;
          created_at: string;
          id: string;
          is_read: boolean;
          link: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          config: Json;
          created_at: string;
          id: string;
          line_total: number;
          order_id: string;
          product_id: string | null;
          product_name: string;
          qty: number;
          unit_price: number;
        };
        Insert: {
          config?: Json;
          created_at?: string;
          id?: string;
          line_total: number;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          qty?: number;
          unit_price: number;
        };
        Update: {
          config?: Json;
          created_at?: string;
          id?: string;
          line_total?: number;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          qty?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string;
          customer_address: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          discount: number;
          grand_total: number;
          base_total: number | null;
          payment_fee: number;
          gateway_ref: string | null;
          gateway_transaction_id: string | null;
          id: string;
          note: string | null;
          order_number: string;
          paid_at: string | null;
          payment_method: string | null;
          payment_ref: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          updated_at: string;
          user_id: string;
          vat_amount: number;
        };
        Insert: {
          created_at?: string;
          customer_address?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          discount?: number;
          grand_total?: number;
          base_total?: number | null;
          payment_fee?: number;
          gateway_ref?: string | null;
          gateway_transaction_id?: string | null;
          id?: string;
          note?: string | null;
          order_number?: string;
          paid_at?: string | null;
          payment_method?: string | null;
          payment_ref?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          updated_at?: string;
          user_id: string;
          vat_amount?: number;
        };
        Update: {
          created_at?: string;
          customer_address?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          discount?: number;
          grand_total?: number;
          base_total?: number | null;
          payment_fee?: number;
          gateway_ref?: string | null;
          gateway_transaction_id?: string | null;
          id?: string;
          note?: string | null;
          order_number?: string;
          paid_at?: string | null;
          payment_method?: string | null;
          payment_ref?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          updated_at?: string;
          user_id?: string;
          vat_amount?: number;
        };
        Relationships: [];
      };
      product_audit_logs: {
        Row: {
          action: string;
          changes: Json;
          created_at: string;
          id: string;
          product_id: string | null;
          product_name: string | null;
          user_email: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          changes?: Json;
          created_at?: string;
          id?: string;
          product_id?: string | null;
          product_name?: string | null;
          user_email?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          changes?: Json;
          created_at?: string;
          id?: string;
          product_id?: string | null;
          product_name?: string | null;
          user_email?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      product_categories: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          kind: Database["public"]["Enums"]["product_kind"];
          name: string;
          parent_id: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          kind: Database["public"]["Enums"]["product_kind"];
          name: string;
          parent_id?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["product_kind"];
          name?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      product_files: {
        Row: {
          created_at: string;
          file_path: string;
          id: string;
          is_current: boolean;
          kind: string;
          mime_type: string | null;
          product_id: string;
          size_bytes: number;
          title: string;
          uploaded_by: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          file_path: string;
          id?: string;
          is_current?: boolean;
          kind?: string;
          mime_type?: string | null;
          product_id: string;
          size_bytes?: number;
          title: string;
          uploaded_by?: string | null;
          version?: number;
        };
        Update: {
          created_at?: string;
          file_path?: string;
          id?: string;
          is_current?: boolean;
          kind?: string;
          mime_type?: string | null;
          product_id?: string;
          size_bytes?: number;
          title?: string;
          uploaded_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_files_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_hotspots: {
        Row: {
          attribute_group_id: string;
          coord_x: number;
          coord_y: number;
          created_at: string;
          id: string;
          pin_label: string;
          product_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          attribute_group_id: string;
          coord_x: number;
          coord_y: number;
          created_at?: string;
          id?: string;
          pin_label: string;
          product_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          attribute_group_id?: string;
          coord_x?: number;
          coord_y?: number;
          created_at?: string;
          id?: string;
          pin_label?: string;
          product_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_hotspots_attribute_group_id_fkey";
            columns: ["attribute_group_id"];
            isOneToOne: false;
            referencedRelation: "attribute_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_hotspots_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_tier_prices: {
        Row: {
          category_id: string | null;
          created_at: string;
          id: string;
          price_type: string;
          product_id: string | null;
          tier: Database["public"]["Enums"]["customer_tier"];
          updated_at: string;
          value: number;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          id?: string;
          price_type?: string;
          product_id?: string | null;
          tier: Database["public"]["Enums"]["customer_tier"];
          updated_at?: string;
          value?: number;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          id?: string;
          price_type?: string;
          product_id?: string | null;
          tier?: Database["public"]["Enums"]["customer_tier"];
          updated_at?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_tier_prices_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_tier_prices_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          attributes: Json;
          badge: string | null;
          base_price: number;
          bg_class: string | null;
          category: string;
          category_id: string | null;
          cost_price: number;
          created_at: string;
          curtain_type: string | null;
          default_fabric_id: string | null;
          default_track_type: string | null;
          description: string | null;
          id: string;
          image_url: string | null;
          images: Json;
          is_active: boolean;
          kind: Database["public"]["Enums"]["product_kind"];
          labor_per_panel: number;
          name: string;
          sale_price: number;
          sku: string | null;
          slug: string;
          sort_order: number;
          stock: number;
          tags: string[];
          unit: string;
          updated_at: string;
        };
        Insert: {
          attributes?: Json;
          badge?: string | null;
          base_price?: number;
          bg_class?: string | null;
          category: string;
          category_id?: string | null;
          cost_price?: number;
          created_at?: string;
          curtain_type?: string | null;
          default_fabric_id?: string | null;
          default_track_type?: string | null;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          images?: Json;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["product_kind"];
          labor_per_panel?: number;
          name: string;
          sale_price?: number;
          sku?: string | null;
          slug: string;
          sort_order?: number;
          stock?: number;
          tags?: string[];
          unit?: string;
          updated_at?: string;
        };
        Update: {
          attributes?: Json;
          badge?: string | null;
          base_price?: number;
          bg_class?: string | null;
          category?: string;
          category_id?: string | null;
          cost_price?: number;
          created_at?: string;
          curtain_type?: string | null;
          default_fabric_id?: string | null;
          default_track_type?: string | null;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          images?: Json;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["product_kind"];
          labor_per_panel?: number;
          name?: string;
          sale_price?: number;
          sku?: string | null;
          slug?: string;
          sort_order?: number;
          stock?: number;
          tags?: string[];
          unit?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          address: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          last_order_at: string | null;
          order_count: number;
          phone: string | null;
          tier: Database["public"]["Enums"]["customer_tier"];
          tier_override: Database["public"]["Enums"]["customer_tier"] | null;
          total_spent: number;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          last_order_at?: string | null;
          order_count?: number;
          phone?: string | null;
          tier?: Database["public"]["Enums"]["customer_tier"];
          tier_override?: Database["public"]["Enums"]["customer_tier"] | null;
          total_spent?: number;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          last_order_at?: string | null;
          order_count?: number;
          phone?: string | null;
          tier?: Database["public"]["Enums"]["customer_tier"];
          tier_override?: Database["public"]["Enums"]["customer_tier"] | null;
          total_spent?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      promo_cards: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          link_url: string;
          sort_order: number;
          subtitle: string | null;
          title: string;
          tone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          link_url?: string;
          sort_order?: number;
          subtitle?: string | null;
          title: string;
          tone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          link_url?: string;
          sort_order?: number;
          subtitle?: string | null;
          title?: string;
          tone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          comment: string | null;
          created_at: string;
          id: string;
          images: Json;
          is_approved: boolean;
          order_id: string | null;
          product_id: string;
          rating: number;
          user_id: string;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          images?: Json;
          is_approved?: boolean;
          order_id?: string | null;
          product_id: string;
          rating: number;
          user_id: string;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          images?: Json;
          is_approved?: boolean;
          order_id?: string | null;
          product_id?: string;
          rating?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      service_icons: {
        Row: {
          created_at: string;
          icon: string;
          id: string;
          is_active: boolean;
          label: string;
          link_url: string;
          sort_order: number;
          tone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          icon?: string;
          id?: string;
          is_active?: boolean;
          label: string;
          link_url?: string;
          sort_order?: number;
          tone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          icon?: string;
          id?: string;
          is_active?: boolean;
          label?: string;
          link_url?: string;
          sort_order?: number;
          tone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          about_html: string | null;
          address: string | null;
          brand_name: string;
          contact_note: string | null;
          email: string | null;
          facebook_url: string | null;
          instagram_url: string | null;
          key: string;
          line_url: string | null;
          logo_url: string | null;
          phone: string | null;
          tagline: string | null;
          tiktok_url: string | null;
          updated_at: string;
          value: Json | null;
        };
        Insert: {
          about_html?: string | null;
          address?: string | null;
          brand_name?: string;
          contact_note?: string | null;
          email?: string | null;
          facebook_url?: string | null;
          instagram_url?: string | null;
          key: string;
          line_url?: string | null;
          logo_url?: string | null;
          phone?: string | null;
          tagline?: string | null;
          tiktok_url?: string | null;
          updated_at?: string;
          value?: Json | null;
        };
        Update: {
          about_html?: string | null;
          address?: string | null;
          brand_name?: string;
          contact_note?: string | null;
          email?: string | null;
          facebook_url?: string | null;
          instagram_url?: string | null;
          key?: string;
          line_url?: string | null;
          logo_url?: string | null;
          phone?: string | null;
          tagline?: string | null;
          tiktok_url?: string | null;
          updated_at?: string;
          value?: Json | null;
        };
        Relationships: [];
      };
      topup_requests: {
        Row: {
          amount: number;
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          id: string;
          method: Database["public"]["Enums"]["topup_method"];
          reference_note: string | null;
          rejected_reason: string | null;
          slip_url: string | null;
          status: Database["public"]["Enums"]["topup_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          id?: string;
          method?: Database["public"]["Enums"]["topup_method"];
          reference_note?: string | null;
          rejected_reason?: string | null;
          slip_url?: string | null;
          status?: Database["public"]["Enums"]["topup_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          id?: string;
          method?: Database["public"]["Enums"]["topup_method"];
          reference_note?: string | null;
          rejected_reason?: string | null;
          slip_url?: string | null;
          status?: Database["public"]["Enums"]["topup_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tracks: {
        Row: {
          code: string | null;
          cost_per_meter: number;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          price_per_meter: number;
          sort_order: number;
          type: string;
          updated_at: string;
        };
        Insert: {
          code?: string | null;
          cost_per_meter?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          price_per_meter?: number;
          sort_order?: number;
          type?: string;
          updated_at?: string;
        };
        Update: {
          code?: string | null;
          cost_per_meter?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          price_per_meter?: number;
          sort_order?: number;
          type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_coupons: {
        Row: {
          claimed_at: string;
          coupon_id: string;
          id: string;
          order_id: string | null;
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          claimed_at?: string;
          coupon_id: string;
          id?: string;
          order_id?: string | null;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          claimed_at?: string;
          coupon_id?: string;
          id?: string;
          order_id?: string | null;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_coupons_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      wallet_transactions: {
        Row: {
          amount: number;
          balance_after: number;
          created_at: string;
          id: string;
          note: string | null;
          reference_id: string | null;
          type: Database["public"]["Enums"]["wallet_tx_type"];
          user_id: string;
          wallet_id: string;
        };
        Insert: {
          amount: number;
          balance_after: number;
          created_at?: string;
          id?: string;
          note?: string | null;
          reference_id?: string | null;
          type: Database["public"]["Enums"]["wallet_tx_type"];
          user_id: string;
          wallet_id: string;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          created_at?: string;
          id?: string;
          note?: string | null;
          reference_id?: string | null;
          type?: Database["public"]["Enums"]["wallet_tx_type"];
          user_id?: string;
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      wallets: {
        Row: {
          balance: number;
          created_at: string;
          id: string;
          total_spent: number;
          total_topup: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          balance?: number;
          created_at?: string;
          id?: string;
          total_spent?: number;
          total_topup?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          balance?: number;
          created_at?: string;
          id?: string;
          total_spent?: number;
          total_topup?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_adjust_wallet: {
        Args: { _amount: number; _note: string; _user_id: string };
        Returns: Json;
      };
      admin_get_product: {
        Args: { _id: string };
        Returns: {
          attributes: Json;
          badge: string | null;
          base_price: number;
          bg_class: string | null;
          category: string;
          category_id: string | null;
          cost_price: number;
          created_at: string;
          curtain_type: string | null;
          default_fabric_id: string | null;
          default_track_type: string | null;
          description: string | null;
          id: string;
          image_url: string | null;
          images: Json;
          is_active: boolean;
          kind: Database["public"]["Enums"]["product_kind"];
          labor_per_panel: number;
          name: string;
          sale_price: number;
          sku: string | null;
          slug: string;
          sort_order: number;
          stock: number;
          tags: string[];
          unit: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "products";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      admin_list_accessories: {
        Args: never;
        Returns: {
          cost: number;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          price: number;
          sort_order: number;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "accessories";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      admin_list_tracks: {
        Args: never;
        Returns: {
          code: string | null;
          cost_per_meter: number;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          price_per_meter: number;
          sort_order: number;
          type: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "tracks";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      claim_coupon: { Args: { _code: string }; Returns: Json };
      compute_tier: {
        Args: { _count: number; _total: number };
        Returns: Database["public"]["Enums"]["customer_tier"];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      pay_with_wallet: { Args: { _order_id: string }; Returns: Json };
      recalc_tier: { Args: { _user_id: string }; Returns: undefined };
      resolve_product_price: {
        Args: {
          _product_id: string;
          _tier: Database["public"]["Enums"]["customer_tier"];
        };
        Returns: number;
      };
    };
    Enums: {
      app_role: "customer" | "admin";
      coupon_type: "percent" | "fixed" | "free_shipping";
      customer_tier: "bronze" | "silver" | "gold" | "platinum" | "vip";
      order_status:
        | "draft"
        | "pending_payment"
        | "paid"
        | "producing"
        | "shipped"
        | "done"
        | "cancelled";
      product_kind:
        | "curtain"
        | "wood_blind"
        | "aluminum_blind"
        | "dim_blind"
        | "ready_curtain"
        | "accessory"
        | "other";
      topup_method: "bank_transfer" | "promptpay" | "credit_card";
      topup_status: "pending" | "approved" | "rejected" | "cancelled";
      wallet_tx_type: "topup" | "payment" | "refund" | "adjust";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "admin"],
      coupon_type: ["percent", "fixed", "free_shipping"],
      customer_tier: ["bronze", "silver", "gold", "platinum", "vip"],
      order_status: [
        "draft",
        "pending_payment",
        "paid",
        "producing",
        "shipped",
        "done",
        "cancelled",
      ],
      product_kind: [
        "curtain",
        "wood_blind",
        "aluminum_blind",
        "dim_blind",
        "ready_curtain",
        "accessory",
        "other",
      ],
      topup_method: ["bank_transfer", "promptpay", "credit_card"],
      topup_status: ["pending", "approved", "rejected", "cancelled"],
      wallet_tx_type: ["topup", "payment", "refund", "adjust"],
    },
  },
} as const;
