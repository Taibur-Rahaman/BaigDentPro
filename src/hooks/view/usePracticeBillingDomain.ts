import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import api from '@/api';
import {
  DEFAULT_DENTAL_PROCEDURES,
  formatLocalYMD,
} from '@/hooks/view/practiceWorkspaceShared';
import type { InvoiceViewModel, LabOrderViewModel, PatientViewModel } from '@/viewModels';

export function usePracticeBillingDomain(opts: {
  token: string | null | undefined;
  userName: string;
  patients: PatientViewModel[];
  invoices: InvoiceViewModel[];
  setInvoices: Dispatch<SetStateAction<InvoiceViewModel[]>>;
  setLabOrders: Dispatch<SetStateAction<LabOrderViewModel[]>>;
  filteredInvoicesForBilling: InvoiceViewModel[];
  loadData: () => void | Promise<void>;
  showToast: (msg: string) => void;
}) {
  const {
    token,
    userName,
    patients,
    invoices,
    setInvoices,
    setLabOrders,
    filteredInvoicesForBilling,
    loadData,
    showToast,
  } = opts;

  const [dashboardHeaderDraft, setDashboardHeaderDraft] = useState({
    clinicName: '',
    address: '',
    phone: '',
    clinicLogo: '',
    doctorName: userName,
    degree: '',
    specialization: '',
    doctorLogo: '',
  });

  const [dashboardPrintDraft, setDashboardPrintDraft] = useState({
    paperSize: 'A4' as 'A4' | 'A5' | 'Letter',
    headerHeight: 100,
  });

  useEffect(() => {
    setDashboardHeaderDraft((prev) => api.ui.hydrateDashboardHeaderDraft(prev));
    setDashboardPrintDraft((prev) => api.ui.hydrateDashboardPrintDraft(prev));
  }, [userName]);

  const [invoiceForm, setInvoiceForm] = useState({
    patientId: '',
    items: [] as { description: string; amount: number }[],
    discount: 0,
    dueDate: '',
  });
  const [labForm, setLabForm] = useState({
    patientId: '',
    workType: 'Crown',
    description: '',
    toothNumber: '',
    shade: '',
  });
  const [billingProcedures, _setBillingProcedures] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_DENTAL_PROCEDURES;
    return api.ui.loadBillingProcedureList(DEFAULT_DENTAL_PROCEDURES);
  });
  const [_newBillingProcedure, _setNewBillingProcedure] = useState('');
  const [customLineDescription, setCustomLineDescription] = useState('');
  const [customLineAmount, setCustomLineAmount] = useState<string>('');

  const handleCreateInvoice = useCallback(async () => {
    if (!invoiceForm.patientId || invoiceForm.items.length === 0) {
      showToast('Select patient and add items');
      return;
    }
    if (token) {
      try {
        await api.invoices.create({
          patientId: invoiceForm.patientId,
          discount: invoiceForm.discount,
          dueDate: invoiceForm.dueDate ? invoiceForm.dueDate : undefined,
          items: invoiceForm.items.map((item) => ({
            description: item.description,
            quantity: 1,
            unitPrice: item.amount,
          })),
        });
        setInvoiceForm({ patientId: '', items: [], discount: 0, dueDate: '' });
        showToast('Invoice created');
        void loadData();
      } catch (e: unknown) {
        showToast((e as { message?: string })?.message ?? 'Failed to create invoice');
      }
      return;
    }
    const patient = patients.find((p) => p.id === invoiceForm.patientId);
    const total = invoiceForm.items.reduce((sum, item) => sum + item.amount, 0) - invoiceForm.discount;
    const newInvoice: InvoiceViewModel = {
      id: crypto.randomUUID(),
      invoiceNo: `INV${new Date().getFullYear()}${String(invoices.length + 1).padStart(4, '0')}`,
      patientName: patient?.name || 'Unknown',
      total,
      paid: 0,
      due: total,
      date: formatLocalYMD(new Date()),
      dueDate: invoiceForm.dueDate || undefined,
      status: 'PENDING',
    };
    setInvoices([newInvoice, ...invoices]);
    setInvoiceForm({ patientId: '', items: [], discount: 0, dueDate: '' });
    showToast('Invoice created');
  }, [invoiceForm, invoices, patients, setInvoices, showToast, token, loadData]);

  const handlePrintInvoice = useCallback(
    (invoice: InvoiceViewModel) => {
      const invoiceHtml = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Invoice - ${invoice.invoiceNo}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', sans-serif; padding: 24px 32px; color: #111827; background: #fff; }
          .shell { max-width: 820px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 28px 32px; border-radius: 12px; }
          .title { text-align: center; font-size: 22px; font-weight: 800; letter-spacing: 0.6px; margin: 0 0 6px; }
          .subtitle { text-align: center; font-size: 12px; color: #6b7280; margin: 0 0 18px; }
          .top { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: start; }
          .brand h2 { margin: 0 0 2px; font-size: 18px; }
          .brand p { margin: 0; font-size: 13px; color: #6b7280; }
          .billto { margin-top: 12px; font-size: 13px; color: #374151; }
          .meta { font-size: 13px; color: #374151; text-align: right; }
          .meta div { margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 6px; }
          th { text-align: left; color: #374151; font-weight: 700; }
          td.amount, th.amount { text-align: right; }
          .totals { margin-top: 12px; display: flex; justify-content: flex-end; }
          .totals-card { min-width: 260px; font-size: 13px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 6px; color: #374151; }
          .row strong { color: #111827; }
          .grand { border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 10px; font-size: 14px; }
          @media print { body { padding: 0; } .shell { border: none; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="shell">
          <h1 class="title">Invoice</h1>
          <p class="subtitle">BaigDentPro Clinic</p>
          <div class="top">
            <div class="brand">
              <h2>BaigDentPro Clinic</h2>
              <p>Dental practice billing invoice</p>
              <div class="billto"><strong>Patient:</strong> ${invoice.patientName}</div>
            </div>
            <div class="meta">
              <div><strong>Invoice No:</strong> ${invoice.invoiceNo}</div>
              <div><strong>Date:</strong> ${invoice.date}</div>
              <div><strong>Status:</strong> ${invoice.status}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount">Amount (৳)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Dental treatment & procedures</td>
                <td class="amount">${invoice.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-card">
              <div class="row"><span>Total</span><strong>৳ ${invoice.total.toFixed(2)}</strong></div>
              <div class="row"><span>Paid</span><strong>৳ ${invoice.paid.toFixed(2)}</strong></div>
              <div class="row grand"><span>Due</span><strong>৳ ${invoice.due.toFixed(2)}</strong></div>
            </div>
          </div>
        </div>
      </body>
      </html>`;
      const printWindow = window.open('', '_blank', 'width=900,height=650');
      if (!printWindow) {
        showToast('Popup blocked. Allow popups to print.');
        return;
      }
      printWindow.document.open();
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch {
          /* ignore */
        }
        setTimeout(() => {
          try {
            printWindow.close();
          } catch {
            /* ignore */
          }
        }, 500);
      }, 450);
    },
    [showToast],
  );

  const handlePrintMushok63 = useCallback((invoice: InvoiceViewModel) => {
    const printHtml = (title: string, html: string) => {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('style', 'position:fixed;left:0;top:0;width:0;height:0;border:0;');
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (!doc) return;
      doc.open();
      doc.write(html);
      doc.close();
      doc.title = title;
      const printFn = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 500);
      };
      iframe.onload = () => setTimeout(printFn, 400);
    };

    const mushokHtml = `<!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8" />
        <title>মূশক-৬.৩ - ${invoice.invoiceNo}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, system-ui, 'Noto Sans Bengali', 'Segoe UI', sans-serif; padding: 24px 32px; color: #111827; background: #fff; }
          .shell { max-width: 800px; margin: 0 auto; border: 1px solid #111827; padding: 24px 32px; }
          .gov-header { text-align: center; margin-bottom: 8px; }
          .gov-header h1 { font-size: 16px; margin: 0; }
          .gov-header h2 { font-size: 14px; margin: 4px 0 0; }
          .title-row { display: flex; justify-content: space-between; align-items: flex-start; margin: 8px 0 16px; }
          .box { border: 1px solid #111827; padding: 4px 12px; font-size: 13px; font-weight: 600; }
          .main-title { text-align: center; font-size: 14px; font-weight: 600; margin-bottom: 12px; }
          .section { font-size: 13px; margin-bottom: 10px; }
          .section strong { display: inline-block; min-width: 130px; }
          .flex-row { display: flex; justify-content: space-between; gap: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { border: 1px solid #111827; padding: 6px 4px; text-align: center; }
          th { font-weight: 600; }
          .right { text-align: right; padding-right: 8px; }
          .total-row td { font-weight: 600; }
          .sign-section { margin-top: 28px; font-size: 12px; }
          .footnote { margin-top: 16px; font-size: 11px; line-height: 1.4; }
        </style>
      </head>
      <body>
        <div class="shell">
          <div class="gov-header">
            <h1>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h1>
            <h2>জাতীয় রাজস্ব বোর্ড</h2>
          </div>
          <div class="title-row">
            <div class="main-title">
              কর চালানপত্র<br />
              [ ভ্যাট ও সম্পূরক শুল্ক আইন, ২০১২ (ধারা ৪০) এর উপধারা (১) এর দফা (গ) ও দফা (ঘ) ]
            </div>
            <div class="box">মূশক-৬.৩</div>
          </div>
          <div class="section">
            <strong>নিবন্ধিত ব্যক্তির নাম:</strong> BaigDentPro Clinic<br />
            <strong>নিবন্ধিত ব্যক্তির বিআইএন:</strong> _________________________<br />
            <strong>চালানপত্র ইস্যুকারীর ঠিকানা:</strong> _________________________
          </div>
          <div class="flex-row section">
            <div>
              <strong>ক্রেতার নাম:</strong> ${invoice.patientName}<br />
              <strong>সরবরাহের গন্তব্যস্থল:</strong> _________________________
            </div>
            <div>
              <strong>চালানপত্র নম্বর:</strong> ${invoice.invoiceNo}<br />
              <strong>ইস্যুর তারিখ:</strong> ${invoice.date}<br />
              <strong>ইস্যুর সময়:</strong> __________
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>ক্রমিক</th>
                <th>পণ্য বা সেবার বর্ণনা<br />(প্রয়োজনে ব্র্যান্ড নামসহ)</th>
                <th>সরবরাহের একক</th>
                <th>পরিমাণ</th>
                <th>একক মূল্য<br />(টাকায়)</th>
                <th>মোট মূল্য<br />(টাকায়)</th>
                <th>মূল্য সংযোজন করের হার / সুনির্দিষ্ট কর</th>
                <th>মূল্য সংযোজন কর / সুনির্দিষ্ট করের পরিমাণ<br />(টাকায়)</th>
                <th>সকল প্রকার শুল্ক ও করসহ মূল্য<br />(টাকায়)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>১</td>
                <td>ডেন্টাল চিকিৎসা সেবা</td>
                <td>সেবা</td>
                <td>১</td>
                <td class="right">${invoice.total.toFixed(2)}</td>
                <td class="right">${invoice.total.toFixed(2)}</td>
                <td>১৫%</td>
                <td class="right">${(invoice.total * 0.15).toFixed(2)}</td>
                <td class="right">${(invoice.total * 1.15).toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="5" class="right">সর্বমোট</td>
                <td class="right">${invoice.total.toFixed(2)}</td>
                <td></td>
                <td class="right">${(invoice.total * 0.15).toFixed(2)}</td>
                <td class="right">${(invoice.total * 1.15).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div class="sign-section">
            <div>প্রতিষ্ঠান কর্তৃপক্ষের দায়িত্বপ্রাপ্ত ব্যক্তির নাম: __________________________</div>
            <div>পদবী: __________________________</div>
            <div>স্বাক্ষর: __________________________</div>
            <div>সীল: __________________________</div>
          </div>
          <div class="footnote">
            * উপরোক্ত তথ্যাবলী সরবরাহের ক্ষেত্রে ফরমটি সম্মিলিত কর চালানপত্র ও উৎসে কর কর্তন সনদপত্র হিসেবে বিবেচিত হইবে এবং উক্ত উৎস কর কর্তনকারীর সরবরাহের ক্ষেত্রে প্রযোজ্য হবে।
          </div>
        </div>
      </body>
      </html>`;

    printHtml(`মূশক-৬.৩ - ${invoice.invoiceNo}`, mushokHtml);
  }, []);

  const handleCreateLabOrder = useCallback(async () => {
    if (!labForm.patientId || !labForm.workType) {
      showToast('Select patient and work type');
      return;
    }
    if (token) {
      try {
        await api.lab.create({
          patientId: labForm.patientId,
          workType: labForm.workType,
          description: labForm.description || labForm.workType,
          toothNumber: labForm.toothNumber || undefined,
          shade: labForm.shade || undefined,
        });
        setLabForm({ patientId: '', workType: 'Crown', description: '', toothNumber: '', shade: '' });
        showToast('Lab order created');
        void loadData();
      } catch (e: unknown) {
        showToast((e as { message?: string })?.message ?? 'Failed to create lab order');
      }
      return;
    }
    showToast('Sign in to create lab orders');
  }, [labForm, loadData, showToast, token]);

  const exportInvoicesCsv = useCallback(() => {
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const list = filteredInvoicesForBilling;
    const lines = [
      ['Invoice No', 'Patient', 'Date', 'Due date', 'Total', 'Paid', 'Due', 'Status'].join(','),
      ...list.map((inv) =>
        [
          esc(inv.invoiceNo),
          esc(inv.patientName),
          esc(inv.date),
          esc(inv.dueDate || ''),
          String(inv.total),
          String(inv.paid),
          String(inv.due),
          esc(inv.status),
        ].join(','),
      ),
    ];
    const blob = new Blob(['\ufeff', lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${formatLocalYMD(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Invoices exported');
  }, [filteredInvoicesForBilling, showToast]);

  const markLabOrderDelivered = useCallback(
    async (orderId: string) => {
      if (token) {
        try {
          await api.lab.markDelivered(orderId);
          showToast('Lab order marked delivered');
          void loadData();
        } catch (e: unknown) {
          showToast((e as { message?: string })?.message ?? 'Failed to update lab order');
        }
        return;
      }
      setLabOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'DELIVERED' } : o)));
    },
    [loadData, setLabOrders, showToast, token],
  );

  const saveDashboardClinic = useCallback(() => {
    try {
      api.ui.mergeDashboardHeaderClinic(api.ui.readHeaderSettingsRecord(), {
        clinicName: dashboardHeaderDraft.clinicName,
        address: dashboardHeaderDraft.address,
        phone: dashboardHeaderDraft.phone,
        clinicLogo: dashboardHeaderDraft.clinicLogo,
      });
      showToast('Clinic settings saved');
    } catch {
      showToast('Failed to save clinic settings');
    }
  }, [dashboardHeaderDraft, showToast]);

  const saveDashboardDoctor = useCallback(() => {
    try {
      api.ui.mergeDashboardHeaderDoctor(api.ui.readHeaderSettingsRecord(), {
        doctorName: dashboardHeaderDraft.doctorName,
        degree: dashboardHeaderDraft.degree,
        specialization: dashboardHeaderDraft.specialization,
        doctorLogo: dashboardHeaderDraft.doctorLogo,
      });
      showToast('Doctor profile saved');
    } catch {
      showToast('Failed to save doctor profile');
    }
  }, [dashboardHeaderDraft, showToast]);

  const saveDashboardPrint = useCallback(() => {
    try {
      api.ui.saveDashboardPrintOverrides(dashboardPrintDraft);
      showToast('Print settings saved');
    } catch {
      showToast('Failed to save print settings');
    }
  }, [dashboardPrintDraft, showToast]);

  return {
    dashboardHeaderDraft,
    setDashboardHeaderDraft,
    dashboardPrintDraft,
    setDashboardPrintDraft,
    invoiceForm,
    setInvoiceForm,
    labForm,
    setLabForm,
    billingProcedures,
    customLineDescription,
    setCustomLineDescription,
    customLineAmount,
    setCustomLineAmount,
    _newBillingProcedure,
    _setNewBillingProcedure,
    handleCreateInvoice,
    handlePrintInvoice,
    handlePrintMushok63,
    handleCreateLabOrder,
    exportInvoicesCsv,
    markLabOrderDelivered,
    saveDashboardClinic,
    saveDashboardDoctor,
    saveDashboardPrint,
  };
}
