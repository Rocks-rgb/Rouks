import './style.css'
import { db } from './db/index.js'
import { hashPin, verifyPin } from './auth.js'

const app = document.getElementById('app')

function renderLogin() {
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f9fafb;">
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:400px;width:100%;text-align:center;font-family:system-ui;direction:rtl;">
        <h1 style="color:#2563eb;font-size:28px;margin:0 0 8px;">Rouks</h1>
        <p style="color:#6b7280;margin:0 0 24px;">أدخل رمز الدخول (PIN)</p>
        
        <input id="pin-input" type="password" maxlength="4" placeholder="••••" style="width:100%;text-align:center;font-size:24px;letter-spacing:8px;padding:12px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:16px;outline:none;">
        
        <button id="login-btn" style="width:100%;background:#2563eb;color:white;border:none;padding:14px;border-radius:8px;font-size:16px;cursor:pointer;font-weight:bold;">
          دخول
        </button>
        
        <p id="error-msg" style="color:red;font-size:14px;margin-top:12px;display:none;"></p>
      </div>
    </div>
  `

  document.getElementById('login-btn').addEventListener('click', handleLogin)
}

function renderSetup() {
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f9fafb;">
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:400px;width:100%;text-align:center;font-family:system-ui;direction:rtl;">
        <h1 style="color:#2563eb;font-size:28px;margin:0 0 8px;">أهلاً بك في Rouks</h1>
        <p style="color:#6b7280;margin:0 0 24px;">أنشئ رمز دخول (4 أرقام) لحماية بياناتك</p>
        
        <input id="pin-input" type="password" maxlength="4" placeholder="••••" style="width:100%;text-align:center;font-size:24px;letter-spacing:8px;padding:12px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:16px;outline:none;">
        
        <button id="setup-btn" style="width:100%;background:#2563eb;color:white;border:none;padding:14px;border-radius:8px;font-size:16px;cursor:pointer;font-weight:bold;">
          إنشاء وحفظ
        </button>
      </div>
    </div>
  `

  document.getElementById('setup-btn').addEventListener('click', async () => {
    const pin = document.getElementById('pin-input').value
    if (pin.length !== 4 || isNaN(pin)) return alert('لازم 4 أرقام')
    const hashed = await hashPin(pin)
    localStorage.setItem('rouks_pin_hash', hashed)
    alert('تم إنشاء الرمز بنجاح!')
    renderHome()
  })
}

async function handleLogin() {
  const pin = document.getElementById('pin-input').value
  const storedHash = localStorage.getItem('rouks_pin_hash')
  const err = document.getElementById('error-msg')
  
  if (!pin) return
  
  if (await verifyPin(pin, storedHash)) {
    renderHome()
  } else {
    err.textContent = 'رمز الدخول غلط، جرب تاني'
    err.style.display = 'block'
  }
}

async function renderHome() {
  await db.open()
  const count = await db.conversations.count()
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f9fafb;">
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:400px;width:100%;text-align:center;font-family:system-ui;direction:rtl;">
        <h1 style="color:#2563eb;font-size:28px;margin:0 0 8px;">مرحباً بك! 🎉</h1>
        <p style="color:#6b7280;margin:0 0 24px;">إنت دلوقتي جوه النظام</p>
        <p style="color:#10b981;font-size:14px;">✅ قاعدة البيانات شغالة (${count} محادثة)</p>
        <button id="logout-btn" style="margin-top:24px;background:#ef4444;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;">
          تسجيل خروج
        </button>
      </div>
    </div>
  `
  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('logged_in') // مؤقت
    renderLogin()
  })
}

// التحقق من وجود PIN أول مرة
if (!localStorage.getItem('rouks_pin_hash')) {
  renderSetup()
} else {
  renderLogin()
}
