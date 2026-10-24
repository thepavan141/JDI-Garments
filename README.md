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

## License

This project is proprietary and intended for JDI Garments. All rights reserved.
