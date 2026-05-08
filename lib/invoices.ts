import { getAsyncStorage } from "@/lib/storage";
import { formatDateDDMMYY } from "@/lib/dateFormat";

export type InvoiceCurrency = "AMD" | "USD" | "EUR" | "RUB" | "GEL";

export type InvoiceTax = {
  /** e.g. VAT (ԱԱՀ) */
  label: string;
  /** 0.2 for 20% */
  rate: number;
  /** If true, amount already includes this tax. */
  includedInPrice: boolean;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDateISO: string;
  sellerName: string;
  clientName: string;
  serviceDescription: string;
  currency: InvoiceCurrency;
  amount: number;
  tax?: InvoiceTax;
  notes?: string;
  createdAtISO: string;
  updatedAtISO: string;
  /** Optional due date for reminders. */
  dueDateISO?: string;
  /** Mark whether invoice is paid (dashboard stats). */
  status: "draft" | "sent" | "paid" | "overdue";
};

export type InvoiceTotals = {
  subtotal: number;
  taxAmount: number;
  total: number;
};

export function computeInvoiceTotals(invoice: Pick<Invoice, "amount" | "tax">): InvoiceTotals {
  const subtotal = Math.max(0, invoice.amount);
  const taxRate = Math.max(0, invoice.tax?.rate ?? 0);
  const included = Boolean(invoice.tax?.includedInPrice);

  if (taxRate === 0) {
    return { subtotal, taxAmount: 0, total: subtotal };
  }

  if (included) {
    const base = subtotal / (1 + taxRate);
    const taxAmount = Math.max(0, subtotal - base);
    return { subtotal: base, taxAmount, total: subtotal };
  }

  const taxAmount = subtotal * taxRate;
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

const INVOICES_KEY = "invoices.v1";

export async function loadInvoices(): Promise<Invoice[]> {
  const raw = await getAsyncStorage().getItem(INVOICES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Invoice[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveInvoices(invoices: Invoice[]): Promise<void> {
  await getAsyncStorage().setItem(INVOICES_KEY, JSON.stringify(invoices));
}

export async function upsertInvoice(invoice: Invoice): Promise<void> {
  const existing = await loadInvoices();
  const idx = existing.findIndex((i) => i.id === invoice.id);
  const next = [...existing];
  if (idx >= 0) next[idx] = invoice;
  else next.unshift(invoice);
  await saveInvoices(next);
}

export async function deleteInvoice(id: string): Promise<void> {
  const existing = await loadInvoices();
  await saveInvoices(existing.filter((i) => i.id !== id));
}

export function makeInvoiceId(): string {
  // Stable enough for local-only storage.
  return `inv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function defaultInvoiceNumber(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-001`;
}

export function invoiceHtmlTemplate(opts: {
  invoice: Invoice;
  locale: string;
  theme: "light" | "dark";
}): string {
  const { invoice, locale, theme } = opts;
  const totals = computeInvoiceTotals(invoice);
  const isDark = theme === "dark";

  const nfMoney = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const format = (n: number) => nfMoney.format(Number.isFinite(n) ? n : 0);

  const bg = isDark ? "#0B0F19" : "#FFFFFF";
  const surface = isDark ? "#111827" : "#F8FAFC";
  const text = isDark ? "#E5E7EB" : "#0F172A";
  const subtle = isDark ? "#94A3B8" : "#475569";
  const border = isDark ? "rgba(148,163,184,0.25)" : "rgba(15,23,42,0.12)";
  const accent = "#F07E25";

  const taxLabel = invoice.tax?.label ?? "";
  const taxRate = invoice.tax?.rate ?? 0;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, "Helvetica Neue", Arial, sans-serif;
        color: ${text};
        background: ${bg};
      }
      .page { padding: 32px; }
      .card {
        border: 1px solid ${border};
        border-radius: 18px;
        background: ${surface};
        padding: 22px;
      }
      .top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
      }
      .brand {
        font-weight: 800;
        letter-spacing: -0.3px;
        font-size: 18px;
      }
      .badge {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(240,126,37,0.14);
        color: ${accent};
        border: 1px solid rgba(240,126,37,0.25);
        font-weight: 700;
        font-size: 12px;
      }
      .row { display: flex; gap: 16px; flex-wrap: wrap; }
      .kv { flex: 1; min-width: 210px; padding: 14px; border-radius: 14px; border: 1px solid ${border}; background: ${bg}; }
      .k { color: ${subtle}; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
      .v { margin-top: 6px; font-size: 15px; font-weight: 650; }
      .desc { margin-top: 12px; padding: 14px; border-radius: 14px; border: 1px solid ${border}; background: ${bg}; }
      .desc p { margin: 0; white-space: pre-wrap; line-height: 1.45; }
      .totals { margin-top: 14px; border-top: 1px solid ${border}; padding-top: 14px; }
      .totRow { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; }
      .totRow .label { color: ${subtle}; font-weight: 650; }
      .totRow .value { font-weight: 800; }
      .foot { margin-top: 16px; color: ${subtle}; font-size: 12px; line-height: 1.35; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="card">
        <div class="top">
          <div>
            <div class="brand">${escapeHtml(invoice.sellerName || " ")}</div>
            <div class="foot">Invoice #${escapeHtml(invoice.invoiceNumber || " ")}</div>
          </div>
          <div class="badge">${escapeHtml(invoice.currency)}</div>
        </div>

        <div class="row">
          <div class="kv">
            <div class="k">Client</div>
            <div class="v">${escapeHtml(invoice.clientName || " ")}</div>
          </div>
          <div class="kv">
            <div class="k">Date</div>
            <div class="v">${escapeHtml(formatDateDDMMYY(invoice.invoiceDateISO))}</div>
          </div>
        </div>

        <div class="desc">
          <div class="k">Service</div>
          <p>${escapeHtml(invoice.serviceDescription || " ")}</p>
        </div>

        <div class="totals">
          <div class="totRow"><div class="label">Subtotal</div><div class="value">${format(totals.subtotal)} ${escapeHtml(invoice.currency)}</div></div>
          ${
            taxRate > 0
              ? `<div class="totRow"><div class="label">${escapeHtml(taxLabel)} (${format(taxRate * 100)}%)</div><div class="value">${format(totals.taxAmount)} ${escapeHtml(invoice.currency)}</div></div>`
              : ""
          }
          <div class="totRow"><div class="label">Total</div><div class="value">${format(totals.total)} ${escapeHtml(invoice.currency)}</div></div>
        </div>

        ${
          invoice.notes
            ? `<div class="foot"><div class="k">Notes</div>${escapeHtml(invoice.notes)}</div>`
            : `<div class="foot">Generated by Fin hub</div>`
        }
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

