/** UI invoice list row */
export interface InvoiceViewModel {
  id: string;
  invoiceNo: string;
  patientName: string;
  total: number;
  paid: number;
  due: number;
  date: string;
  dueDate?: string;
  status: string;
}
