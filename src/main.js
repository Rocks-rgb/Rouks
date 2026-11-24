import './style.css'
import { db } from './db/index.js'

async function init() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f9fafb;">
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:400px;width:100%;text-align:center;font-family:system-ui;">
        <h1 style="color:#2563eb;font-size:28px;margin:0 0 8px;">Rouks</h1>
        <p style="color:#6b7280;margin:0 0 24px;">مساعدك الشخصي</p>
        <p style="color:#6b7280;font-size:14px;">✅ Vite شغال</p>
        <p id="db-status" style="color:#6b7280;font-size:14px;">⏳ جاري اختبار IndexedDB...</p>
      </div>
    </div>
  `
  try {
    await db.open()
    const count = await db.conversations.count()
    document.getElementById('db-status').textContent = `✅ IndexedDB شغال (${count} محادثة)`
  } catch (err) {
    document.getElementById('db-status').textContent = `❌ فشل: ${err.message}`
  }
}

init()
