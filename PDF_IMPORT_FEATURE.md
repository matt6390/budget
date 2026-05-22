# PDF Purchase Import Feature

## Overview

This feature allows users to upload PDF files (receipts, invoices, bank statements) and extract purchase data automatically. The system intelligently parses dates, merchant names, and amounts from the PDF content, presents them for review, and automatically suggests categories based on merchant history.

## Key Features

### 1. **PDF Upload with Page Selection**
- Drag-and-drop interface for PDF files
- Optional page number selection (e.g., "1,3,5" to extract specific pages)
- File size and estimated page count display

### 2. **Intelligent Text Extraction**
- **Text-first extraction**: Uses PyPDF2 for PDFs with searchable text
- **OCR fallback**: Automatically falls back to Tesseract OCR for scanned PDFs
- **No external APIs**: All processing done locally (CPU-only, no GPU required)
- Supports multiple PDF formats (receipts, invoices, statements)

### 3. **Smart Purchase Data Parsing**
Automatically extracts:
- **Dates**: Supports multiple formats (MM/DD/YYYY, YYYY-MM-DD, "March 5, 2024", etc.)
- **Merchant names**: Intelligently identifies merchant/vendor names
- **Amounts**: Recognizes various formats ($123.45, $1,234.56, 123.45, etc.)

### 4. **Category Suggestions**
- Per-user merchant lookup table
- When you import a purchase from a merchant you've seen before, the system suggests the category you previously assigned
- Fallback to manual category selection for new merchants

### 5. **Confirmation Workflow**
- Review extracted purchases in a table before saving
- Edit merchant names or amounts if needed
- Assign or update categories inline
- Bulk save all purchases at once

### 6. **PDF Storage**
- Original PDF files are stored alongside purchases for audit trail
- Users can view imported PDFs later for reference

## Technical Architecture

### Backend (`apps/pdf_import`)

#### Models
- **PdfImportSession**: Tracks PDF uploads and extracted data
  - `user`: Links to auth user
  - `pdf_file`: Stores the original PDF
  - `status`: pending → extracted → confirmed
  - `extracted_data`: JSON array of parsed purchases

- **MerchantCategory**: User-scoped merchant lookup table
  - `user`: Links to auth user
  - `merchant_name`: Name of the merchant
  - `category`: Suggested category
  - `last_used_at`: For sorting suggestions

#### API Endpoints

**POST /api/purchases/import/upload/**
- Upload PDF and extract data
- Optional: `page_numbers` (comma-separated)
- Returns: `PdfImportSession` with extracted_data

**GET /api/purchases/import/{session_id}/**
- Retrieve extraction session for review

**POST /api/purchases/import/{session_id}/confirm/**
- Confirm purchases and save to database
- Request body: `{ "purchases": [...] }`
- Auto-updates MerchantCategory lookup table
- Returns: Created purchase IDs and count

**GET /api/purchases/import/suggest-category/**
- Query parameter: `merchant_name`
- Returns: Suggested category if available

#### Text Extraction (`extraction.py`)

**PdfExtractor**
- `extract_text()`: Main method, tries PyPDF2 first, falls back to OCR
- `extract_text_from_pages()`: Extract from specific pages
- Gracefully handles both text-based and scanned PDFs

**PurchaseParser**
- `parse()`: Main parsing logic
- Looks for dates and amounts within 3 lines of each other
- Extracts merchant names from surrounding context
- Normalizes dates to YYYY-MM-DD format
- Validates amounts as Decimal objects

### Frontend

#### Components

**PdfUpload**
- Drag-and-drop upload interface
- File validation (PDF only)
- Page selection input
- Visual feedback during upload

**PurchaseConfirmation**
- Table view of extracted purchases
- Category dropdown with suggestions (✓ marked)
- Inline editing support
- Bulk confirm/cancel buttons

**PdfImportPage**
- Orchestrates the full workflow
- 3-step progress indicator
- Success screen with purchase count

#### Routes
- `/import-pdf`: Full PDF import workflow

## Usage Flow

1. **Upload**: User navigates to "📄 Import PDF" in sidebar
2. **Extract**: Upload PDF (or select specific pages), system extracts data
3. **Review**: Table shows dates, merchants, amounts with category suggestions
4. **Confirm**: User assigns categories (can use suggestions), confirms all at once
5. **Save**: Purchases added to database, PDF stored, MerchantCategory updated
6. **Success**: User sees confirmation screen

## Installation & Setup

### Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

Required packages:
- `PyPDF2==3.0.1`: Text extraction from PDFs
- `pytesseract==0.3.10`: OCR processing
- `pdf2image==1.16.3`: Convert PDFs to images for OCR

### System Requirements
- **Tesseract**: Required for OCR (scanned PDF support)
  - macOS: `brew install tesseract`
  - Linux: `apt-get install tesseract-ocr`
  - Windows: Download installer from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)

### Django Setup
```bash
cd backend
DJANGO_SETTINGS_MODULE=config.settings.local python manage.py makemigrations
DJANGO_SETTINGS_MODULE=config.settings.local python manage.py migrate
```

### Frontend Setup
No additional dependencies needed (built into existing React/Vite setup).

## Configuration

### Upload Path
PDFs are stored at: `media/pdf_imports/YYYY/MM/DD/`

Configure in Django settings if needed:
```python
MEDIA_ROOT = BASE_DIR / 'media'
MEDIA_URL = '/media/'
```

### File Size Limits
Default: 50MB (set in Django settings)

## Testing

### Backend Extraction Tests
```bash
cd backend
source venv/bin/activate
DJANGO_SETTINGS_MODULE=config.settings.local python apps/pdf_import/test_extraction.py
```

Tests cover:
- Date format variations
- Amount parsing with commas
- Dollar sign handling
- Multi-line extraction
- No false positives

### Manual Testing
1. Go to `/import-pdf` page
2. Upload sample PDF (receipt, invoice, etc.)
3. Verify extracted data
4. Assign categories
5. Confirm and check purchases list

## Limitations & Future Improvements

### Current Limitations
- OCR quality depends on PDF quality (scanned documents may have errors)
- Simple heuristic-based parsing (not ML-based)
- Per-user merchant lookup only (not global)
- Manual category assignment still required for new merchants

### Future Enhancements
- [ ] Batch import (multiple PDFs at once)
- [ ] Email receipt forwarding
- [ ] Automatic merchant name normalization (e.g., "TARGET" + "Target" → same merchant)
- [ ] ML-based category classification
- [ ] Receipt image preview in confirmation step
- [ ] Duplicate detection
- [ ] Receipt archive/search feature

## Error Handling

### Common Issues

**"Failed to extract text from PDF"**
- PDF may be corrupted or require specific permissions
- Try uploading a different PDF to verify system works

**"No text found in PDF"**
- Likely a scanned PDF requiring OCR
- System will attempt OCR automatically
- If still failing, OCR may need configuration (Tesseract installation)

**"No purchases found"**
- PDF may not contain recognizable purchase data
- System looks for dates, amounts, and merchant names
- Verify PDF contains these elements

## Security Considerations

- PDFs stored in Django media directory (restrict file permissions)
- All data tied to authenticated user
- User can only see their own import sessions and merchant categories
- Input validation on all API endpoints

## Performance

- Small PDFs (<5MB): < 1 second
- Medium PDFs (5-20MB): 1-5 seconds
- Large/scanned PDFs (20MB+): 5-30 seconds (OCR is slower)

Estimated page count shown during upload is approximate (based on file size heuristic).
