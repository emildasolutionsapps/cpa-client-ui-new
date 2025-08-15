# How to Upload Your Company Logo

## Step 1: Save the Logo Image
1. Save the VVV logo image you provided as `company-logo.png` (or `.jpg/.svg`)
2. Make sure the image is optimized for web (recommended size: 200x200px or similar)

## Step 2: Upload to Supabase Storage

### Option A: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/yppyiisuvytbblusvtoh
2. Navigate to **Storage** in the left sidebar
3. Click on the **invoice-pdfs** bucket (or create a new bucket called "company-assets")
4. Click **Upload file**
5. Upload your logo file as `company-logo.png`
6. Make sure the file is set to **public**
7. Copy the public URL (it should look like: `https://yppyiisuvytbblusvtoh.supabase.co/storage/v1/object/public/invoice-pdfs/company-logo.png`)

### Option B: Using the Supabase CLI
```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Upload the file
supabase storage cp ./company-logo.png supabase://invoice-pdfs/company-logo.png --project-ref yppyiisuvytbblusvtoh
```

## Step 3: Update the Logo URL
1. Open `src/constants/branding.ts`
2. Replace the `COMPANY_LOGO_URL` with your actual logo URL
3. The URL should be: `https://yppyiisuvytbblusvtoh.supabase.co/storage/v1/object/public/invoice-pdfs/company-logo.png`

## Current Implementation
The logo has been implemented in:
- ✅ Sidebar (desktop view)
- ✅ Mobile header
- ✅ Login page

All locations include fallback icons in case the logo fails to load.

## File Locations Updated
- `src/constants/branding.ts` - Logo URL and company info
- `src/components/Sidebar.tsx` - Desktop sidebar logo
- `src/components/MobileHeader.tsx` - Mobile header logo  
- `src/pages/Login.tsx` - Login page logo

Once you upload the logo and update the URL, it will automatically appear in all these locations!
