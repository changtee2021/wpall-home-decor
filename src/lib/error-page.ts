import { COMPANY_EMAIL, COMPANY_WEBSITE } from "@/lib/company";

export type ServerErrorKind = "500" | "503" | "404";

interface RenderErrorPageOptions {
  kind?: ServerErrorKind;
  title?: string;
  message?: string;
}

const COPY: Record<ServerErrorKind, { code: string; title: string; message: string }> = {
  "500": {
    code: "500",
    title: "เกิดข้อผิดพลาดชั่วคราว",
    message:
      "ระบบไม่สามารถโหลดหน้านี้ได้ในขณะนี้ กรุณารีเฟรชหรือกลับหน้าหลัก หากปัญหายังคงอยู่ติดต่อทีมงานได้เลย",
  },
  "503": {
    code: "503",
    title: "ระบบไม่พร้อมให้บริการชั่วคราว",
    message: "เรากำลังปรับปรุงหรือมีผู้ใช้งานจำนวนมาก กรุณาลองใหม่อีกครั้งในอีกสักครู่",
  },
  "404": {
    code: "404",
    title: "ไม่พบหน้าที่คุณต้องการ",
    message: "ลิงก์อาจหมดอายุหรือถูกย้าย ลองกลับหน้าหลักหรือติดต่อทีมงานเพื่อขอความช่วยเหลือ",
  },
};

/** Standalone HTML for catastrophic SSR / middleware failures (no React bundle). */
export function renderErrorPage(options: RenderErrorPageOptions = {}): string {
  const kind = options.kind ?? "500";
  const preset = COPY[kind];
  const title = options.title ?? preset.title;
  const message = options.message ?? preset.message;
  const code = preset.code;

  return `<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)} · WP ALL</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body {
        font: 15px/1.6 "IBM Plex Sans Thai", system-ui, -apple-system, sans-serif;
        background: linear-gradient(180deg, #f0faf9 0%, #ffffff 45%);
        color: #1a2332;
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 1.25rem;
      }
      .card {
        max-width: 28rem;
        width: 100%;
        background: #fff;
        border: 1px solid #e5e9ef;
        border-radius: 1.25rem;
        padding: 2rem 1.75rem;
        box-shadow: 0 8px 30px rgba(31, 132, 126, 0.08);
        text-align: center;
      }
      .code {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 4rem;
        min-height: 4rem;
        padding: 0 1rem;
        border-radius: 1rem;
        background: #f4f6f8;
        font-size: 2rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin-bottom: 1rem;
      }
      .brand {
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #1f847e;
        margin-bottom: 0.5rem;
      }
      h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; line-height: 1.35; }
      p { color: #5c6778; margin: 0 0 1.5rem; font-size: 0.9375rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-bottom: 1.5rem; }
      a, button {
        min-height: 2.75rem;
        padding: 0.625rem 1.125rem;
        border-radius: 0.625rem;
        font: inherit;
        font-weight: 600;
        font-size: 0.875rem;
        cursor: pointer;
        text-decoration: none;
        border: 1px solid transparent;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .primary { background: #1f847e; color: #fff; }
      .primary:hover { background: #196862; }
      .secondary { background: #fff; color: #1a2332; border-color: #d8dee6; }
      .secondary:hover { background: #f8fafb; }
      .contact {
        border-top: 1px solid #e5e9ef;
        padding-top: 1.25rem;
        text-align: left;
      }
      .contact h2 { font-size: 0.875rem; font-weight: 600; margin: 0 0 0.75rem; }
      .contact-grid { display: grid; gap: 0.5rem; }
      .contact a {
        justify-content: flex-start;
        width: 100%;
        background: #fafbfc;
        border-color: #e5e9ef;
        color: #1a2332;
        font-weight: 500;
      }
      .contact a:hover { border-color: #1f847e; background: #f0faf9; }
      .contact small { display: block; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; color: #8b95a5; margin-bottom: 0.125rem; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="brand">WP ALL</div>
      <div class="code">${escapeHtml(code)}</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <div class="actions">
        <button class="primary" type="button" onclick="location.reload()">ลองอีกครั้ง</button>
        <a class="secondary" href="/">กลับหน้าหลัก</a>
      </div>
      <div class="contact">
        <h2>ติดต่อทีมงาน</h2>
        <div class="contact-grid">
          <a href="mailto:${escapeHtml(COMPANY_EMAIL)}">
            <small>อีเมล</small>
            ${escapeHtml(COMPANY_EMAIL)}
          </a>
          <a class="secondary" href="/contact">
            <small>ฟอร์มติดต่อ</small>
            ไปหน้าติดต่อเรา
          </a>
          <a class="secondary" href="${escapeHtml(COMPANY_WEBSITE)}/products">
            <small>สินค้า</small>
            ดูสินค้าทั้งหมด
          </a>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
