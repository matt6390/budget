import client from './client'

export interface ExtractedPurchase {
  date: string
  merchant: string
  amount: string
}

export interface PdfImportSession {
  id: number
  pdf_file: string
  status: 'pending' | 'extracted' | 'confirmed'
  extracted_data: ExtractedPurchase[]
  created_at: string
  updated_at: string
}

export interface ConfirmPurchaseData extends ExtractedPurchase {
  category?: number
}

export const getPdfPageCount = async (file: File): Promise<number> => {
  const formData = new FormData()
  formData.append('pdf_file', file)
  const response = await client.post<{ page_count: number }>('/purchases/import/page-count/', formData)
  return response.data.page_count
}

export const uploadPdf = async (file: File, pageNumbers?: number[]): Promise<PdfImportSession> => {
  const formData = new FormData()
  formData.append('pdf_file', file)
  
  if (pageNumbers && pageNumbers.length > 0) {
    formData.append('page_numbers', pageNumbers.join(','))
  }

  const response = await client.post<PdfImportSession>('/purchases/import/upload/', formData)
  return response.data
}

export const getImportSession = async (sessionId: number): Promise<PdfImportSession> => {
  const response = await client.get<PdfImportSession>(`/purchases/import/${sessionId}/`)
  return response.data
}

export const confirmPurchases = async (
  sessionId: number,
  purchases: ConfirmPurchaseData[],
): Promise<{ session_id: number; created_purchases: number[]; count: number }> => {
  const response = await client.post(
    `/purchases/import/${sessionId}/confirm/`,
    { purchases },
  )
  return response.data
}

export const suggestCategory = async (merchantName: string): Promise<{
  merchant_name: string
  category_id: number | null
  category_name: string | null
}> => {
  const response = await client.get('/purchases/import/suggest-category/', {
    params: { merchant_name: merchantName },
  })
  return response.data
}

/** Fetch category suggestions for many merchants in one request. Returns a map of merchant_name → suggestion or null. */
export const suggestCategoryBatch = async (
  merchantNames: string[],
): Promise<Record<string, { category_id: number; category_name: string } | null>> => {
  const response = await client.post('/purchases/import/suggest-category-batch/', {
    merchant_names: merchantNames,
  })
  return response.data
}

export const deleteImportSession = async (sessionId: number): Promise<void> => {
  await client.delete(`/purchases/import/${sessionId}/`)
}
