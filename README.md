# JDI Garments

A modern web storefront and inventory management system for JDI Garments, featuring dynamic product displays, real-time catalog synchronization, WhatsApp-based order placement, and an administrative dashboard.

---

## Overview

JDI Garments is a lightweight, responsive static web application designed for retail fashion stores. Customers can browse weekly collections, search by keyword, filter by custom categories, review detailed item specifications and sizes, and place orders directly through WhatsApp for in-store pickup. Store administrators can manage inventory, upload photos, and update stock status via a password-protected administrative interface backed by Supabase.

---

## Features

### Customer Storefront
* Dynamic Catalog: Automatically fetches and renders available inventory directly from Supabase with real-time updates.
* Filter and Search: Filter products by categories and perform instant client-side keyword searches.
* Product Quick View: Responsive modal displaying full-size garment photos, size selectors, color chips, and stock status.
* WhatsApp Ordering: Pre-populates a structured WhatsApp message with the item name, selected size, chosen color, and price.
* Motion Banner & Promo Slider: Promotional top bar and animated hero banners.
* Store Showcase: Highlights the physical retail location near Devichowk with direct Google Maps and phone call links.

### Admin Dashboard
* Authentication: Secure email and password login powered by Supabase Auth.
* Product Management: Create, edit, and delete products with name, category, price, discount price, sizes, and colors.
* Image Uploads: Direct image upload to Supabase Storage with public URL generation.
* Stock Controls: Toggle "In stock" / "Sold out" and "New arrival" badges with one click.

---

## Technology Stack

* Frontend: Semantic HTML5, Vanilla CSS3, Modern JavaScript (ES6+)
* Database: Supabase (PostgreSQL)
* Storage: Supabase Storage Bucket (`product-images`)
* Authentication: Supabase Auth
* External Integrations: WhatsApp Click-to-Chat API, Google Maps URL API

---

## Project Structure

```text
.
|-- index.html          # Main customer storefront
|-- style.css           # Global stylesheet and responsive design system
|-- script.js           # Storefront logic, search, filters, and Supabase integration
|-- Admin.html          # Administrator login and product management dashboard
|-- Admin.js            # Admin CRUD operations, auth handling, and photo uploads
|-- config.js           # Supabase connection configuration
|-- .gitignore          # Git exclusion rules
|-- banner1.jpg         # Hero banner asset
|-- banner2.jpg         # Hero banner asset
|-- photo.jpg           # Brand visual asset
|-- store_main.jpg      # Store showcase image
|-- store_interior.jpg  # Store interior showcase image
|-- store_rack.jpg      # Store clothing rack showcase image
|-- store_denim.jpg     # Store denim collection showcase image
`-- README.md           # Documentation
```

---

## Setup and Configuration

### 1. Configure Shop Details
Open `script.js` and update the `SHOP` configuration object at the top of the file with your store's information:

```javascript
const SHOP = {
    name: "JDI Garments",
    whatsapp: "91XXXXXXXXXX",          // Order WhatsApp number with country code, no + or spaces
    phone: "+91XXXXXXXXXX",             // Shop phone number
    communityLink: "",                  // Optional WhatsApp community link
    mapQuery: "JDI Garments Devichowk"   // Google Maps location query
};
```

### 2. Configure Supabase Connection
Open `config.js` and verify your Supabase project URL and publishable key:

```javascript
const SUPABASE_URL = "https://your-project-id.supabase.co";
const SUPABASE_KEY = "sb_publishable_your_key";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
```

### 3. Supabase Database Schema

Ensure the `products` table exists in your Supabase SQL editor with the following columns:

```sql
create table public.products (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    name text not null,
    category text not null,
    price integer not null,
    original_price integer,
    sizes text[] default '{}'::text[],
    colors text[] default '{}'::text[],
    images text[] default '{}'::text[],
    in_stock boolean default true not null,
    is_new boolean default false not null
);
```

### 4. Supabase Row Level Security (RLS)

Enable Row Level Security on the `products` table:

```sql
alter table public.products enable row level security;

-- Allow public read access to products
create policy "Allow public read access"
on public.products
for select
to anon, authenticated
using (true);

-- Allow authenticated admins to insert products
create policy "Allow admin insert"
on public.products
for insert
to authenticated
with check (true);

-- Allow authenticated admins to update products
create policy "Allow admin update"
on public.products
for update
to authenticated
using (true);

-- Allow authenticated admins to delete products
create policy "Allow admin delete"
on public.products
for delete
to authenticated
using (true);
```

### 5. Supabase Storage Bucket Setup
1. In your Supabase Dashboard, navigate to **Storage**.
2. Create a new bucket named `product-images`.
3. Set the bucket to **Public** so product images are accessible to visitors.
4. Add policies granting upload and delete access to `authenticated` users only.

### 6. Admin User Registration
1. In the Supabase Dashboard, navigate to **Authentication** > **Users**.
2. Create an admin user with your email and password.
3. Under **Authentication** > **Providers** > **Email**, disable **"Allow new users to sign up"** to prevent unauthorized registrations.

---

## Deployment to GitHub Pages

1. Initialize git and commit all files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of JDI Garments website"
   ```
2. Create a repository on GitHub and link the remote:
   ```bash
   git remote add origin https://github.com/your-username/your-repository.git
   git branch -M main
   git push -u origin main
   ```
3. Enable GitHub Pages:
   * Go to **Repository Settings** > **Pages**.
   * Under **Branch**, select `main` and `/ (root)`.
   * Click **Save**.
4. The storefront will be live at `https://your-username.github.io/your-repository/`.
5. Access the administrative panel at `https://your-username.github.io/your-repository/Admin.html`.

---

## License

This project is proprietary and intended for JDI Garments. All rights reserved.
